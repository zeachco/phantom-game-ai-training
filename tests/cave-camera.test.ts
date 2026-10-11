import { expect, test } from 'bun:test';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { Ball } from '../src/games/cave/classes/Ball';
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
    fz: -1,
    s: 100,
    speed: 0,
    quat: new Quaternion(),
  } as Ball;
}

test('translates immediately with jumps, impacts, turns, respawns and another ball', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const follow = new ChaseCamera();
  const target = ball();
  follow.update(camera, target);
  const offset = camera.position.clone();
  const orientation = camera.quaternion.clone();
  const projection = camera.projectionMatrix.clone();
  for (const [x, y, z] of [
    [6, 20, -200],
    [-50, -40, 100],
    [-1000, 2, 500],
    [0, 0, 0],
  ]) {
    Object.assign(target, { x, y, z });
    target.quat.setFromAxisAngle(new Vector3(1, 0, 0), y);
    target.fx = Math.sin(x);
    target.fz = Math.cos(x);
    follow.update(camera, target);
    expect(
      camera.position
        .clone()
        .sub(new Vector3(x, y, z))
        .distanceTo(offset),
    ).toBeLessThan(1e-8);
    expect(camera.quaternion.angleTo(orientation)).toBeLessThan(1e-7);
    expect(camera.projectionMatrix.equals(projection)).toBe(true);
  }
  follow.update(camera, ball());
  expect(camera.position.distanceTo(offset)).toBeLessThan(1e-8);
  expect(camera.position.y).toBe(config.CAMERA_FOLLOW_HEIGHT);
  expect(camera.position.z).toBe(config.CAMERA_FOLLOW_DISTANCE);
});

test('speed and reversed collision velocity cannot change the camera pose or lens', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const follow = new ChaseCamera();
  const target = ball();
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
