import { expect, test } from 'bun:test';
import { Color, Mesh, MeshStandardMaterial, Scene } from 'three';
import { Cave } from '../src/games/cave/classes/Cave';
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
    const band = config.CAVE_BAND_HALF_WIDTH;
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
        const gapLeft = (col.angle - half - (Math.PI - band)) * config.CAVE_RADIUS;
        const gapRight =
          ((Math.PI + band) - (col.angle + half)) * config.CAVE_RADIUS;
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
        const landingTo = cell.ramp.centerS + cell.ramp.height / 0.35 + 60;
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

test('a boosted line exists: pads and platforms appear on the early cave', () => {
  const terrain = cave(7);
  let pads = 0;
  let platforms = 0;
  for (let i = 0; i < 12; i++) {
    const cell = terrain.featureCell(i);
    if (cell.boost) pads++;
    if (cell.ramp) platforms++;
  }
  expect(pads).toBeGreaterThan(0);
  expect(platforms).toBeGreaterThan(0);
  expect(terrain.boostAt(terrain.featureCell(2).boost?.centerS ?? 0, Math.PI)).toBeGreaterThan(0.2);
});

test('walls span a fraction of their section and stop a rolling ball', () => {
  for (const seed of [7, 40]) {
    const terrain = cave(seed);
    let wall: NonNullable<
      ReturnType<Cave['featureCell']>['wall']
    > | null = null;
    for (let i = 1; i < 24 && !wall; i++) {
      const cell = terrain.featureCell(i);
      if (cell.wall) wall = cell.wall;
    }
    if (!wall) continue;
    const fraction = (wall.halfLen * 2) / config.CAVE_SEGMENT_LENGTH;
    expect(fraction).toBeGreaterThanOrEqual(
      config.CAVE_WALL_MIN_FRACTION - 1e-9,
    );
    expect(fraction).toBeLessThanOrEqual(
      config.CAVE_WALL_MAX_FRACTION + 1e-9,
    );

    const front = wall.centerS;
    const ball = new Ball(terrain.groundSpawn(front - 20));
    ball.controls.moveY = 1;
    for (let f = 0; f < 240 && !ball.damaged; f++) ball.update(terrain);
    expect(ball.s).toBeLessThanOrEqual(front + 1);
  }
});

test('variation compounds with depth: deeper cells are wilder', () => {
  const shallow = { volatility: 0, cells: 0, features: 0 };
  const deep = { volatility: 0, cells: 0, features: 0 };
  for (const seed of [3, 11, 42, 77]) {
    const terrain = cave(seed);
    expect(terrain.depthAt(config.SPAWN_OFFSET)).toBe(0);
    expect(
      terrain.depthAt(config.SPAWN_OFFSET + config.CAVE_DEPTH_RAMP),
    ).toBe(1);
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

test('wall obstacles include explicit vertical face geometry', () => {
  const scene = new Scene();
  const terrain = cave(7, scene);
  terrain.update(0, config.CAVE_SEGMENT_LENGTH * 12);

  const faces = scene.children.filter(
    (object): object is Mesh =>
      object instanceof Mesh &&
      object.geometry.getAttribute('position')?.count === 66,
  );
  expect(faces.length).toBeGreaterThan(0);

  const face = faces[0].geometry.getAttribute('position');
  let tallest = 0;
  for (let vertex = 0; vertex < face.count; vertex += 2) {
    expect(face.getX(vertex)).toBeCloseTo(face.getX(vertex + 1), 4);
    expect(face.getZ(vertex)).toBeCloseTo(face.getZ(vertex + 1), 4);
    tallest = Math.max(tallest, face.getY(vertex + 1) - face.getY(vertex));
  }
  expect(tallest).toBeGreaterThan(1.5);
});

test('the wall top mesh has matching landing collision across its section span', () => {
  const scene = new Scene();
  const terrain = cave(7, scene);
  terrain.update(0, config.CAVE_SEGMENT_LENGTH * 12);

  let wall: NonNullable<ReturnType<Cave['featureCell']>['wall']> | null = null;
  for (let i = 0; i < 12 && !wall; i++) wall = terrain.featureCell(i).wall;
  expect(wall).not.toBeNull();

  const middleS = wall!.centerS + wall!.halfLen;
  const expectedTop = terrain.wallSurfaceAt(middleS, wall!.angle);
  expect(expectedTop).not.toBeNull();
  const spawn = terrain.groundSpawn(middleS);
  const ball = new Ball({
    ...spawn,
    y: expectedTop! + config.BALL_RADIUS + 0.05,
  });
  ball.vy = -1;
  ball.update(terrain);
  const collisionTop = terrain.wallSurfaceAt(ball.s, ball.a);
  expect(collisionTop).not.toBeNull();
  expect(ball.y - config.BALL_RADIUS).toBeCloseTo(collisionTop!, 1);

  const wallTopSegments = Math.max(4, Math.ceil((wall!.halfLen * 2) / 8));
  const expectedVertices = (wallTopSegments + 1) * 33;
  const expectedMeshY = terrain.wallSurfaceAt(middleS, wall!.angle)!;
  const matchingTopMeshes = scene.children.filter((object): object is Mesh => {
    if (!(object instanceof Mesh)) return false;
    const material = object.material;
    return (
      material instanceof MeshStandardMaterial &&
      material.color.equals(new Color(...config.CAVE_WALL_COLOR)) &&
      object.geometry.getAttribute('position')?.count === expectedVertices
    );
  });
  expect(matchingTopMeshes.length).toBeGreaterThan(0);
  const middleVertex =
    Math.floor(wallTopSegments / 2) * 33 + 16;
  expect(
    matchingTopMeshes.some((mesh) =>
      Math.abs(
        mesh.geometry.getAttribute('position').getY(middleVertex) - expectedMeshY,
      ) < 1e-4,
    ),
  ).toBe(true);
});

test('a ball cannot stay inside a wall slab', () => {
  const terrain = cave(7);
  let wall: NonNullable<ReturnType<Cave['featureCell']>['wall']> | null = null;
  for (let i = 0; i < 12 && !wall; i++) wall = terrain.featureCell(i).wall;
  expect(wall).not.toBeNull();

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

  const ball = new Ball(terrain.groundSpawn(wall!.centerS - 0.5));
  ball.controls.moveY = 1;
  ball.update(terrain);
  expect(ball.s).toBeLessThanOrEqual(wall!.centerS - config.BALL_RADIUS + 0.05);
  expect(terrain.wallSurfaceAt(ball.s, ball.a)).toBeNull();
});
