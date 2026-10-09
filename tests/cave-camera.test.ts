import { expect, test } from 'bun:test';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { Ball } from '../src/games/cave/classes/Ball';
import type { Cave } from '../src/games/cave/classes/Cave';
import { ChaseCamera } from '../src/games/cave/classes/ChaseCamera';
import { config } from '../src/games/cave/classes/Config';

function ball() {
  return {
    radius: 1.4,
    x: 0,
    y: 0,
    z: 0,
    fx: 0,
    fz: -1,
    s: 100,
    quat: new Quaternion(),
  } as Ball;
}
function cave(obstruction = -1, wallObstruction = -1) {
  return {
    centerAt: (s: number, out: Vector3) => out.set(0, 12, 100 - s),
    tangent: (_s: number, out: Vector3) => out.set(0, 0, -1),
    castWheelRay: () => obstruction,
    wallRayDistance: () => wallObstruction,
  } as unknown as Cave;
}
function expectVisible(camera: PerspectiveCamera, target: Ball) {
  camera.updateMatrixWorld(true);
  // The visible silhouette of the ball: the six radius points.
  const r = target.radius + 1.2;
  const offsets = [
    [-r, 0, 0],
    [r, 0, 0],
    [0, -r, 0],
    [0, r, 0],
    [0, 0, -r],
    [0, 0, r],
  ];
  for (const [x, y, z] of offsets) {
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

test('keeps the whole ball framed through sharp turns, hills and respawns', () => {
  for (const aspect of [1.6, 390 / 844]) {
    const camera = new PerspectiveCamera(72, aspect, 0.1, 1600);
    const follow = new ChaseCamera();
    const target = ball();
    const terrain = cave();
    terrain.centerAt = (s, out) => {
      const distance = s - target.s;
      out.x = target.x + target.fx * distance;
      out.y = target.y + 12;
      out.z = target.z + target.fz * distance;
      return out;
    };
    terrain.tangent = (_s, out) => {
      out.x = target.fx;
      out.y = 0;
      out.z = target.fz;
      return out;
    };
    for (let frame = 0; frame < 120; frame++) {
      target.x += 6;
      target.y = Math.sin(frame / 8) * 20;
      const yaw = frame < 30 ? 0 : Math.PI;
      target.fx = -Math.sin(yaw);
      target.fz = -Math.cos(yaw);
      target.quat.setFromAxisAngle(new Vector3(0, 1, 0), yaw);
      follow.update(camera, target, terrain);
      expectVisible(camera, target);
    }
    target.x = -1000;
    target.z = 500;
    follow.update(camera, target, terrain);
    expectVisible(camera, target);
    const otherBall = ball();
    follow.update(camera, otherBall, cave());
    expectVisible(camera, otherBall);
  }
});

test('pulls in before walls and widens the lens to retain the ball', () => {
  for (const aspect of [1.6, 390 / 844]) {
    const camera = new PerspectiveCamera(72, aspect, 0.1, 1600);
    const follow = new ChaseCamera();
    const target = ball();
    expect(follow.update(camera, target, cave(13))).toBe(false);
    expect(camera.position.distanceTo(new Vector3(0, 0.5, 0))).toBeCloseTo(12);
    expectVisible(camera, target);
    expect(follow.update(camera, target, cave(4))).toBe(true);
    expectVisible(camera, target);
  }
});

test('pulls the camera in front of a wall slab', () => {
  for (const aspect of [1.6, 390 / 844]) {
    const camera = new PerspectiveCamera(72, aspect, 0.1, 1600);
    const follow = new ChaseCamera();
    const target = ball();
    expect(follow.update(camera, target, cave(-1, 12))).toBe(false);
    expect(camera.position.distanceTo(new Vector3(0, 0.5, 0))).toBeCloseTo(11);
    expectVisible(camera, target);
  }
});

test('never forces its minimum follow distance through a nearby wall', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const follow = new ChaseCamera();
  const target = ball();
  follow.update(camera, target, cave(-1, 2));
  expect(camera.position.distanceTo(new Vector3(0, 0.5, 0))).toBeLessThan(2);
});

test('stays on the blended rear axis when a wall blocks the camera', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const follow = new ChaseCamera();
  const target = ball();
  const terrain = cave();
  terrain.wallRayDistance = (_x, _y, _z, _dx, _dy, dz) => (dz > 0.5 ? 2 : -1);
  expect(follow.update(camera, target, terrain)).toBe(true);
  expect(camera.position.x).toBeCloseTo(0);
  expect(camera.position.z).toBeGreaterThan(0);
  expect(camera.position.distanceTo(new Vector3(0, 0.5, 0))).toBeCloseTo(1);
});

test('blends the cave center behind the ball toward its position by 20%', () => {
  const camera = new PerspectiveCamera(72, 1.6, 0.1, 1600);
  const follow = new ChaseCamera();
  const target = ball();
  const terrain = cave();
  const samples: number[] = [];
  terrain.centerAt = (s, out) => {
    samples.push(s);
    out.x = Math.sin(s / 100) * 30;
    out.y = 12 + s / 10;
    out.z = -s;
    return out;
  };
  for (const s of [100, 140, 600, 100]) {
    target.s = s;
    target.x = 25;
    target.y = -8;
    target.z = -s;
    follow.update(camera, target, terrain);
    const center = terrain.centerAt(
      s - config.CAMERA_FOLLOW_DISTANCE,
      new Vector3(),
    );
    const expected = center.lerp(
      new Vector3(target.x, target.y, target.z),
      0.2,
    );
    expect(camera.position.distanceTo(expected)).toBeLessThan(1e-8);
    expect(samples.at(-2)).toBe(s - config.CAMERA_FOLLOW_DISTANCE);
    expectVisible(camera, target);
  }
});

test('looks three cave sections ahead and amplifies the bend by three', () => {
  for (const aspect of [1.6, 390 / 844]) {
    const camera = new PerspectiveCamera(72, aspect, 0.1, 1600);
    const follow = new ChaseCamera();
    const target = ball();
    const terrain = cave();
    const lookAhead = 3 * config.CAVE_SEGMENT_LENGTH;
    const samples: number[] = [];
    for (const [curveX, curveY] of [
      [0, 0],
      [30, 10],
      [-20, -15],
    ]) {
      terrain.centerAt = (s, out) => {
        samples.push(s);
        const t = (s - target.s) / lookAhead;
        out.x = curveX * t * t;
        out.y = 12 + curveY * t * t;
        out.z = target.s - s;
        return out;
      };
      follow.update(camera, target, terrain);
      const focus = new Vector3(curveX * 3, 12 + curveY * 3, -lookAhead);
      const expected = focus.sub(camera.position).normalize();
      expect(
        camera.getWorldDirection(new Vector3()).distanceTo(expected),
      ).toBeLessThan(1e-8);
      expect(samples).toContain(target.s + lookAhead);
      expectVisible(camera, target);
    }
    // A wall still pulls the camera in while the aim follows the cave ahead.
    follow.update(camera, target, cave(4));
    expectVisible(camera, target);
  }
});
