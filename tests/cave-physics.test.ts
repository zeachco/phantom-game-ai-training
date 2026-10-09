import { describe, expect, test } from 'bun:test';
import { Ball, getCaveBrainDimensions } from '../src/games/cave/classes/Ball';
import type { Cave, RadialHit } from '../src/games/cave/classes/Cave';
import { config } from '../src/games/cave/classes/Config';
import { ControlType } from '../src/games/cave/types';
import { Vector3 } from 'three';
import { WallSolid } from '../src/games/cave/classes/WallSolid';

// An infinite plane isolates ball dynamics from procedural cave geometry.
function floor(height = (_x: number, _z: number) => 0, grade = 0) {
  return {
    gatePositions: Array.from(
      { length: config.GATES_PER_SEED },
      (_, i) => (i + 1) * config.GATE_SPACING,
    ),
    tangent(_s: number, out: { x: number; y: number; z: number }) {
      Object.assign(out, { x: 0, y: 0, z: -1 });
    },
    frame(
      _s: number,
      outT: { x: number; y: number; z: number },
      outN: { x: number; y: number; z: number },
      outB: { x: number; y: number; z: number },
    ) {
      Object.assign(outT, { x: 0, y: 0, z: -1 });
      Object.assign(outN, { x: 0, y: 1, z: 0 });
      Object.assign(outB, { x: 1, y: 0, z: 0 });
    },
    centerAt(s: number, out: object) {
      return Object.assign(out, { x: 0, y: 0, z: -s });
    },
    boostAt(_s: number, _a: number) {
      return 0;
    },
    platformAt(_s: number, _a: number) {
      return 0;
    },
    featureCell(_index: number) {
      return {
        volatility: 0,
        road: null,
        columns: [],
        ramp: null,
        boost: null,
      };
    },
    castRay() {
      return -1;
    },
    wallAt() {
      return null;
    },
    wallContact() {
      return null;
    },
    wallSurfaceAt() {
      return null;
    },
    nearestRadial(
      x: number,
      y: number,
      z: number,
      sHint: number,
      out: RadialHit,
    ) {
      return Object.assign(out, {
        nx: 0,
        ny: -1 / Math.hypot(1, grade),
        nz: -grade / Math.hypot(1, grade),
        dist: (height(x, z) - y) / Math.hypot(1, grade),
        a: Math.PI,
        s: sHint,
      });
    },
  } as unknown as Cave;
}
const spawn = {
  x: 0,
  y: config.BALL_RADIUS + 0.001,
  z: -100,
  tx: 0,
  ty: 0,
  tz: -1,
  s: 100,
};
function tick(ball: Ball, cave: Cave, frames: number) {
  for (let i = 0; i < frames; i++) ball.update(cave);
  expect(ball.damaged).toBe(false);
  expect(Number.isFinite(ball.speed)).toBe(true);
  expect(ball.quat.length()).toBeCloseTo(1, 8);
}
function settled() {
  const ball = new Ball(spawn);
  ball.controls.moveX = 0;
  ball.controls.moveY = 0;
  const cave = floor();
  tick(ball, cave, 60);
  return { ball, cave };
}

describe('cave ball physics', () => {
  test('rests on the floor without sinking or bouncing', () => {
    const { ball } = settled();
    expect(ball.grounded).toBe(true);
    expect(ball.y).toBeGreaterThan(config.BALL_RADIUS - 0.3);
    expect(ball.y).toBeLessThan(config.BALL_RADIUS + 0.2);
    expect(ball.speed).toBeLessThan(0.05);
  });

  test('the stick accelerates the ball forward along the track', () => {
    const { ball, cave } = settled();
    const start = ball.s;
    ball.controls.moveY = 1;
    tick(ball, cave, 120);
    expect(ball.s).toBeGreaterThan(start + 30);
    expect(ball.vz).toBeLessThan(-1);
  });

  test('the stick right rolls the ball to the camera right (+x)', () => {
    const { ball, cave } = settled();
    ball.controls.moveX = 1;
    tick(ball, cave, 60);
    expect(ball.x).toBeGreaterThan(1);
  });

  test('stick back decelerates then reverses', () => {
    const { ball, cave } = settled();
    ball.controls.moveY = 1;
    tick(ball, cave, 120);
    const forward = -ball.vz;
    ball.controls.moveY = -1;
    tick(ball, cave, 60);
    expect(ball.vz).toBeGreaterThan(-forward);
  });

  test('the stick clamps to the unit circle, diagonals are not faster', () => {
    const straight = settled();
    straight.ball.controls.moveY = 1;
    tick(straight.ball, straight.cave, 90);
    const diagonal = settled();
    diagonal.ball.controls.moveX = 1;
    diagonal.ball.controls.moveY = 1;
    tick(diagonal.ball, diagonal.cave, 90);
    expect(diagonal.ball.speed).toBeLessThanOrEqual(
      straight.ball.speed + config.BALL_ACCEL,
    );
  });

  test('a boost lifts the speed cap and pushes the ball past it', () => {
    const cave = floor();
    cave.boostAt = (s: number) => (s > 150 ? 1 : 0);
    const { ball } = settled();
    ball.controls.moveY = 1;
    tick(ball, cave, 500);
    expect(ball.speed).toBeGreaterThan(config.BALL_MAX_SPEED);
  });

  test('a gentle floor contact does not kill the ball, a hard impact does', () => {
    const cave = floor();
    const gentle = new Ball({ ...spawn, y: config.BALL_RADIUS + 0.01 });
    gentle.vy = -1;
    gentle.update(cave);
    expect(gentle.damaged).toBe(false);

    const hard = new Ball({ ...spawn, y: config.BALL_RADIUS + 0.01 });
    hard.vy = -20;
    hard.update(cave);
    expect(hard.damaged).toBe(true);
  });

  test('an AI ball builds the full brain input vector and drives a frame', () => {
    const cave = floor();
    const ball = new Ball(spawn, ControlType.AI, config.BALL_MAX_SPEED, 't', 1);
    const { inputCount, outputCount } = getCaveBrainDimensions(
      ball.sensor!.rayCount,
    );
    expect(inputCount).toBe(ball.sensor!.rayCount * 2 + 4 + 8);
    expect(outputCount).toBe(2);
    expect(() => ball.update(cave)).not.toThrow();
  });
});

