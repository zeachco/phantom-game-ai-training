import { expect, test } from 'bun:test';
import {
  Color,
  Mesh,
  MeshStandardMaterial,
  Raycaster,
  Scene,
  Triangle,
  Vector3,
} from 'three';
import { Cave } from '../src/games/cave/classes/Cave';
import { LANDING_RUNOUT } from '../src/games/cave/classes/PathCheck';
import { config } from '../src/games/cave/classes/Config';
import { Ball } from '../src/games/cave/classes/Ball';

function cave(seed: number, scene = new Scene()) {
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({ getContext: () => null }),
  } as unknown as Document;
  try {
    return new Cave(seed, scene);
  } finally {
    if (previous) globalThis.document = previous;
    else delete (globalThis as { document?: Document }).document;
  }
}

const angleDist = (a: number, b: number) => {
  let d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
};

test('the path guarantee keeps a drivable line on every seed', () => {
  for (const seed of [0, 1, 7, 25, 50, 100]) {
    const terrain = cave(seed);
    // the guarantee works on the cave's own band, which narrows with the
    // annealed difficulty
    const band = terrain.bandHalfWidth;
    const cells = Math.ceil(
      (config.SPAWN_OFFSET +
        config.GATES_PER_SEED * config.GATE_SPACING +
        config.CAVE_FEATURE_CELL * 2) /
        config.CAVE_FEATURE_CELL,
    );
    for (let i = 0; i < cells; i++) {
      const cell = terrain.featureCell(i);
      for (const col of cell.columns) {
        if (angleDist(col.angle, Math.PI) >= band + 0.3) continue;
        const half = col.angleWidth * 1.5;
        const gapLeft =
          (col.angle - half - (Math.PI - band)) * config.CAVE_RADIUS;
        const gapRight =
          (Math.PI + band - (col.angle + half)) * config.CAVE_RADIUS;
        expect(Math.max(gapLeft, gapRight)).toBeGreaterThanOrEqual(
          config.CAVE_PATH_MIN_GAP - 1e-6,
        );
      }
      // Same filter and sort the path check uses: the raw column order is
      // not by angle, so a naive pairwise walk would compare neighbors that
      // are far apart on the band.
      const inBand = cell.columns
        .filter((col) => angleDist(col.angle, Math.PI) < band + 0.3)
        .sort((a, b) => a.angle - b.angle);
      for (let k = 1; k < inBand.length; k++) {
        const prev = inBand[k - 1];
        const next = inBand[k];
        const gap =
          (next.angle - prev.angle) * config.CAVE_RADIUS -
          config.CAVE_RADIUS * (prev.angleWidth + next.angleWidth) * 1.5;
        expect(gap).toBeGreaterThanOrEqual(config.CAVE_PATH_MIN_GAP - 1e-6);
      }
      if (cell.volatility >= 0.7 && cell.columns.length > 0)
        expect(cell.ramp).not.toBeNull();
      if (cell.ramp) {
        const landingTo =
          cell.ramp.centerS + cell.ramp.height / 0.35 + LANDING_RUNOUT;
        for (const col of cell.columns) {
          const inLanding =
            col.centerS + col.halfLen > cell.ramp.centerS &&
            col.centerS - col.halfLen < landingTo;
          if (inLanding)
            expect(angleDist(col.angle, Math.PI)).toBeGreaterThan(band + 0.3);
        }
      }
    }
  }
});

