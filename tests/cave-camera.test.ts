import { expect, test } from 'bun:test';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { Car } from '../src/games/cave/classes/Car';
import type { Cave } from '../src/games/cave/classes/Cave';
import { ChaseCamera } from '../src/games/cave/classes/ChaseCamera';

function car() {
  return {
    x: 0,
    y: 0,
    z: 0,
    fx: 0,
    fz: -1,
    s: 100,
    quat: new Quaternion(),
  } as Car;
}
function cave(obstruction = -1) {
  return { castWheelRay: () => obstruction } as unknown as Cave;
}
function expectVisible(camera: PerspectiveCamera, target: Car) {
  camera.updateMatrixWorld(true);
  // Includes the full body, extended suspension, wheels and front marker.
  for (const x of [-3, 3])
    for (const y of [-3.7, 3.2])
      for (const z of [-5.2, 5.2]) {
        const point = new Vector3(x, y, z)
          .applyQuaternion(target.quat)
          .add(new Vector3(target.x, target.y, target.z))
          .project(camera);
        expect(Math.abs(point.x)).toBeLessThan(1);
        expect(Math.abs(point.y)).toBeLessThan(1);
        expect(point.z).toBeGreaterThan(-1);
        expect(point.z).toBeLessThan(1);
      }
}

test('keeps the whole car framed through sharp turns, jumps and respawns', () => {
  for (const aspect of [1.6, 390 / 844]) {
    const camera = new PerspectiveCamera(72, aspect, 0.1, 1600);
    const follow = new ChaseCamera();
    const target = car();
    for (let frame = 0; frame < 120; frame++) {
      target.x += 6;
      target.y = Math.sin(frame / 8) * 20;
      const yaw = frame < 30 ? 0 : Math.PI;
      target.fx = -Math.sin(yaw);
      target.fz = -Math.cos(yaw);
      target.quat.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
      follow.update(camera, target, cave(), 1 / 60);
      expectVisible(camera, target);
    }
    target.x = -1000;
    target.z = 500;
    follow.update(camera, target, cave(), 1 / 60);
    expectVisible(camera, target);
    const otherCar = car();
    follow.update(camera, otherCar, cave(), 1 / 60);
    expectVisible(camera, otherCar);
  }
});

test('pulls in before walls and widens the lens to retain the car', () => {
  for (const aspect of [1.6, 390 / 844]) {
    const camera = new PerspectiveCamera(72, aspect, 0.1, 1600);
    const follow = new ChaseCamera();
    const target = car();
    expect(follow.update(camera, target, cave(13), 1 / 60)).toBe(false);
    expect(camera.position.distanceTo(new Vector3(0, 0.5, 0))).toBeCloseTo(12);
    expectVisible(camera, target);
    expect(follow.update(camera, target, cave(4), 1 / 60)).toBe(true);
    expectVisible(camera, target);
  }
});
