import { expect, test } from 'bun:test';
import { Scene } from 'three';
import { Cave } from '../src/games/cave/classes/Cave';
import { config } from '../src/games/cave/classes/Config';
import { Ball } from '../src/games/cave/classes/Ball';

function cave(seed: number) {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({ getContext: () => null }),
  } as unknown as Document;
  try {
    return new Cave(seed, new Scene());
  } finally {
    if (previous) globalThis.document = previous;
    else delete (globalThis as { document?: Document }).document;
  }
}

const angleDist = (a: number, b: number) => {
  let d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
};

test('the path guarantee keeps a drivable line on every seed', () => {
  for (const seed of [0, 1, 7, 25, 50, 100]) {
    const terrain = cave(seed);
    const band = config.CAVE_BAND_HALF_WIDTH;
    const cells = Math.ceil(
      (config.SPAWN_OFFSET +
        config.GATES_PER_SEED * config.GATE_SPACING +
        config.CAVE_FEATURE_CELL * 2) /
        config.CAVE_FEATURE_CELL,
    );
    for (let i = 0; i < cells; i++) {
      const cell = terrain.featureCell(i);
      for (const col of cell.columns) {
        if (angleDist(col.angle, Math.PI) >= band + 0.3) continue;
        const half = col.angleWidth * 1.5;
        const gapLeft = (col.angle - half - (Math.PI - band)) * config.CAVE_RADIUS;
        const gapRight =
          ((Math.PI + band) - (col.angle + half)) * config.CAVE_RADIUS;
        expect(Math.max(gapLeft, gapRight)).toBeGreaterThanOrEqual(
          config.CAVE_PATH_MIN_GAP - 1e-6,
        );
      }
      // Same filter and sort the path check uses: the raw column order is
      // not by angle, so a naive pairwise walk would compare neighbors that
      // are far apart on the band.
      const inBand = cell.columns
        .filter((col) => angleDist(col.angle, Math.PI) < band + 0.3)
        .sort((a, b) => a.angle - b.angle);
      for (let k = 1; k < inBand.length; k++) {
        const prev = inBand[k - 1];
        const next = inBand[k];
        const gap =
          (next.angle - prev.angle) * config.CAVE_RADIUS -
          config.CAVE_RADIUS * (prev.angleWidth + next.angleWidth) * 1.5;
        expect(gap).toBeGreaterThanOrEqual(config.CAVE_PATH_MIN_GAP - 1e-6);
      }
      if (cell.volatility >= 0.7 && cell.columns.length > 0)
        expect(cell.ramp).not.toBeNull();
      if (cell.ramp) {
        const landingTo = cell.ramp.centerS + cell.ramp.height / 0.35 + 60;
        for (const col of cell.columns) {
          const inLanding =
            col.centerS + col.halfLen > cell.ramp.centerS &&
            col.centerS - col.halfLen < landingTo;
          if (inLanding)
            expect(angleDist(col.angle, Math.PI)).toBeGreaterThan(band + 0.3);
        }
      }
    }
  }
});

test('a boosted line exists: pads and platforms appear on the early cave', () => {
  const terrain = cave(7);
  let pads = 0;
  let platforms = 0;
  for (let i = 0; i < 12; i++) {
    const cell = terrain.featureCell(i);
    if (cell.boost) pads++;
    if (cell.ramp) platforms++;
  }
  expect(pads).toBeGreaterThan(0);
  expect(platforms).toBeGreaterThan(0);
  expect(terrain.boostAt(terrain.featureCell(2).boost?.centerS ?? 0, Math.PI)).toBeGreaterThan(0.2);
});

test('walls span a fraction of their section and stop a rolling ball', () => {
  for (const seed of [7, 40]) {
    const terrain = cave(seed);
    let wall: NonNullable<
      ReturnType<Cave['featureCell']>['wall']
    > | null = null;
    for (let i = 1; i < 24 && !wall; i++) {
      const cell = terrain.featureCell(i);
      if (cell.wall) wall = cell.wall;
    }
    if (!wall) continue;
    const fraction = (wall.halfLen * 2) / config.CAVE_SEGMENT_LENGTH;
    expect(fraction).toBeGreaterThanOrEqual(
      config.CAVE_WALL_MIN_FRACTION - 1e-9,
    );
    expect(fraction).toBeLessThanOrEqual(
      config.CAVE_WALL_MAX_FRACTION + 1e-9,
    );

    const front = wall.centerS;
    const ball = new Ball(terrain.groundSpawn(front - 20));
    ball.controls.moveY = 1;
    for (let f = 0; f < 240 && !ball.damaged; f++) ball.update(terrain);
    expect(ball.s).toBeLessThanOrEqual(front + 1);
  }
});