test('the path check stores its validated line, ramp extents and fix spots', () => {
  const scene = new Scene();
  const terrain = cave(7, scene);
  const check = terrain.pathCheck();
  const maxS =
    config.SPAWN_OFFSET +
    config.GATES_PER_SEED * config.GATE_SPACING +
    config.CAVE_FEATURE_CELL * 2;

  // the validated line samples the band center across the whole validated range
  expect(check.samples.length).toBeGreaterThan(0);
  expect(check.samples[0]).toBe(0);
  expect(check.samples[check.samples.length - 1]).toBeLessThanOrEqual(maxS);

  // every ramp in the validated range carries a bracket extent and a landing
  // span, and every span has a positive length
  const cells = Math.ceil(maxS / config.CAVE_FEATURE_CELL) + 1;
  let ramps = 0;
  for (let i = 0; i < cells; i++) if (terrain.featureCell(i).ramp) ramps++;
  expect(check.ramps.length).toBe(ramps);
  expect(check.landings.length).toBe(ramps);
  for (const [from, to] of check.ramps) expect(to).toBeGreaterThan(from);
  for (const [from, to] of check.landings) expect(to).toBeGreaterThan(from);

  // the fixer only touched cells on the driving band
  for (const fix of check.fixes)
    expect(angleDist(fix.angle, Math.PI)).toBeLessThan(Math.PI / 2);

  // the overlay is pure drawing: it adds one group to the scene, redrawing
  // replaces it, and dispose removes it
  expect(scene.children.length).toBe(0);
  terrain.debugPath();
  expect(scene.children.length).toBe(1);
  terrain.debugPath();
  expect(scene.children.length).toBe(1);
  terrain.dispose();
  expect(scene.children.length).toBe(0);
});

test('a rewarding line exists: coins and platforms appear on the early cave', () => {
  const terrain = cave(7);
  let coinS = -1;
  let coinA = 0;
  let platforms = 0;
  for (let i = 0; i < 12; i++) {
    const cell = terrain.featureCell(i);
    const first = cell.coins[0];
    if (first) {
      coinS = first.centerS;
      coinA = first.centerA;
    }
    if (cell.ramp) platforms++;
  }
  expect(coinS).toBeGreaterThanOrEqual(0);
  expect(platforms).toBeGreaterThan(0);
  // a coin footprint reads full strength at its own center
  expect(terrain.coinAt(coinS, coinA)).toBeGreaterThan(0.5);
});

test('walls stop direct impacts and retain sphere clearance when balls slide around', () => {
  for (const seed of [7, 40]) {
    const terrain = cave(seed);
    let wall: NonNullable<ReturnType<Cave['featureCell']>['wall']> | null =
      null;
    for (let i = 1; i < 24 && !wall; i++) {
      const cell = terrain.featureCell(i);
      if (cell.wall) wall = cell.wall;
    }
    if (!wall) continue;
    const fraction = (wall.halfLen * 2) / config.CAVE_SEGMENT_LENGTH;
    expect(fraction).toBeGreaterThanOrEqual(
      config.CAVE_WALL_MIN_FRACTION - 1e-9,
    );
    expect(fraction).toBeLessThanOrEqual(config.CAVE_WALL_MAX_FRACTION + 1e-9);

    wall.angle = Math.PI;
    wall.angleWidth = 0.32;
    const front = wall.centerS;
    const ball = new Ball(terrain.groundSpawn(front - 20));
    ball.controls.moveY = 1;
    let touched = false;
    // Exact sloped rock normals can eventually carry an unsteered ball around
    // the side. Until the first contact, the ball must still be approaching the
    // wall's leading face, not already through it.
    let approachMaxS = -Infinity;
    for (let f = 0; f < 240 && !ball.damaged; f++) {
      ball.update(terrain);
      const hit = terrain.wallContact(
        ball.x,
        ball.y,
        ball.z,
        ball.radius + 0.05,
        ball.s,
      );
      if (hit) {
        touched = true;
        expect(hit.dist).toBeGreaterThanOrEqual(ball.radius - 0.001);
      } else if (!touched) {
        approachMaxS = Math.max(approachMaxS, ball.s);
      }
    }
    expect(touched).toBe(true);
    expect(approachMaxS).toBeLessThanOrEqual(front + 1);
  }
});

