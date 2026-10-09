import { expect, test } from 'bun:test';
import { Scene } from 'three';
import { Ball } from '../src/games/cave/classes/Ball';
import { Cave } from '../src/games/cave/classes/Cave';
import { config } from '../src/games/cave/classes/Config';

// The geometry queries need no renderer; only the constructor's optional
// rock texture asks for a canvas. Keep the browser shim local to construction.
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

test('floor climbs gradually along the road but retains sharp drops and lateral relief', () => {
  for (const seed of [0, 2, 40, 100]) {
    const terrain = cave(seed);
    let steepestDrop = 0;
    let lateralRelief = 0;
    for (const angle of [Math.PI - 0.4, Math.PI, Math.PI + 0.4]) {
      let previous = terrain.radius(100, angle);
      for (let s = 101; s < 3600; s++) {
        const radius = terrain.radius(s, angle);
        const rise = (previous - radius) * config.CAVE_VERTICAL_SCALE;
        expect(rise).toBeLessThanOrEqual(
          config.CAVE_FLOOR_MAX_CLIMB + 1e-8,
        );
        steepestDrop = Math.max(steepestDrop, -rise);
        expect(radius).toBeGreaterThanOrEqual(config.CAVE_MIN_RADIUS - 1e-8);
        previous = radius;
      }
    }
    for (let s = 600; s < 3600; s += 20)
      lateralRelief = Math.max(
        lateralRelief,
        Math.abs(
          terrain.radius(s, Math.PI - 0.4) - terrain.radius(s, Math.PI + 0.4),
        ),
      );
    expect(steepestDrop).toBeGreaterThan(config.CAVE_FLOOR_MAX_CLIMB * 2);
    expect(lateralRelief).toBeGreaterThan(5);
  }
});

test('ramp profiles agree at chunk seams and do not depend on query order', () => {
  const forward = cave(2),
    reverse = cave(2);
  const arcs = [239.999, 240, 240.001, 479.999, 480, 480.001, 1440, 3600];
  const expected = arcs.map((s) => forward.radius(s, Math.PI));
  for (let i = arcs.length - 1; i >= 0; i--)
    expect(reverse.radius(arcs[i], Math.PI)).toBeCloseTo(expected[i], 10);
  for (const seam of [240, 480, 1440])
    expect(
      Math.abs(
        forward.radius(seam - 0.0001, Math.PI) -
          forward.radius(seam + 0.0001, Math.PI),
      ),
    ).toBeLessThan(0.001);
  expect(forward.radius(800, Math.PI)).toBeCloseTo(
    forward.radius(800, -Math.PI),
    10,
  );
});

/** a ball that pursues a point on the floor ahead: the reference line a sane
 *  player (or a trained brain) should be able to hold */
function driveLine(terrain: Cave, ball: Ball, frames: number) {
  for (let frame = 0; frame < frames; frame++) {
    const goal = terrain.groundSpawn(ball.s + 40 + ball.speed * 15, 0);
    const dx = goal.x - ball.x;
    const dy = goal.y - ball.y;
    const dz = goal.z - ball.z;
    const crossX = ball.fy * dz - ball.fz * dy;
    const crossY = ball.fz * dx - ball.fx * dz;
    const crossZ = ball.fx * dy - ball.fy * dx;
    const around = crossX * ball.ux + crossY * ball.uy + crossZ * ball.uz;
    const dot = ball.fx * dx + ball.fy * dy + ball.fz * dz;
    const angle = Math.atan2(around, dot);
    ball.controls.moveX = Math.max(-1, Math.min(1, -angle * 2));
    // no jump command: terrain slope and carried momentum alone launch it
    ball.controls.moveY = 1;
    ball.update(terrain);
  }
}