test('airborne movement retains horizontal momentum under the speed cap', () => {
  const ball = new Ball({ ...spawn, y: 40 });
  ball.vz = -config.BALL_MAX_SPEED;
  const cave = floor();
  tick(ball, cave, 20);
  expect(ball.grounded).toBe(false);
  expect(ball.vz).toBeLessThan(-config.BALL_MAX_SPEED * 0.99);
  expect(Math.hypot(ball.vx, ball.vz)).toBeLessThanOrEqual(
    config.BALL_MAX_SPEED,
  );
});

test('jump leaves the ground, rejects an air jump, and becomes available after landing', () => {
  const { ball, cave } = settled();
  ball.controls.requestJump();
  ball.update(cave);
  expect(ball.grounded).toBe(false);
  expect(ball.vy).toBeGreaterThan(
    config.BALL_JUMP_SPEED - config.BALL_GRAVITY * 1.1,
  );
  tick(ball, cave, 8);
  const before = ball.vy;
  ball.controls.requestJump();
  ball.update(cave);
  expect(ball.vy).toBeLessThan(before);
  tick(ball, cave, 65);
  expect(ball.grounded).toBe(true);
  ball.controls.requestJump();
  ball.update(cave);
  expect(ball.vy).toBeGreaterThan(1);
});

function box() {
  // Two angular columns, with each pair ordered baseline then deck.
  return new WallSolid(
    [
      new Float32Array([
        -43.2, 0, -100, -43.2, 8, -100, 43.2, 0, -100, 43.2, 8, -100,
      ]),
      new Float32Array([
        -43.2, 0, -150, -43.2, 8, -150, 43.2, 0, -150, 43.2, 8, -150,
      ]),
    ],
    new Vector3(0, 0, -1),
  );
}

test('a grounded jump clears a solid slab that otherwise stops a rolling ball', () => {
  const terrain = floor();
  const slab = box();
  terrain.wallContact = (x, y, z, r) => {
    const hit = slab.contact(x, y, z, r);
    return hit && hit.dist < r ? hit : null;
  };
  const rolling = new Ball({ ...spawn, s: 80, z: -80 });
  rolling.vz = -config.BALL_MAX_SPEED;
  tick(rolling, terrain, 60);
  expect(rolling.s).toBeLessThan(100);
  const jumping = new Ball({ ...spawn, s: 80, z: -80 });
  jumping.controls.moveY = 0;
  tick(jumping, terrain, 1);
  jumping.controls.moveY = 1;
  jumping.vz = -config.BALL_MAX_SPEED;
  jumping.controls.requestJump();
  tick(jumping, terrain, 70);
  expect(jumping.s).toBeGreaterThan(150 + jumping.radius);
});

test('both slab sides push a touching sphere outward and stop inward motion', () => {
  const terrain = floor();
  const halfAcross = 43.2;
  const slab = box();
  terrain.wallContact = (x, y, z, r) => {
    const hit = slab.contact(x, y, z, r);
    return hit && hit.dist < r ? hit : null;
  };
  for (const side of [-1, 1]) {
    const ball = new Ball({ ...spawn, x: side * 43, z: -125, s: 125 });
    ball.a = Math.PI - ball.x / config.CAVE_RADIUS;
    ball.controls.moveY = 0;
    ball.vx = -side * 2;
    ball.update(terrain);
    expect(ball.x * side).toBeGreaterThanOrEqual(
      halfAcross + ball.radius - 0.001,
    );
    expect(ball.vx * side).toBeGreaterThanOrEqual(0);
    expect(ball.y - ball.radius).toBeLessThan(6);
  }
});

test('a wall bounce reverses and halves angular velocity instead of resetting ground roll', () => {
  const terrain = floor();
  const slab = box();
  terrain.wallContact = (x, y, z, r) => {
    const hit = slab.contact(x, y, z, r);
    return hit && hit.dist < r ? hit : null;
  };
  const ball = new Ball({ ...spawn, s: 98.4, z: -98.4, y: 4 });
  const spin = ball as unknown as { avx: number; avy: number; avz: number };
  spin.avx = 2;
  spin.avy = 0.4;
  spin.avz = -0.3;
  ball.controls.moveY = 0;
  ball.vz = -6;
  ball.update(terrain);
  expect(ball.vz).toBeGreaterThan(0);
  expect(spin.avx).toBeCloseTo(-1 * config.BALL_SPIN_DAMP, 6);
  expect(spin.avy).toBeCloseTo(-0.2 * config.BALL_SPIN_DAMP, 6);
  expect(spin.avz).toBeCloseTo(0.15 * config.BALL_SPIN_DAMP, 6);
  expect(ball.quat.x).toBeLessThan(0);
});