test('variation compounds with depth: deeper cells are wilder', () => {
  const shallow = { volatility: 0, cells: 0, features: 0 };
  const deep = { volatility: 0, cells: 0, features: 0 };
  for (const seed of [3, 11, 42, 77]) {
    const terrain = cave(seed);
    expect(terrain.depthAt(config.SPAWN_OFFSET)).toBe(0);
    expect(terrain.depthAt(config.SPAWN_OFFSET + config.CAVE_DEPTH_RAMP)).toBe(
      1,
    );
    for (let i = 1; i <= 5; i++) {
      const cell = terrain.featureCell(i);
      shallow.volatility += cell.volatility;
      shallow.cells++;
      shallow.features += cell.columns.length + (cell.wall ? 1 : 0);
    }
    for (let i = 30; i <= 70; i++) {
      const cell = terrain.featureCell(i);
      deep.volatility += cell.volatility;
      deep.cells++;
      deep.features += cell.columns.length + (cell.wall ? 1 : 0);
    }
  }
  expect(deep.volatility / deep.cells).toBeGreaterThan(
    shallow.volatility / shallow.cells,
  );
  expect(deep.features / deep.cells).toBeGreaterThanOrEqual(
    (shallow.features / shallow.cells) * 0.8,
  );
});

test('wall obstacles have closed geometry extruded toward the tunnel interior', () => {
  const scene = new Scene();
  const terrain = cave(7, scene);
  terrain.update(0, config.CAVE_SEGMENT_LENGTH * 12);

  const faces = scene.children.filter(
    (object): object is Mesh =>
      object instanceof Mesh &&
      object.material instanceof MeshStandardMaterial &&
      object.material.color.equals(new Color(...config.CAVE_WALL_COLOR)),
  );
  expect(faces.length).toBeGreaterThan(0);

  const face = faces[0].geometry.getAttribute('position');
  let tallest = 0;
  for (let vertex = 0; vertex < face.count; vertex += 2) {
    tallest = Math.max(
      tallest,
      Math.hypot(
        face.getX(vertex + 1) - face.getX(vertex),
        face.getY(vertex + 1) - face.getY(vertex),
        face.getZ(vertex + 1) - face.getZ(vertex),
      ),
    );
  }
  expect(tallest).toBeGreaterThan(1.5);
});

test('seed 5 checkpoint slabs have valid triangles and detect contacts across their front faces', () => {
  const scene = new Scene();
  const terrain = cave(5, scene);
  terrain.update(0, 4600);
  const triangle = new Triangle();
  const point = new Vector3();
  const normal = new Vector3();
  // Include the earlier pass-through and the slabs on both sides of gate 7.
  for (const cell of [6, 7, 8, 12, 13, 14, 15]) {
    const wall = terrain.featureCell(cell).wall!;
    const mesh = scene.children.find(
      (object) => object.userData.wallFront === wall.centerS,
    ) as Mesh;
    const positions = mesh.geometry.getAttribute('position');
    const indices = mesh.geometry.index!;
    for (let i = 0; i < indices.count; i += 3) {
      triangle.a.fromBufferAttribute(positions, indices.getX(i));
      triangle.b.fromBufferAttribute(positions, indices.getX(i + 1));
      triangle.c.fromBufferAttribute(positions, indices.getX(i + 2));
      expect(triangle.getArea()).toBeGreaterThan(0);
    }
    // Each front quad is followed by deck and base quads in the first row.
    for (let column = 0; column < mesh.userData.wallColumns - 1; column++) {
      for (const corner of [0, 3]) {
        const i = column * 18 + corner;
        triangle.a.fromBufferAttribute(positions, indices.getX(i));
        triangle.b.fromBufferAttribute(positions, indices.getX(i + 1));
        triangle.c.fromBufferAttribute(positions, indices.getX(i + 2));
        triangle.getNormal(normal);
        triangle
          .getMidpoint(point)
          .addScaledVector(normal, config.BALL_RADIUS - 0.02);
        const hit = terrain.wallContact(
          point.x,
          point.y,
          point.z,
          config.BALL_RADIUS,
          wall.centerS,
        );
        expect(hit).not.toBeNull();
        expect(Number.isFinite(hit!.dist)).toBe(true);
        expect(hit!.dist).toBeLessThan(config.BALL_RADIUS);
      }
    }
  }
});

