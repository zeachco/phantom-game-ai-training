import { expect, test } from 'bun:test';
import type { Ball } from '../src/games/cave/classes/Ball';
import { Sensor } from '../src/games/cave/classes/Sensor';
import { SensorViz } from '../src/games/cave/classes/SensorViz';
import { config } from '../src/games/cave/classes/Config';

/** A ball frozen at a known pose; the fan only reads the frame fields. */
function posedBall() {
  const ball = {
    x: 1,
    y: 2,
    z: 3,
    fx: 0,
    fy: 0,
    fz: -1,
    rx: 1,
    ry: 0,
    rz: 0,
    ux: 0,
    uy: 1,
    uz: 0,
  } as unknown as Ball;
  const sensor = new Sensor(ball);
  sensor.readings.fill(0);
  ball.sensor = sensor;
  return ball;
}

test('rayVector maps fan, up and down rays to the ball frame and reach', () => {
  const sensor = posedBall().sensor!;
  const dir = { x: 0, y: 0, z: 0 };
  // the middle fan ray points straight along the forward axis at full reach
  expect(sensor.rayVector(9, dir)).toBeCloseTo(config.SENSORS_MAX_LENGTH, 6);
  expect(dir).toEqual({ x: 0, y: 0, z: -1 });
  // the extra rays are the verticals, in up then down order
  expect(sensor.rayVector(config.SENSORS, dir)).toBe(
    config.VERTICAL_RAY_LENGTH,
  );
  expect(dir.x).toBeCloseTo(0, 8);
  expect(dir.y).toBeCloseTo(1, 8);
  expect(dir.z).toBeCloseTo(0, 8);
  sensor.rayVector(config.SENSORS + 1, dir);
  expect(dir.x).toBeCloseTo(0, 8);
  expect(dir.y).toBeCloseTo(-1, 8);
  expect(dir.z).toBeCloseTo(0, 8);
});

test('SensorViz draws every ray to its hit endpoint and a fan across the fan', () => {
  const ball = posedBall();
  const sensor = ball.sensor!;
  const viz = new SensorViz(config.SENSORS);
  viz.update(ball, true);
  expect(viz.group.visible).toBe(true);

  const rays = viz.rays.geometry.getAttribute('position');
  // two vertices per ray: origin then endpoint
  expect(rays.count).toBe((config.SENSORS + 2) * 2);
  // every segment starts at the ball
  expect([rays.getX(0), rays.getY(0), rays.getZ(0)]).toEqual([1, 2, 3]);
  // a miss (reading 0) draws the full reach: center ray ends at z = 3 - reach
  const center = 9;
  expect(rays.getX(center * 2 + 1)).toBeCloseTo(1, 6);
  expect(rays.getY(center * 2 + 1)).toBeCloseTo(2, 6);
  expect(rays.getZ(center * 2 + 1)).toBeCloseTo(
    3 - config.SENSORS_MAX_LENGTH,
    6,
  );

  const fan = viz.fan.geometry.getAttribute('position');
  expect(fan.count).toBe((config.SENSORS - 1) * 3);

  // a hit shortens the same ray by the reading fraction
  sensor.readings[center] = 0.5;
  viz.update(ball, true);
  expect(rays.getZ(center * 2 + 1)).toBeCloseTo(
    3 - config.SENSORS_MAX_LENGTH * 0.5,
    6,
  );

  viz.update(ball, false);
  expect(viz.group.visible).toBe(false);
  viz.dispose();
});
