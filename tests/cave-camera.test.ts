import { expect, test } from 'bun:test';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { Ball } from '../src/games/cave/classes/Ball';
import type { Cave } from '../src/games/cave/classes/Cave';
import { ChaseCamera } from '../src/games/cave/classes/ChaseCamera';
import { config } from '../src/games/cave/classes/Config';

function ball() {
  return {
    radius: config.BALL_RADIUS,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    fx: 0,
    fy: 0,
    fz: -1,
    s: 100,
    speed: 0,
    quat: new Quaternion(),
  } as Ball;
}

/** The camera pose is a pure function of the current ball state: the boom is
 *  the negated horizontal tangent, with velocity then +Z as fallbacks. */
function boomVector(target: Ball) {
  let bx = -target.fx;
  let bz = -target.fz;
  let length = Math.hypot(bx, bz);
  if (length < 1e-4) {
    bx = -target.vx;
    bz = -target.vz;
    length = Math.hypot(bx, bz);
  }
  if (length < 1e-4) {
    bx = 0;
    bz = 1;
    length = 1;
  }
  bx /= length;
  bz /= length;
  return new Vector3(
    bx * config.CAMERA_FOLLOW_DISTANCE,
    config.CAMERA_FOLLOW_HEIGHT,
    bz * config.CAMERA_FOLLOW_DISTANCE,
  );
}

function expectedPosition(target: Ball) {
  return new Vector3(target.x, target.y, target.z).add(boomVector(target));
}

/** The camera pulled in along the boom to `reach`, as the collision does. */
function expectedReach(target: Ball, reach: number) {
  const boom = boomVector(target);
  return new Vector3(target.x, target.y, target.z).addScaledVector(
    boom.normalize(),
    reach,
  );
}

test('follows behind the ball tangent and keeps a constant boom length', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const follow = new ChaseCamera();
  const boom = Math.hypot(
    config.CAMERA_FOLLOW_DISTANCE,
    config.CAMERA_FOLLOW_HEIGHT,
  );
  for (const [x, y, z, fx, fz] of [
    [0, 0, 0, 0, -1],
    [6, 20, -200, 1, 0],
    [-50, -40, 100, 0.6, 0.8],
    [-1000, 2, 500, -0.28, 0.96],
  ]) {
    const target = ball();
    Object.assign(target, { x, y, z, fx, fz });
    follow.update(camera, target);
    expect(camera.position.distanceTo(expectedPosition(target))).toBeLessThan(
      1e-8,
    );
    expect(camera.position.distanceTo(new Vector3(x, y, z))).toBeCloseTo(
      boom,
      8,
    );
  }
});

test('does not lag: the pose only depends on the current ball state', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const follow = new ChaseCamera();
  const target = ball();
  Object.assign(target, { x: 6, y: 20, z: -200, fx: 1, fz: 0 });
  follow.update(camera, target);
  const first = camera.position.clone();
  const orientation = camera.quaternion.clone();
  Object.assign(target, { x: -50, y: -40, z: 100, fx: 0.6, fz: 0.8 });
  follow.update(camera, target);
  Object.assign(target, { x: 6, y: 20, z: -200, fx: 1, fz: 0 });
  follow.update(camera, target);
  expect(camera.position.distanceTo(first)).toBeLessThan(1e-8);
  expect(camera.quaternion.angleTo(orientation)).toBeLessThan(1e-7);
});

test('zero tangent falls back to velocity, then +Z', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const follow = new ChaseCamera();
  const target = ball();
  Object.assign(target, { fx: 0, fz: 0, vx: 3, vz: 0 });
  follow.update(camera, target);
  expect(camera.position.x).toBeCloseTo(-config.CAMERA_FOLLOW_DISTANCE, 8);
  expect(camera.position.z).toBeCloseTo(0, 8);
  Object.assign(target, { vx: 0, vz: 0 });
  follow.update(camera, target);
  expect(camera.position.x).toBeCloseTo(0, 8);
  expect(camera.position.z).toBeCloseTo(config.CAMERA_FOLLOW_DISTANCE, 8);
});

test('speed and reversed collision velocity cannot change the camera pose or lens', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const follow = new ChaseCamera();
  const target = ball();
  Object.assign(target, { fx: 1, fz: 0 });
  follow.update(camera, target);
  const position = camera.position.clone();
  const orientation = camera.quaternion.clone();
  for (const speed of [0, 2, 4, -4, 20]) {
    Object.assign(target, {
      speed: Math.abs(speed),
      vx: speed,
      vy: -speed,
      vz: speed,
    });
    follow.update(camera, target);
    expect(camera.position.equals(position)).toBe(true);
    expect(camera.quaternion.equals(orientation)).toBe(true);
    expect(camera.fov).toBe(72);
  }
});

test('frames the full ball at a fixed lens on desktop and mobile', () => {
  for (const aspect of [2048 / 985, 1.6, 390 / 844]) {
    const camera = new PerspectiveCamera(72, aspect, 0.1, 1600);
    const target = ball();
    Object.assign(target, { x: -766, y: -17, z: -4241 });
    new ChaseCamera().update(camera, target);
    camera.updateMatrixWorld(true);
    const radius = target.radius + 1.2;
    for (const [x, y, z] of [
      [-radius, 0, 0],
      [radius, 0, 0],
      [0, -radius, 0],
      [0, radius, 0],
      [0, 0, -radius],
      [0, 0, radius],
    ]) {
      const point = new Vector3(
        target.x + x,
        target.y + y,
        target.z + z,
      ).project(camera);
      expect(Math.abs(point.x)).toBeLessThan(1);
      expect(Math.abs(point.y)).toBeLessThan(1);
      expect(point.z).toBeGreaterThan(-1);
      expect(point.z).toBeLessThan(1);
    }
    expect(camera.fov).toBe(72);
  }
});

test('shortens the boom when rock blocks the camera and keeps it otherwise', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const target = ball();
  const blocked = {
    castRay: () => 30,
  } as unknown as Cave;
  new ChaseCamera().update(camera, target, blocked);
  const reach = 30 - config.CAMERA_COLLISION_MARGIN;
  expect(camera.position.distanceTo(expectedReach(target, reach))).toBeLessThan(
    1e-8,
  );
  const clear = {
    castRay: () => -1,
  } as unknown as Cave;
  new ChaseCamera().update(camera, target, clear);
  expect(camera.position.distanceTo(expectedPosition(target))).toBeLessThan(
    1e-8,
  );
});