test('seed 5 balls cannot enter the drawn checkpoint slab fronts at normal speed', () => {
  const scene = new Scene();
  const terrain = cave(5, scene);
  terrain.update(0, 4600);
  for (const cell of [6, 8, 13, 14, 15]) {
    const wall = terrain.featureCell(cell).wall!;
    const mesh = scene.children.find(
      (object) => object.userData.wallFront === wall.centerS,
    ) as Mesh;
    const positions = mesh.geometry.getAttribute('position');
    const indices = mesh.geometry.index!;
    const i = Math.floor((mesh.userData.wallColumns - 1) / 2) * 18;
    const triangle = new Triangle(
      ...([0, 1, 2].map((corner) =>
        new Vector3().fromBufferAttribute(positions, indices.getX(i + corner)),
      ) as [Vector3, Vector3, Vector3]),
    );
    const normal = triangle.getNormal(new Vector3());
    const point = triangle
      .getMidpoint(new Vector3())
      .addScaledVector(normal, config.BALL_RADIUS + 0.001);
    const ball = new Ball({
      x: point.x,
      y: point.y,
      z: point.z,
      s: wall.centerS,
      tx: 0,
      ty: 0,
      tz: -1,
    });
    ball.controls.moveX = 0;
    ball.controls.moveY = 0;
    ball.vx = -normal.x * config.BALL_MAX_SPEED;
    ball.vy = -normal.y * config.BALL_MAX_SPEED;
    ball.vz = -normal.z * config.BALL_MAX_SPEED;
    for (let frame = 0; frame < 8; frame++) {
      ball.update(terrain);
      point.set(ball.x, ball.y, ball.z).sub(triangle.a);
      expect(point.dot(normal)).toBeGreaterThanOrEqual(ball.radius - 0.001);
      expect(ball.damaged).toBe(false);
    }
  }
});

test('a seed 5 ball resting on rock inside the gate 7 slab is moved outside its rendered volume', () => {
  const scene = new Scene();
  const terrain = cave(5, scene);
  terrain.update(0, 4600);
  scene.updateMatrixWorld(true);
  const wall = terrain.featureCell(14).wall!;
  const mesh = scene.children.find(
    (object) => object.userData.wallFront === wall.centerS,
  ) as Mesh;
  const ball = new Ball(terrain.groundSpawn(wall.centerS + wall.halfLen));
  ball.controls.moveX = 0;
  ball.controls.moveY = 0;
  const point = new Vector3();
  const ray = new Raycaster(point, new Vector3(0.13, 1, 0.21).normalize());
  const inside = () => {
    point.set(ball.x, ball.y, ball.z);
    let crossings = 0;
    let previous = -Infinity;
    for (const hit of ray.intersectObject(mesh)) {
      if (hit.distance - previous < 1e-6) continue;
      crossings++;
      previous = hit.distance;
    }
    return crossings % 2 === 1;
  };
  expect(inside()).toBe(true);
  const triangle = new Triangle();
  const nearest = new Vector3();
  const positions = mesh.geometry.getAttribute('position');
  const indices = mesh.geometry.index!;
  for (let frame = 0; frame < 8; frame++) {
    ball.update(terrain);
    expect(inside()).toBe(false);
    for (let i = 0; i < indices.count; i += 3) {
      triangle.a.fromBufferAttribute(positions, indices.getX(i));
      triangle.b.fromBufferAttribute(positions, indices.getX(i + 1));
      triangle.c.fromBufferAttribute(positions, indices.getX(i + 2));
      triangle.closestPointToPoint(point, nearest);
      expect(point.distanceTo(nearest)).toBeGreaterThanOrEqual(
        ball.radius - 0.001,
      );
    }
    expect(ball.damaged).toBe(false);
  }
});

