import { describe, expect, test } from 'bun:test';
import { Car } from '../src/games/cave/classes/Car';
import type { Cave, RadialHit } from '../src/games/cave/classes/Cave';
import { config } from '../src/games/cave/classes/Config';

// An infinite plane isolates vehicle dynamics from procedural cave geometry.
function floor(height = (_x: number, _z: number) => 0, grade = 0) {
  return {
    gatePositions: Array.from(
      { length: config.GATES_PER_SEED },
      (_, i) => (i + 1) * config.GATE_SPACING,
    ),
    tangent(_s: number, out: { x: number; y: number; z: number }) {
      Object.assign(out, { x: 0, y: 0, z: -1 });
    },
    centerAt(s: number, out: object) {
      return Object.assign(out, { x: 0, y: 0, z: -s });
    },
    castWheelRay(
      x: number,
      y: number,
      z: number,
      dx: number,
      dy: number,
      dz: number,
      length: number,
      _s: number,
      out: RadialHit,
    ) {
      const distance = (height(x, z) - y) / (dy + grade * dz);
      Object.assign(out, {
        nx: 0,
        ny: -1 / Math.hypot(1, grade),
        nz: -grade / Math.hypot(1, grade),
      });
      return dy < 0 && distance >= 0 && distance <= length ? distance : -1;
    },
    nearestRadial(x: number, y: number, z: number, _s: number, out: RadialHit) {
      return Object.assign(out, {
        nx: 0,
        ny: -1 / Math.hypot(1, grade),
        nz: -grade / Math.hypot(1, grade),
        dist: (height(x, z) - y) / Math.hypot(1, grade),
      });
    },
  } as unknown as Cave;
}
const spawn = { x: 0, y: 3.2, z: -100, tx: 0, ty: 0, tz: -1, s: 100 };
function tick(car: Car, cave: Cave, frames: number) {
  for (let i = 0; i < frames; i++) car.update(cave);
  expect(car.damaged).toBe(false);
  expect(Number.isFinite(car.speed)).toBe(true);
  expect(car.quat.length()).toBeCloseTo(1, 8);
}
function settled() {
  const car = new Car(spawn);
  car.controls.throttle = 0;
  const cave = floor();
  tick(car, cave, 100);
  return { car, cave };
}

