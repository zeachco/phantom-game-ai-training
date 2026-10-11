import { expect, test } from 'bun:test';
import type { Ball } from '../src/games/cave/classes/Ball';
import type { Cave } from '../src/games/cave/classes/Cave';
import { Sensor } from '../src/games/cave/classes/Sensor';
import { SensorViz } from '../src/games/cave/classes/SensorViz';
import { config } from '../src/games/cave/classes/Config';

/** Every ray misses, so readings come back 0 and rays draw at full reach. */
const openCave = { castRay: () => -1 } as unknown as Cave;

/** A ball frozen at a known pose; the cone only reads the frame and velocity. */
function posedBall() {
  const ball = {
    x: 1,
    y: 2,
    z: 3,
    vx: 0,
    vy: 0,
    vz: 0,
    fx: 0,
    fy: 0,
    fz: -1,
    cx: 0,
    cy: 0,
    cz: -1,
    rx: 1,
    ry: 0,
    rz: 0,
    ux: 0,
    uy: 1,
    uz: 0,
  } as unknown as Ball;
  const sensor = new Sensor(ball);
  ball.sensor = sensor;
  return ball;
}

function angleFromAxis(dir: { x: number; y: number; z: number }) {
  // the default posed axis is the fallback cave tangent, (0, 0, -1)
  return Math.acos(Math.max(-1, Math.min(1, -dir.z)));
}

test('the center ray runs down the cone axis and the rim sits at half-angle', () => {
  const ball = posedBall();
  const sensor = ball.sensor!;
  sensor.update(openCave);
  const dir = { x: 0, y: 0, z: 0 };

  expect(sensor.rayVector(0, dir)).toBeCloseTo(config.SENSORS_MAX_LENGTH, 6);
  expect(dir.x).toBeCloseTo(0, 8);
  expect(dir.y).toBeCloseTo(0, 8);
  expect(dir.z).toBeCloseTo(-1, 8);

  // every rim ray is one cone half-angle off the axis
  for (const index of sensor.surfaceIndices) {
    sensor.rayVector(index, dir);
    expect(angleFromAxis(dir)).toBeCloseTo(config.SENSOR_ANGLE / 2, 6);
  }

  // the extra rays are still the world verticals, up then down
  expect(sensor.rayVector(config.SENSORS, dir)).toBe(
    config.VERTICAL_RAY_LENGTH,
  );
  expect([dir.x, dir.y, dir.z]).toEqual([0, 1, 0]);
  sensor.rayVector(config.SENSORS + 1, dir);
  expect(dir.y).toBeCloseTo(-1, 8);
});

test('the cone points down the ball velocity when it is moving', () => {
  const ball = posedBall();
  ball.vx = 0.6;
  ball.vy = 0;
  ball.vz = -0.8;
  const sensor = ball.sensor!;
  sensor.update(openCave);
  const dir = { x: 0, y: 0, z: 0 };
  sensor.rayVector(0, dir);
  expect(dir.x).toBeCloseTo(0.6, 8);
  expect(dir.y).toBeCloseTo(0, 8);
  expect(dir.z).toBeCloseTo(-0.8, 8);
});

test('SensorViz draws every ray to its hit endpoint and a cone surface', () => {
  const ball = posedBall();
  const sensor = ball.sensor!;
  sensor.update(openCave);
  const viz = new SensorViz(sensor.rayCount, sensor.surfaceIndices);
  viz.update(ball, true);
  expect(viz.group.visible).toBe(true);

  const rays = viz.rays.geometry.getAttribute('position');
  // two vertices per ray: origin then endpoint
  expect(rays.count).toBe(sensor.rayCount * 2);
  expect([rays.getX(0), rays.getY(0), rays.getZ(0)]).toEqual([1, 2, 3]);
  // a miss (reading 0) draws the full reach: center ray ends at z = 3 - reach
  expect(rays.getX(1)).toBeCloseTo(1, 6);
  expect(rays.getY(1)).toBeCloseTo(2, 6);
  expect(rays.getZ(1)).toBeCloseTo(3 - config.SENSORS_MAX_LENGTH, 6);

  // one triangle per rim edge, closing the ring
  const cone = viz.cone.geometry.getAttribute('position');
  expect(cone.count).toBe(sensor.surfaceIndices.length * 3);

  // a hit shortens the center ray by the reading fraction
  sensor.readings[0] = 0.5;
  viz.update(ball, true);
  expect(rays.getZ(1)).toBeCloseTo(3 - config.SENSORS_MAX_LENGTH * 0.5, 6);

  viz.update(ball, false);
  expect(viz.group.visible).toBe(false);
  viz.dispose();
});