test('landing uses the exact rendered obstacle deck', () => {
  const scene = new Scene();
  const terrain = cave(7, scene);
  let wall: NonNullable<ReturnType<Cave['featureCell']>['wall']> | null = null;
  for (let i = 0; i < 12 && !wall; i++) wall = terrain.featureCell(i).wall;
  expect(wall).not.toBeNull();
  wall!.angle = Math.PI;
  wall!.angleWidth = 0.32;
  terrain.update(0, config.CAVE_SEGMENT_LENGTH * 12);
  const middleS = wall!.centerS + wall!.halfLen;
  const spawn = terrain.groundSpawn(middleS);
  const obstacles = scene.children.filter(
    (o): o is Mesh =>
      o instanceof Mesh && o.material instanceof MeshStandardMaterial,
  );
  const ray = new Raycaster(
    new Vector3(spawn.x, spawn.y + 30, spawn.z),
    new Vector3(0, -1, 0),
  );
  const deck = ray.intersectObjects(obstacles)[0];
  expect(deck).toBeDefined();
  const ball = new Ball({
    ...spawn,
    y: deck.point.y + config.BALL_RADIUS + 0.05,
  });
  ball.controls.moveY = 0;
  ball.vy = -1;
  ball.update(terrain);
  expect(ball.grounded).toBe(true);
  expect(ball.y - ball.radius).toBeCloseTo(deck.point.y + 0.02, 1);
});

test('a ball cannot stay inside a wall slab', () => {
  const terrain = cave(7);
  let wall: NonNullable<ReturnType<Cave['featureCell']>['wall']> | null = null;
  for (let i = 0; i < 12 && !wall; i++) wall = terrain.featureCell(i).wall;
  expect(wall).not.toBeNull();

  wall!.angle = Math.PI;
  wall!.angleWidth = 0.32;
  // spawn well inside the slab's footprint and let one frame resolve it
  const insideFront = wall!.centerS + wall!.halfLen * 0.5;
  const ball = new Ball(terrain.groundSpawn(insideFront));
  ball.update(terrain);

  const topY = terrain.wallSurfaceAt(ball.s, ball.a);
  // either pushed out of the footprint, or resting on (or above) the top face
  if (topY !== null)
    expect(ball.y - config.BALL_RADIUS).toBeGreaterThan(topY - 0.05);
});

test('a ball whose skin overlaps a wall face is pushed back out', () => {
  const terrain = cave(7);
  let wall: NonNullable<ReturnType<Cave['featureCell']>['wall']> | null = null;
  for (let i = 0; i < 12 && !wall; i++) wall = terrain.featureCell(i).wall;
  expect(wall).not.toBeNull();

  wall!.angle = Math.PI;
  wall!.angleWidth = 0.32;
  const ball = new Ball(terrain.groundSpawn(wall!.centerS - 0.5));
  ball.controls.moveY = 1;
  ball.update(terrain);
  expect(
    terrain.wallAt(ball.s, ball.a, ball)!.frontFace!.dist,
  ).toBeGreaterThanOrEqual(ball.radius);
  expect(terrain.wallSurfaceAt(ball.s, ball.a)).toBeNull();
});

test('seed 1 balls keep their full radius outside the drawn front face', () => {
  const scene = new Scene();
  const terrain = cave(1, scene);
  for (const cell of [25, 27, 28, 31, 32]) {
    terrain.featureCell(cell).wall!.angle = Math.PI;
    terrain.featureCell(cell).wall!.angleWidth = 0.32;
  }
  terrain.update(0, 9500);
  for (const cell of [25, 27, 28, 31, 32]) {
    const wall = terrain.featureCell(cell).wall!;
    const face = scene.children.find((object): object is Mesh => {
      if (!(object instanceof Mesh)) return false;
      return object.userData.wallFront === wall.centerS;
    })!;
    expect(face).toBeDefined();
    const ball = new Ball(terrain.groundSpawn(wall.centerS - 18));
    const t = terrain.tangent(ball.s, { x: 0, y: 0, z: 0 });
    ball.vx = t.x * 6;
    ball.vy = t.y * 6;
    ball.vz = t.z * 6;
    const triangle = new Triangle();
    const point = new Vector3();
    const nearest = new Vector3();
    const positions = face.geometry.getAttribute('position');
    const indices = face.geometry.index!;
    for (let frame = 0; frame < 80; frame++) {
      ball.update(terrain);
      point.set(ball.x, ball.y, ball.z);
      // The first row interleaves the exposed front with deck/base quads.
      for (let i = 0; i < (face.userData.wallColumns - 1) * 18; i += 3) {
        if (i % 18 >= 6) continue;
        triangle.a.fromBufferAttribute(positions, indices.getX(i));
        triangle.b.fromBufferAttribute(positions, indices.getX(i + 1));
        triangle.c.fromBufferAttribute(positions, indices.getX(i + 2));
        triangle.closestPointToPoint(point, nearest);
        expect(point.distanceTo(nearest)).toBeGreaterThanOrEqual(
          ball.radius - 0.001,
        );
      }
    }
  }
});

