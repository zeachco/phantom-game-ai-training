import { expect, test } from 'bun:test';
import { config } from '../src/games/climb/classes/Config';
import { Tower } from '../src/games/climb/classes/Tower';

test('platform removal rate grows with floor height and stays capped', () => {
  const tower = new Tower(17);
  tower.ensureAbove(8000);
  const gaps = tower.platforms.slice(1).map((platform, index) => ({
    y: platform.y,
    gap: platform.y - tower.platforms[index].y,
  }));
  const early = gaps.filter(({ y }) => y < 1000).map(({ gap }) => gap);
  const late = gaps.filter(({ y }) => y > 6000).map(({ gap }) => gap);
  const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  expect(mean(late)).toBeGreaterThan(mean(early));
  expect(Math.max(...late)).toBeLessThanOrEqual(
    config.ROW_SPACING_MAX * 1.1 * (config.MAX_REMOVED_PLATFORMS_IN_ROW + 1),
  );
});
