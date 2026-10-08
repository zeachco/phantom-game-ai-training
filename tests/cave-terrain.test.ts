import { expect, test } from 'bun:test';
import { Scene } from 'three';
import { Car } from '../src/games/cave/classes/Car';
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
        expect(rise).toBeLessThanOrEqual(config.CAVE_FLOOR_MAX_CLIMB + 1e-8);
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

test('seed 2 can drive through the opening terrain without getting stuck', () => {
  const terrain = cave(2);
  const car = new Car(terrain.getSpawn());
  for (let frame = 0; frame < 300; frame++) car.update(terrain);
  expect(car.damaged).toBe(false);
  expect(car.s).toBeGreaterThan(900);
  expect(car.nextGate).toBeGreaterThanOrEqual(1);
  expect(car.speed).toBeGreaterThan(1);
});