test('seed 3 allows a grounded ball to cross the wall front on either side', () => {
  const terrain = cave(3);
  const wall = terrain.featureCell(19).wall!;
  expect(wall).not.toBeNull();
  wall.angle = Math.PI;
  wall.angleWidth = 0.32;
  for (const offset of [-0.7, -0.55, 0.55, 0.7]) {
    const s = wall.centerS - config.BALL_RADIUS - 0.3;
    const a = wall.angle + offset;
    const point = terrain.surface(s, a, { x: 0, y: 0, z: 0 });
    const t = { x: 0, y: 0, z: 0 };
    const n = { ...t };
    const b = { ...t };
    terrain.frame(s, t, n, b);
    const nx = n.x * Math.cos(a) + b.x * Math.sin(a);
    const ny =
      (n.y * Math.cos(a) + b.y * Math.sin(a)) / config.CAVE_VERTICAL_SCALE;
    const nz = n.z * Math.cos(a) + b.z * Math.sin(a);
    const normalLength = Math.hypot(nx, ny, nz);
    const ball = new Ball({
      x: point.x - (nx / normalLength) * config.BALL_RADIUS,
      y:
        point.y * config.CAVE_VERTICAL_SCALE -
        (ny / normalLength) * config.BALL_RADIUS,
      z: point.z - (nz / normalLength) * config.BALL_RADIUS,
      s,
      tx: t.x,
      ty: t.y,
      tz: t.z,
    });
    const hit = terrain.nearestRadial(
      ball.x,
      ball.y,
      ball.z,
      s,
      {} as Parameters<Cave['nearestRadial']>[4],
    );
    ball.a = hit.a;
    const bounds = terrain.wallAt(ball.s, ball.a)!;
    expect(Math.abs(bounds.across) - ball.radius).toBeGreaterThan(
      bounds.halfAcross,
    );
    // On these banks the sphere's bottom is below the local terrain height,
    // which used to trigger an invisible barrier outside the bronze slab.
    expect(ball.y - ball.radius).toBeLessThan(bounds.topY);
    ball.controls.moveY = 0;
    ball.vx = t.x * 6;
    ball.vy = t.y * 6;
    ball.vz = t.z * 6;
    for (let frame = 0; frame < 4; frame++) ball.update(terrain);
    expect(ball.s).toBeGreaterThan(wall.centerS + ball.radius);
    expect(ball.vx * t.x + ball.vy * t.y + ball.vz * t.z).toBeGreaterThan(
      config.BALL_MAX_SPEED * 0.9,
    );
    expect(ball.damaged).toBe(false);
  }
});

test('streaming preserves the guaranteed features ahead and under visible cave meshes', () => {
  const terrain = cave(2);
  const ahead = terrain.featureCell(35);
  const aheadLayout = structuredClone(ahead);
  terrain.update(0, 500);
  expect(terrain.featureCell(35)).toEqual(aheadLayout);
  const visible = terrain.featureCell(31);
  const visibleLayout = structuredClone(visible);
  terrain.update(8400, 9800);
  expect(terrain.featureCell(31)).toEqual(visibleLayout);
  expect(terrain.featureCell(35)).toEqual(aheadLayout);
});

