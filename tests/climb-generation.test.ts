import { describe, expect, test } from 'bun:test';
import { config } from '../src/games/climb/classes/Config';
import { Tower } from '../src/games/climb/classes/Tower';

function rows(tower: Tower, upTo = 400) {
  tower.ensureAbove(upTo);
  return tower.platforms;
}

describe('climb tower generation', () => {
  test('the same seed builds the same tower, another seed does not', () => {
    const a = new Tower(42);
    const b = new Tower(42);
    const c = new Tower(43);
    rows(a);
    rows(b);
    rows(c);
    expect(b.platforms).toEqual(a.platforms);
    expect(c.platforms).not.toEqual(a.platforms);
  });

  test('the first row is wide, centered and just above the ground', () => {
    const tower = new Tower(7);
    const first = tower.platforms[0];
    expect(first).toEqual({
      x: (config.TOWER_WIDTH - config.PLATFORM_MAX_WIDTH) / 2,
      y: config.ROW_SPACING_MIN,
      w: config.PLATFORM_MAX_WIDTH,
    });
    expect(first.y).toBeGreaterThan(0);
  });

  test('every row is reachable from the row below', () => {
    for (const seed of [0, 17, 50, 100, 233]) {
      const tower = new Tower(seed);
      const platforms = rows(tower, 600);
      for (let i = 1; i < platforms.length; i++) {
        const below = platforms[i - 1];
        const above = platforms[i];
        expect(above.y).toBeGreaterThan(below.y);
        // the landing point lands within JUMP_REACH of the row below, and
        // wall clamping can push a center at most half its own width away
        const dx = Math.abs(above.x + above.w / 2 - (below.x + below.w / 2));
        expect(dx).toBeLessThanOrEqual(
          config.JUMP_REACH + below.w / 2 + above.w / 2 + 0.01,
        );
      }
    }
  });

  test('rows stay inside the walls and climb strictly upward', () => {
    const tower = new Tower(91);
    const platforms = rows(tower, 800);
    for (const p of platforms) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(config.TOWER_WIDTH);
    }
    for (let i = 1; i < platforms.length; i++)
      expect(platforms[i].y).toBeGreaterThan(platforms[i - 1].y);
  });

  test('difficulty widens the gaps and narrows the platforms with the seed', () => {
    const easy = rows(new Tower(0), 400);
    const hard = rows(new Tower(100), 400);
    const spacings = (platforms: { y: number }[]) =>
      platforms.slice(1).map((p, i) => p.y - platforms[i].y);
    const mean = (xs: number[]) =>
      xs.reduce((sum, v) => sum + v, 0) / xs.length;
    const easySpacings = spacings(easy);
    const hardSpacings = spacings(hard);
    expect(mean(easySpacings)).toBeLessThan(mean(hardSpacings));
    // each row's spacing stays inside its difficulty band
    for (const s of easySpacings)
      expect(s).toBeGreaterThanOrEqual(config.ROW_SPACING_MIN * 0.9 - 1e-6);
    for (const s of easySpacings)
      expect(s).toBeLessThanOrEqual(config.ROW_SPACING_MIN * 1.1 + 1e-6);
    for (const s of hardSpacings)
      expect(s).toBeGreaterThanOrEqual(config.ROW_SPACING_MAX * 0.9 - 1e-6);
    for (const s of hardSpacings)
      expect(s).toBeLessThanOrEqual(config.ROW_SPACING_MAX * 1.1 + 1e-6);
    // the platform widths shrink with the seed
    const meanWidth = (platforms: { w: number }[]) =>
      mean(platforms.slice(1).map((p) => p.w));
    expect(meanWidth(easy)).toBeGreaterThan(meanWidth(hard));
    for (const p of easy.slice(1))
      expect(p.w).toBeGreaterThanOrEqual(
        config.PLATFORM_MAX_WIDTH * 0.85 - 1e-6,
      );
    for (const p of hard.slice(1))
      expect(p.w).toBeLessThanOrEqual(config.PLATFORM_MIN_WIDTH * 1.15 + 1e-6);
  });

  test('the jump apex clears the worst possible row spacing', () => {
    // a design invariant, not a per-tower property: at the max spacing the
    // jump must still reach the next row
    const idealApex = config.JUMP_SPEED ** 2 / (2 * config.GRAVITY);
    expect(idealApex).toBeGreaterThan(config.ROW_SPACING_MAX * 1.1);
  });

  test('ensureAbove streams rows on demand and never culls them', () => {
    const tower = new Tower(5);
    const initial = tower.platforms.length;
    tower.ensureAbove(100);
    const at100 = tower.platforms.length;
    expect(at100).toBeGreaterThan(initial);
    // earlier rows survive later generation, object identity stable
    const firstRow = tower.platforms[0];
    const secondRow = tower.platforms[1];
    tower.ensureAbove(400);
    expect(tower.platforms.length).toBeGreaterThan(at100);
    expect(tower.platforms[0]).toBe(firstRow);
    expect(tower.platforms[1]).toBe(secondRow);
  });
});
