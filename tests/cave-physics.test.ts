import { describe, expect, test } from 'bun:test';
import { Ball, getCaveBrainDimensions } from '../src/games/cave/classes/Ball';
import type { Cave, RadialHit } from '../src/games/cave/classes/Cave';
import { config } from '../src/games/cave/classes/Config';
import { ControlType } from '../src/games/cave/types';

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
      return { volatility: 0, road: null, columns: [], ramp: null, boost: null };
    },
    castRay() {
      return -1;
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
    const { inputCount } = getCaveBrainDimensions(ball.sensor!.rayCount);
    expect(inputCount).toBe(ball.sensor!.rayCount * 2 + 4 + 8);
    expect(() => ball.update(cave)).not.toThrow();
  });
});