test('camera wall rays stop at the rendered bronze face', () => {
  const scene = new Scene();
  const terrain = cave(1, scene);
  for (const cell of [25, 31, 32]) {
    terrain.featureCell(cell).wall!.angle = Math.PI;
    terrain.featureCell(cell).wall!.angleWidth = 0.32;
  }
  terrain.update(0, 9300);
  for (const cell of [25, 31, 32]) {
    const wall = terrain.featureCell(cell).wall!;
    const face = scene.children.find((object): object is Mesh => {
      if (!(object instanceof Mesh)) return false;
      return object.userData.wallFront === wall.centerS;
    })!;
    const t = terrain.tangent(wall.centerS, { x: 0, y: 0, z: 0 });
    const direction = new Vector3(t.x, 0, t.z).normalize();
    const positions = face.geometry.getAttribute('position');
    const column = Math.floor(face.userData.wallColumns / 2) * 2;
    const origin = new Vector3()
      .fromBufferAttribute(positions, column)
      .lerp(new Vector3().fromBufferAttribute(positions, column + 1), 0.5)
      .addScaledVector(direction, -8);
    const renderedHit = new Raycaster(origin, direction, 0, 20).intersectObject(
      face,
    )[0];
    expect(renderedHit).toBeDefined();
    const hit = terrain.wallRayDistance(
      origin.x,
      origin.y,
      origin.z,
      direction.x,
      direction.y,
      direction.z,
      20,
      wall.centerS - 4,
    );
    expect(Math.abs(hit - renderedHit.distance)).toBeLessThan(0.005);
  }
});

test('seeded slabs cover the floor, banks and ceiling, including the angular seam', () => {
  const terrain = cave(4);
  const walls = Array.from(
    { length: 36 },
    (_, i) => terrain.featureCell(i + 8).wall,
  ).filter((w) => w !== null);
  expect(walls.some((w) => Math.abs(w!.angle - Math.PI) < 0.4)).toBe(true);
  expect(walls.some((w) => Math.abs(w!.angle - Math.PI / 2) < 0.6)).toBe(true);
  expect(
    walls.some((w) => w!.angle < 0.6 || w!.angle > Math.PI * 2 - 0.6),
  ).toBe(true);
  expect(
    new Set(walls.map((w) => Math.round(w!.angleWidth * 100))).size,
  ).toBeGreaterThan(4);
});

test('wall and ceiling decks protrude beyond the actual rendered rock', () => {
  const scene = new Scene();
  const terrain = cave(4, scene);
  const walls = [terrain.featureCell(25).wall!, terrain.featureCell(26).wall!];
  expect(walls.every(Boolean)).toBe(true);
  walls[0].angle = 0.1; // Cross the seam at the ceiling.
  walls[1].angle = Math.PI / 2;
  terrain.update(0, 7900);
  scene.updateMatrixWorld(true);
  const rocks = scene.children.filter(
    (o): o is Mesh =>
      o instanceof Mesh && o.material.type === 'MeshLambertMaterial',
  );
  for (const wall of walls) {
    const mesh = scene.children.find(
      (o) => o.userData.wallFront === wall.centerS,
    ) as Mesh;
    const positions = mesh.geometry.getAttribute('position');
    const arcs = [wall.centerS];
    const step = config.CAVE_SEGMENT_LENGTH / config.CAVE_CHUNK_SAMPLES;
    const back = wall.centerS + wall.halfLen * 2;
    for (
      let s = (Math.floor(wall.centerS / step) + 1) * step;
      s < back - 1e-7;
      s += step
    )
      arcs.push(s);
    arcs.push(back);
    for (let row = 0; row < arcs.length; row++) {
      const center = terrain.centerAt(arcs[row], { x: 0, y: 0, z: 0 });
      const origin = new Vector3(center.x, center.y, center.z);
      for (let column = 0; column < mesh.userData.wallColumns; column++) {
        const deck = new Vector3().fromBufferAttribute(
          positions,
          (row * mesh.userData.wallColumns + column) * 2 + 1,
        );
        const direction = deck.clone().sub(origin).normalize();
        const rock = new Raycaster(origin, direction, 0, 180).intersectObjects(
          rocks,
        )[0];
        expect(rock).toBeDefined();
        expect(rock.distance - origin.distanceTo(deck)).toBeGreaterThan(5);
        const inward = direction.clone().negate();
        const point = deck.clone().addScaledVector(inward, 0.5);
        const hit = terrain.wallContact(
          point.x,
          point.y,
          point.z,
          config.BALL_RADIUS,
          arcs[row],
        );
        expect(hit).not.toBeNull();
        expect(hit!.dist).toBeLessThan(config.BALL_RADIUS);
      }
    }
  }
});