describe('cave four-wheel chassis', () => {
  test('rests on all four springs without snap, drift or oscillation', () => {
    const { car, cave } = settled();
    expect(car.grounded).toEqual([true, true, true, true]);
    for (const compression of car.compression)
      expect(compression).toBeCloseTo(
        config.CAR_GRAVITY / (4 * config.SUSP_SPRING),
        2,
      );
    const y = car.y;
    tick(car, cave, 200);
    expect(car.y).toBeCloseTo(y, 4);
    expect(car.speed).toBeLessThan(0.001);
    expect(car.uy).toBeCloseTo(1, 5);
  });
  test('accelerates straight, brakes and reverses without front/rear cancellation', () => {
    const { car, cave } = settled();
    car.controls.throttle = 1;
    tick(car, cave, 120);
    expect(-car.vz).toBeGreaterThan(3);
    expect(Math.abs(car.x)).toBeLessThan(0.001);
    const speed = car.speed;
    car.controls.throttle = -1;
    tick(car, cave, 15);
    expect(car.speed).toBeLessThan(speed);
    tick(car, cave, 100);
    expect(car.vz).toBeGreaterThan(0.5);
  });
  test('left and right steering produce symmetric opposite turns', () => {
    const run = (left: number, right: number) => {
      const { car, cave } = settled();
      car.controls.throttle = 1;
      tick(car, cave, 70);
      car.controls.left = left;
      car.controls.right = right;
      tick(car, cave, 30);
      return car;
    };
    const left = run(1, 0),
      right = run(0, 1);
    expect(left.x).toBeLessThan(-1);
    expect(right.x).toBeGreaterThan(1);
    expect(left.x).toBeCloseTo(-right.x, 4);
  });
  test('airborne throttle and steering do not create tire forces; landing settles', () => {
    const car = new Car({ ...spawn, y: 18 });
    const cave = floor();
    car.controls.left = 1;
    tick(car, cave, 5);
    expect(car.grounded).toEqual([false, false, false, false]);
    expect(car.vz).toBe(0);
    expect(car.avy).toBe(0);
    expect(car.y).toBeLessThan(18);
    expect(car.y).toBeGreaterThan(3.2);
    car.controls.throttle = 0;
    car.controls.left = 0;
    tick(car, cave, 150);
    expect(car.grounded).toEqual([true, true, true, true]);
    expect(car.speed).toBeLessThan(0.001);
  });
  test('uneven wheel support rolls the chassis and reset clears wheel state', () => {
    const car = new Car(spawn);
    car.controls.throttle = 0;
    tick(
      car,
      floor((x) => (x < 0 ? 0.6 : 0)),
      30,
    );
    expect(Math.abs(car.quat.z)).toBeGreaterThan(0.01);
    car.reset(spawn);
    expect(car.wheelLengths).toEqual(Array(4).fill(config.SUSP_REST));
    expect(car.wheelSpin).toEqual([0, 0, 0, 0]);
    expect(car.steeringAngle).toBe(0);
    expect(car.grounded).toEqual([false, false, false, false]);
  });
  test('airborne attitude assist levels a pitched jump before touchdown', () => {
    const cave = floor();
    const car = new Car({ ...spawn, y: 20 });
    car.controls.throttle = 0;
    car.vz = -3;
    // nose-up take-off, as off a ramp: body x rotation of 0.3 rad
    car.quat.set(Math.sin(0.15), 0, 0, Math.cos(0.15));
    let landingFy = car.fy;
    let wasAir = true;
    for (let i = 0; i < 400; i++) {
      car.update(cave);
      const air = !car.grounded.some(Boolean);
      if (wasAir && !air) {
        landingFy = car.fy;
        break;
      }
      wasAir = air;
    }
    // The take-off pitch survives to touchdown unassisted (~0.18); the assist
    // lands the car close to level instead of nose-first.
    expect(Math.abs(Math.asin(landingFy))).toBeLessThan(0.1);
    expect(car.damaged).toBe(false);
  });
});

test('chassis corners resolve a wall impact, with damage only on hard hits', () => {
  for (const speed of [2, 8]) {
    const { car, cave } = settled();
    const groundQuery = cave.nearestRadial.bind(cave);
    const wallX = car.width / 2 + 0.1;
    cave.nearestRadial = (x, y, z, s, out) => {
      groundQuery(x, y, z, s, out);
      if (x - wallX > out.dist)
        Object.assign(out, { nx: 1, ny: 0, nz: 0, dist: x - wallX });
      return out;
    };
    car.vx = speed;
    car.update(cave);
    expect(car.vx).toBeLessThan(speed);
    expect(car.x).toBeLessThan(0.3);
    expect(car.damaged).toBe(speed > config.CAR_CRASH_SPEED);
  }
});

test('held throttle starts gently and builds stronger acceleration', () => {
  const { car, cave } = settled();
  car.controls.throttle = 1;
  tick(car, cave, 20);
  const earlyGain = -car.vz;
  expect(earlyGain).toBeLessThan(0.7);
  tick(car, cave, 70);
  const before = -car.vz;
  tick(car, cave, 20);
  expect(-car.vz - before).toBeGreaterThan(earlyGain);
  // Releasing gas clears the buildup, even if the driver immediately reapplies it.
  car.controls.throttle = 0;
  tick(car, cave, 1);
  car.controls.throttle = 1;
  const restart = -car.vz;
  tick(car, cave, 1);
  expect(-car.vz - restart).toBeLessThan(config.CAR_ENGINE_START);
  car.reset(spawn);
  car.controls.throttle = 0;
  tick(car, cave, 100);
  car.controls.throttle = 1;
  tick(car, cave, 20);
  expect(-car.vz).toBeCloseTo(earlyGain, 5);
});

test('wheel resistance settles coasting without sustained rollback or airborne drag', () => {
  const { car, cave } = settled();
  car.vz = -0.5;
  for (let i = 0; i < 100; i++) {
    tick(car, cave, 1);
    // Pitch settling may produce a tiny rebound, but no sustained reverse drive.
    expect(car.vz).toBeLessThanOrEqual(0.003);
  }
  expect(Math.abs(car.vz)).toBeLessThan(0.001);
  const airborne = new Car({ ...spawn, y: 1000 });
  airborne.controls.throttle = 0;
  airborne.vz = -0.5;
  tick(airborne, cave, 30);
  expect(airborne.grounded).toEqual([false, false, false, false]);
  expect(-airborne.vz).toBeGreaterThan(0.48);
});