test('a ball that follows the track line rolls the opening without getting stuck', () => {
  const terrain = cave(2);
  const ball = new Ball(terrain.getSpawn());
  driveLine(terrain, ball, 300);
  expect(ball.damaged).toBe(false);
  expect(ball.s).toBeGreaterThan(500);
  expect(ball.nextGate).toBeGreaterThanOrEqual(1);
  // a wall across the band may hold the reference driver until a natural
  // terrain launch (or boost) clears it
  const held =
    terrain.wallAt(ball.s, ball.a) !== null &&
    terrain.wallAt(ball.s, ball.a)!.front > ball.s &&
    terrain.wallAt(ball.s, ball.a)!.front - ball.s < 30;
  if (!held) expect(ball.speed).toBeGreaterThan(1);
});

test('a ball that follows the track line can pull away on the hills around gate 6', () => {
  const terrain = cave(25);
  for (const start of [3000, 3200, 3400, 3600]) {
    const ball = new Ball(terrain.groundSpawn(start));
    driveLine(terrain, ball, 180);
    expect(ball.damaged).toBe(false);
    // a wall across the band is a deliberate stop until terrain momentum (or
    // a boost) carries the ball over it
    const wall = terrain.wallAt(ball.s, ball.a);
    const held =
      wall !== null && wall.front > ball.s && wall.front - ball.s < 30;
    if (held) {
      expect(ball.s).toBeGreaterThanOrEqual(start - 80);
    } else {
      expect(ball.s - start).toBeGreaterThan(100);
      expect(ball.speed).toBeGreaterThan(0.8);
    }
  }
});

test('a straight-driving ball still survives the opening', () => {
  const terrain = cave(2);
  const ball = new Ball(terrain.getSpawn());
  for (let frame = 0; frame < 300; frame++) ball.update(terrain);
  expect(ball.damaged).toBe(false);
  expect(ball.s).toBeGreaterThan(400);
});

test('the driving band is flat while the sides stay rough', () => {
  for (const seed of [0, 50, 100]) {
    const terrain = cave(seed);
    // Chop (mean second difference) along the track: the band keeps only
    // the slow wave sliver and smooth features, the rough sides keep the
    // bumpy skin whose corners are an order of magnitude choppier.
    const chop = (angle: number) => {
      let total = 0;
      let count = 0;
      for (let s = 1501; s < 3600; s++) {
        total += Math.abs(
          terrain.radius(s + 1, angle) -
            2 * terrain.radius(s, angle) +
            terrain.radius(s - 1, angle),
        );
        count++;
      }
      return total / count;
    };
    const band = chop(Math.PI);
    const side = chop(Math.PI + 0.4);
    expect(side).toBeGreaterThan(4 * band);
    expect(side).toBeGreaterThan(0.02);
    // Averaged over arcs the bumps cancel and the deterministic bank
    // remains: the wall at PI+0.9 sits well above the PI+0.5 shoulder.
    // The full bank raise (~13u) is partly masked by the MIN_RADIUS clamp
    // and the floor envelope, so the measured average is 4-7u.
    let wall = 0;
    for (let s = 1500; s < 3600; s += 10)
      wall +=
        terrain.radius(s, Math.PI + 0.5) - terrain.radius(s, Math.PI + 0.9);
    wall /= 210;
    expect(wall).toBeGreaterThan(4);
  }
});

test('streams glowing boost items over the boost pads', () => {
  const terrain = cave(2);
  terrain.update(0, 240 * 4);
  expect(terrain.boostItemCount()).toBeGreaterThan(0);
});

test('valley terrain launches the ball naturally without sacrificing speed', () => {
  const terrain = cave(2);
  const ball = new Ball(terrain.getSpawn());
  ball.controls.moveY = 1;
  let sawNaturalFlight = false;
  for (let frame = 0; frame < 150; frame++) {
    ball.update(terrain);
    if (!ball.grounded && ball.speed > 5) sawNaturalFlight = true;
  }
  expect(ball.damaged).toBe(false);
  expect(sawNaturalFlight).toBe(true);
  expect(ball.speed).toBeGreaterThan(5);
});