test('wall rays remain valid after old centerline chunks have been trimmed', () => {
  const terrain = cave(4);
  terrain.update(7000, 8500);
  const spawn = terrain.groundSpawn(7300);
  expect(() =>
    terrain.wallRayDistance(spawn.x, spawn.y, spawn.z, 0, 0, 1, 336, spawn.s),
  ).not.toThrow();
});

test('seed 4 clear space above curved slabs has no sphere or camera contacts', () => {
  const scene = new Scene();
  const terrain = cave(4, scene);
  terrain.update(0, 3900);
  for (const [cell, lead, lift] of [
    [9, 8, 20],
    [10, 9, 20],
    [11, 5, 15],
  ]) {
    const wall = terrain.featureCell(cell).wall!;
    const s = wall.centerS - lead;
    const spawn = terrain.groundSpawn(s);
    const point = new Vector3(spawn.x, spawn.y + lift, spawn.z);
    const mesh = scene.children.find(
      (o) => o.userData.wallFront === wall.centerS,
    ) as Mesh;
    const positions = mesh.geometry.getAttribute('position');
    const indices = mesh.geometry.index!;
    const triangle = new Triangle();
    const closest = new Vector3();
    let distance = Infinity;
    for (let i = 0; i < indices.count; i += 3) {
      triangle.a.fromBufferAttribute(positions, indices.getX(i));
      triangle.b.fromBufferAttribute(positions, indices.getX(i + 1));
      triangle.c.fromBufferAttribute(positions, indices.getX(i + 2));
      triangle.closestPointToPoint(point, closest);
      distance = Math.min(distance, point.distanceTo(closest));
    }
    // Independently verify both skin clearance and that the point is above
    // the rendered solid. Previously the closest face's plane called it inside.
    expect(distance).toBeGreaterThan(config.BALL_RADIUS + 2);
    expect(
      new Raycaster(point, new Vector3(0, 1, 0)).intersectObject(mesh),
    ).toHaveLength(0);
    expect(
      terrain.wallContact(
        point.x,
        point.y,
        point.z,
        config.BALL_RADIUS + 0.02,
        s,
      ),
    ).toBeNull();
    expect(
      terrain.wallRayDistance(point.x, point.y, point.z, 0, 1, 0, 30, s),
    ).toBe(-1);
  }
});

test('a grounded jump passes the curved seed 4 slab without bouncing backward above it', () => {
  const terrain = cave(4);
  const wall = terrain.featureCell(9).wall!;
  const ball = new Ball(terrain.groundSpawn(wall.centerS - 28));
  ball.nextGate = 4;
  ball.controls.moveY = 0;
  for (let frame = 0; frame < 10; frame++) ball.update(terrain);
  expect(ball.grounded).toBe(true);
  const tangent = terrain.tangent(ball.s, { x: 0, y: 0, z: 0 });
  ball.vx = tangent.x * config.BALL_MAX_SPEED;
  ball.vz = tangent.z * config.BALL_MAX_SPEED;
  ball.controls.moveY = 1;
  ball.controls.requestJump();
  for (let frame = 0; frame < 80; frame++) {
    ball.update(terrain);
    expect(
      ball.vx * tangent.x + ball.vy * tangent.y + ball.vz * tangent.z,
    ).toBeGreaterThan(0);
  }
  expect(ball.damaged).toBe(false);
  expect(ball.s).toBeGreaterThan(wall.centerS + wall.halfLen * 2 + ball.radius);
});