test('held throttle can start and sustain a climb on steep grades', () => {
  for (const grade of [0.35, 0.65]) {
    const cave = floor((_x, z) => -z * grade, grade);
    const length = Math.hypot(1, grade);
    const car = new Car({
      ...spawn,
      y: 100 * grade + 3.5,
      ty: grade / length,
      tz: -1 / length,
    });
    const startY = car.y;
    tick(car, cave, 180);
    expect(car.y - startY).toBeGreaterThan(30);
    expect(-car.vz).toBeGreaterThan(1.5);
    expect(car.grounded.filter(Boolean).length).toBeGreaterThanOrEqual(2);
  }
});

test('a flipped car is not killed by the flip itself', () => {
  const cave = floor();
  const car = new Car({ ...spawn, y: 20 });
  car.controls.throttle = 0;
  // 180 degrees about the body pitch axis: fully roof-down.
  car.quat.set(1, 0, 0, 0);
  tick(car, cave, 3);
  expect(car.uy).toBeLessThan(-0.25);
});

test('upside-down wheel contacts cannot propel the car', () => {
  const cave = floor();
  cave.castWheelRay = (
    _x,
    y,
    _z,
    _dx,
    dy,
    _dz,
    length,
    _s,
    out,
  ) => {
    // The inverted wheels point up into a ceiling surface.
    const distance = (6.3 - y) / dy;
    if (dy <= 0 || distance < 0 || distance > length) return -1;
    Object.assign(out, { nx: 0, ny: 1, nz: 0 });
    return distance;
  };
  const car = new Car({ ...spawn, y: 3.2 });
  car.quat.set(1, 0, 0, 0);
  car.controls.throttle = 1;

  tick(car, cave, 1);

  expect(car.uy).toBeLessThan(-0.9);
  expect(car.grounded).toEqual([true, true, true, true]);
  expect(Math.abs(car.vz)).toBeLessThan(0.001);
});

describe('arcade car feel', () => {
  test('a fast inverted car is tempted to flip back onto its wheels', () => {
  const cave = floor();
  const car = new Car(spawn);
  car.quat.set(1, 0, 0, 0); // fully roof-down, moving with the flow
  car.vz = -6;
  for (let frame = 0; frame < 600; frame++) car.update(cave);
  expect(car.uy).toBeGreaterThan(0.5);
  expect(car.damaged).toBe(false);
});

test('a slow inverted car rests on its roof, dragged and unpowered', () => {
  const cave = floor();
  const car = new Car(spawn);
  car.quat.set(1, 0, 0, 0);
  car.vz = -1.5; // below the self-righting gate
  for (let frame = 0; frame < 200; frame++) car.update(cave);
  expect(car.uy).toBeLessThan(-0.5);
  expect(car.speed).toBeLessThan(0.9);
  expect(car.damaged).toBe(false);
});

test('a hard landing squats into the suspension instead of bouncing', () => {
  const cave = floor();
  const car = new Car({ ...spawn, y: 30 });
  let maxRebound = 0;
  let landed = false;
  for (let frame = 0; frame < 200; frame++) {
    car.update(cave);
    if (!landed && car.grounded.some(Boolean)) landed = true;
    if (landed && car.vy > 0) maxRebound = Math.max(maxRebound, car.vy);
  }
  expect(maxRebound).toBeLessThan(1.5);
  expect(car.damaged).toBe(false);
});

test('steering still works in the air', () => {
  const cave = floor();
  const car = new Car(spawn);
  car.vz = -5;
  car.vy = 4;
  car.controls.left = 1;
  let maxDev = 0;
  for (let frame = 0; frame < 60; frame++) {
    car.update(cave);
    maxDev = Math.max(maxDev, Math.abs(Math.atan2(car.fx, -car.fz)));
  }
  expect(car.grounded.some(Boolean)).toBe(false); // still airborne
  expect(maxDev).toBeGreaterThan(0.3);
});
});
