import * as THREE from 'three';
import { mulberry32 } from '../../../utilities/math';
import { config } from './Config';
import { ensureDrivablePath } from './PathCheck';

/** plain 3D point, no allocation churn in the query hot paths */
interface Pt {
  x: number;
  y: number;
  z: number;
}

/** one streamed segment: control points at both ends plus precomputed
 *  samples of the centerline, its frame and its base radius */
interface ChunkData {
  index: number;
  /** (cx,cy,cz, tx,ty,tz, nx,ny,nz, bx,by,bz, baseRadius) per sample */
  samples: Float32Array;
  mesh: THREE.Mesh | null;
  gates: THREE.Mesh[];
  /** glowing boost items floating over this chunk's boost pads */
  items: THREE.Mesh[];
}

/** one deterministic terrain feature cell: how rough the stretch is and which
 *  structures sit on it. Cached per cell so the radius hot path only reads
 *  numbers instead of re-hashing. */
export interface FeatureCell {
  /** 0..1 roughness of the stretch; the jump-ramp odds scale with it */
  volatility: number;
  /** smooth raised lane through the rough ground, or null */
  road: {
    centerS: number;
    halfLen: number;
    centerA: number;
    halfA: number;
    rise: number;
  } | null;
  /** rock columns rising off the floor */
  columns: {
    centerS: number;
    halfLen: number;
    angle: number;
    angleWidth: number;
    height: number;
    /** a full-height column spans floor to wall: it cannot be jumped */
    full: boolean;
  }[];
  /** a single launch ramp whose lip sits just before the volatile stretch */
  ramp: {
    centerS: number;
    halfLen: number;
    angle: number;
    angleWidth: number;
    height: number;
  } | null;
  /** boost pad on the driving band: a glowing patch that pushes the ball */
  boost: {
    centerS: number;
    halfLen: number;
    centerA: number;
    halfA: number;
  } | null;
}

const SAMPLES = config.CAVE_CHUNK_SAMPLES;
const SIDES = config.CAVE_SIDES;
const LEN = config.CAVE_SEGMENT_LENGTH;
const PER = LEN / SAMPLES;
const TWO_PI = Math.PI * 2;
const NOISE_CELLS = Math.round(TWO_PI / config.CAVE_BUMP_ANGLE);

/** result of the body/wheel collision query: the nearest point of the
 *  analytic surface to a point, with its radial normal */
export interface RadialHit {
  s: number;
  a: number;
  /** signed radial distance: point-to-centerline minus the local radius,
   *  negative inside the cave, positive outside */
  dist: number;
  /** radial outward normal (toward the wall) at the hit */
  nx: number;
  ny: number;
  nz: number;
  /** the surface point itself */
  hx: number;
  hy: number;
  hz: number;
}

/**
 * The cave. A tube swept along a seeded 3D centerline: the centerline is a
 * chain of cubic Hermite segments (one per CAVE_SEGMENT_LENGTH), each turning
 * the direction by a seeded random angle, and the radius is a base plus long
 * seeded waves plus a fine value-noise skin, so the same seed always yields
 * the same cave. Everything the game queries (rays, collisions, spawn, gates)
 * is answered by the analytic tube, the three.js mesh is only its sampled
 * rendering, and old segments are disposed in real time as the cars pass.
 */
export class Cave {
  public seed: number;
  public difficulty: number;
  /** arc position of every gate, gate i sits at (i + 1) * GATE_SPACING */
  public gatePositions: number[] = [];
  /** gate meshes by gate index, created with the chunk that owns the gate */
  public gateMeshes: (THREE.Mesh | null)[] = [];

  /** active chunks with their meshes, keyed by chunk index */
  #chunks = new Map<number, ChunkData>();
  /** centerline control points, grown one per chunk and trimmed on removal */
  #control: { p: Pt; d: Pt }[] = [];
  /** chunk index of #control[0], the array is trimmed as chunks are removed */
  #controlOffset = 0;
  /** long radius waves, seeded from the cave seed only so they are
   *  continuous over the whole cave */
  #waves: { freq: number; amp: number; phase: number }[] = [];
  #noiseSalt: number;
  #scene: THREE.Scene;
  #material: THREE.MeshLambertMaterial;
  #rockTexture: THREE.CanvasTexture;
  #gateMaterial: THREE.MeshBasicMaterial;
  #gateNextMaterial: THREE.MeshBasicMaterial;
  #boostItemGeometry: THREE.IcosahedronGeometry;
  #boostItemMaterial: THREE.MeshBasicMaterial;
  /** animation clock for the spinning boost items, advanced by update() */
  #time = 0;

  constructor(seed: number, scene: THREE.Scene) {
    this.seed = seed;
    this.difficulty =
      Math.min(1, Math.max(0, seed) / config.CAVE_DIFFICULTY_SEED_BASE) *
      config.CAVE_DIFFICULTY;

    const rng = mulberry32(seed >>> 0);
    for (let k = 0; k < config.CAVE_HARMONICS; k++) {
      const wavelength = 250 + rng() * 650;
      this.#waves.push({
        freq: TWO_PI / wavelength,
        amp:
          (0.25 + rng() * 0.75) *
          (config.CAVE_WAVINESS / config.CAVE_HARMONICS) *
          (1 + 0.7 * this.difficulty),
        phase: rng() * TWO_PI,
      });
    }
    this.#noiseSalt = (seed ^ 0x51ab3f) >>> 0 || 1;

    for (let i = 0; i < config.GATES_PER_SEED; i++)
      this.gatePositions.push((i + 1) * config.GATE_SPACING);
    this.gateMeshes = new Array(config.GATES_PER_SEED).fill(null);

    this.#scene = scene;
    this.#rockTexture = this.#createRockTexture();
    this.#rockTexture.wrapS = THREE.RepeatWrapping;
    this.#rockTexture.wrapT = THREE.RepeatWrapping;
    this.#rockTexture.repeat.set(4, 12);
    this.#material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(config.CAVE_COLOR),
      map: this.#rockTexture,
      vertexColors: true,
      side: THREE.BackSide,
    });
    this.#gateMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.GATE_COLORS[0]),
      transparent: true,
      opacity: 0.28,
    });
    this.#gateNextMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.GATE_NEXT_COLOR),
      transparent: true,
      opacity: 0.85,
    });
    this.#boostItemGeometry = new THREE.IcosahedronGeometry(
      config.CAVE_BOOST_ITEM_RADIUS,
      1,
    );
    this.#boostItemMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(config.CAVE_BOOST_ITEM_COLOR),
      transparent: true,
      opacity: 0.9,
    });

    this.#generateControl(0);
    ensureDrivablePath(
      this,
      config.SPAWN_OFFSET +
        config.GATES_PER_SEED * config.GATE_SPACING +
        config.CAVE_FEATURE_CELL * 2,
    );
  }

  /** deterministic 32-bit mix of the seed and a chunk index */
  #hash(index: number) {
    let h = (this.seed | 0) ^ Math.imul(index | 0, 0x9e3779b9);
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  /** grow the control line: the next chunk starts where this one ends, in
   *  the current direction, and turns it by a seeded random angle. A y
   *  damping keeps the cave from ever diving straight down. */
  #generateControl(index: number) {
    const local = index - this.#controlOffset;
    if (local < this.#control.length) return;
    let p: Pt;
    let d: Pt;
    if (index === 0) {
      p = { x: 0, y: 0, z: 0 };
      d = { x: 0, y: 0, z: -1 };
    } else {
      const prev = this.#control[local - 1];
      const rng = mulberry32(this.#hash(index));
      // a random rotation axis, rerolled when it lands near zero
      let ax = rng() * 2 - 1;
      let ay = rng() * 2 - 1;
      let az = rng() * 2 - 1;
      const alen = Math.sqrt(ax * ax + ay * ay + az * az);
      if (alen < 1e-3) {
        ax = 1;
        ay = 0;
        az = 0;
      } else {
        ax /= alen;
        ay /= alen;
        az /= alen;
      }
      const maxAngle =
        config.CAVE_TURN_BASE + config.CAVE_TURN_GROWTH * this.difficulty;
      const angle = maxAngle * (0.35 + 0.65 * rng());
      d = { x: 0, y: 0, z: 0 };
      rotateAroundAxis(prev.d, ax, ay, az, angle, d);
      d.y *= 0.9; // gentle: the cave undulates, it never plunges
      const dlen = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z) || 1;
      d.x /= dlen;
      d.y /= dlen;
      d.z /= dlen;
      p = {
        x: prev.p.x + prev.d.x * LEN,
        y: prev.p.y + prev.d.y * LEN,
        z: prev.p.z + prev.d.z * LEN,
      };
    }
    this.#control.push({ p, d });
  }

  #ensureControl(index: number) {
    while (index - this.#controlOffset >= this.#control.length)
      this.#generateControl(this.#controlOffset + this.#control.length);
  }

  #controlAt(i: number) {
    return this.#control[i - this.#controlOffset];
  }

  /** Hermite centerline point of chunk i at normalized t, into out */
  #centerInChunk(i: number, t: number, out: Pt) {
    this.#ensureControl(i + 1);
    const a = this.#controlAt(i);
    const b = this.#controlAt(i + 1);
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    out.x = h00 * a.p.x + h10 * a.d.x * LEN + h01 * b.p.x + h11 * b.d.x * LEN;
    out.y = h00 * a.p.y + h10 * a.d.y * LEN + h01 * b.p.y + h11 * b.d.y * LEN;
    out.z = h00 * a.p.z + h10 * a.d.z * LEN + h01 * b.p.z + h11 * b.d.z * LEN;
  }

  /** Hermite centerline tangent (normalized) of chunk i at normalized t */
  #tangentInChunk(i: number, t: number, out: Pt) {
    this.#ensureControl(i + 1);
    const a = this.#controlAt(i);
    const b = this.#controlAt(i + 1);
    const t2 = t * t;
    let dx =
      (6 * t2 - 6 * t) * a.p.x +
      (3 * t2 - 4 * t + 1) * a.d.x * LEN +
      (-6 * t2 + 6 * t) * b.p.x +
      (3 * t2 - 2 * t) * b.d.x * LEN;
    let dy =
      (6 * t2 - 6 * t) * a.p.y +
      (3 * t2 - 4 * t + 1) * a.d.y * LEN +
      (-6 * t2 + 6 * t) * b.p.y +
      (3 * t2 - 2 * t) * b.d.y * LEN;
    let dz =
      (6 * t2 - 6 * t) * a.p.z +
      (3 * t2 - 4 * t + 1) * a.d.z * LEN +
      (-6 * t2 + 6 * t) * b.p.z +
      (3 * t2 - 2 * t) * b.d.z * LEN;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    out.x = dx / len;
    out.y = dy / len;
    out.z = dz / len;
  }

  /** A small generated rock texture keeps the cave from reading as a bare
   *  checkerboard of lit triangles while remaining deterministic/offline. */
  #createRockTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return new THREE.CanvasTexture(canvas);
    const image = context.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        let h =
          (x * 374761393 + y * 668265263 + (this.seed + 17) * 1442695041) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        const noise = ((h ^ (h >>> 16)) >>> 0) / 4294967295;
        const shade = Math.round(48 + noise * 38);
        const index = (y * canvas.width + x) * 4;
        image.data[index] = shade;
        image.data[index + 1] = Math.round(shade * 1.05);
        image.data[index + 2] = Math.round(shade * 1.1);
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /** terrain starts deliberately calm at the mouth, then eases into its
   *  full procedural roughness so the player has time to get grounded. */
  #terrainProgress(s: number) {
    const t = Math.max(
      0,
      Math.min(1, (s - config.SPAWN_OFFSET) / config.CAVE_TERRAIN_RAMP),
    );
    return t * t * (3 - 2 * t);
  }

  /** the long waves of the radius, continuous over the whole cave */
  #waveRadius(s: number) {
    let r = config.CAVE_RADIUS;
    const progress = this.#terrainProgress(s);
    for (let i = 0; i < this.#waves.length; i++) {
      const w = this.#waves[i];
      r += progress * w.amp * Math.sin(w.freq * s + w.phase);
    }
    return r;
  }

  #angleDistance(a: number, b: number) {
    let d = Math.abs(a - b) % TWO_PI;
    return d > Math.PI ? TWO_PI - d : d;
  }

  #smoothPulse(s: number, center: number, halfWidth: number) {
    const t = 1 - Math.abs(s - center) / halfWidth;
    if (t <= 0) return 0;
    return t * t * (3 - 2 * t);
  }

  /** cached feature descriptors, one per CAVE_FEATURE_CELL, rebuilt on
   *  demand and trimmed with the meshed window like the floor profiles */
  #featureCells = new Map<number, FeatureCell>();

  /** cached feature cell, exposed for the path check and debug tooling */
  featureCell(index: number): FeatureCell {
    return this.#featureCell(index);
  }

  /** Deterministic descriptor of one terrain feature cell. A seeded RNG makes
   *  the draws independent: volatility drives how likely a single jump ramp is
   *  placed just before the stretch, columns and roads are separate draws. */
  #featureCell(index: number): FeatureCell {
    const cached = this.#featureCells.get(index);
    if (cached) return cached;
    const rng = mulberry32(this.#hash(index * 7 + 11) || 1);
    const center = index * config.CAVE_FEATURE_CELL;
    const featureS = center + 70 + rng() * 140;

    const columns: FeatureCell['columns'] = [];
    if (rng() < config.CAVE_COLUMN_CHANCE) {
      const count = rng() < 0.45 ? 1 : 2;
      for (let k = 0; k < count; k++) {
        const spread = count === 1 ? 0 : (k - 0.5) * (24 + rng() * 70);
        columns.push({
          centerS: featureS + spread,
          halfLen: 20 + rng() * 18,
          // In-band columns sit off the center line (never dead ahead) so a
          // car holding the line weaves past them; the rest grow on banks.
          angle:
            rng() < config.CAVE_COLUMN_IN_BAND_CHANCE
              ? Math.PI +
                (rng() < 0.5 ? -1 : 1) * (0.12 + rng() * 0.13)
              : Math.PI + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.55),
          angleWidth: 0.13 + rng() * 0.12,
          height:
            config.CAVE_COLUMN_MIN +
            rng() * (config.CAVE_COLUMN_MAX - config.CAVE_COLUMN_MIN),
          full: rng() < config.CAVE_COLUMN_FULL_HEIGHT_CHANCE,
        });
      }
    }

    let road: FeatureCell['road'] = null;
    if (rng() < config.CAVE_ROAD_CHANCE) {
      road = {
        centerS: center + 40 + rng() * (config.CAVE_FEATURE_CELL - 80),
        halfLen: (config.CAVE_ROAD_LENGTH / 2) * (0.7 + 0.3 * rng()),
        // Mostly on the driving line, so a spawn on the center of the cave
        // lands on the lane instead of its lateral edge.
        centerA: Math.PI + (rng() - 0.5) * 0.3,
        halfA: config.CAVE_ROAD_WIDTH * (0.9 + 0.4 * rng()),
        rise: config.CAVE_ROAD_RISE * (0.7 + 0.3 * rng()),
      };
    }
    let boost: FeatureCell['boost'] = null;
    if (rng() < config.CAVE_BOOST_CHANCE) {
      boost = {
        centerS: center + 20 + rng() * (config.CAVE_FEATURE_CELL - 40),
        halfLen: 30 + rng() * 30,
        centerA: Math.PI + (rng() - 0.5) * 0.2,
        halfA: 0.18 + rng() * 0.12,
      };
    }

    // Volatility is the roughness of the stretch: columns make it hard, a
    // smooth road makes it easy, and the base draw keeps it varied.
    let volatility = 0.2 + 0.8 * rng();
    if (columns.length > 0)
      volatility = Math.max(volatility, 0.55 + 0.45 * rng());
    if (road) volatility *= 0.55;

    // A single jump ramp, placed just before the volatile stretch and more
    // probable the rougher that stretch is.
    let ramp: FeatureCell['ramp'] = null;
    if (rng() < volatility * config.CAVE_RAMP_CHANCE) {
      const targetS = columns.length > 0 ? columns[0].centerS : featureS;
      ramp = {
        centerS: Math.max(
          center + 8,
          targetS - config.CAVE_RAMP_LEAD - rng() * 30,
        ),
        halfLen: config.CAVE_RAMP_LENGTH / 2,
        angle: Math.PI + (rng() - 0.5) * 0.5,
        angleWidth: 0.32 + rng() * 0.3,
        height: config.CAVE_RAMP_HEIGHT * (0.6 + 0.4 * rng()),
      };
    }

    const cell: FeatureCell = { volatility, road, columns, ramp, boost };
    this.#featureCells.set(index, cell);
    return cell;
  }

  /** Smooth raised road lane mask in 0..1. Damps the bump noise where it is
   *  high, so a road chunk genuinely reads and drives as smooth ground. */
  #roadInfluence(s: number, a: number) {
    const cellIndex = Math.floor(s / config.CAVE_FEATURE_CELL);
    let influence = 0;
    for (let i = cellIndex - 1; i <= cellIndex + 1; i++) {
      const road = this.#featureCell(i).road;
      if (!road) continue;
      const along = this.#smoothPulse(s, road.centerS, road.halfLen);
      if (along <= 0) continue;
      const acrossRaw = 1 - this.#angleDistance(a, road.centerA) / road.halfA;
      if (acrossRaw <= 0) continue;
      const across = acrossRaw * acrossRaw * (3 - 2 * acrossRaw);
      influence = Math.max(influence, along * across);
    }
    return influence;
  }

  /** Inward radial cuts make raised road lanes, rock columns and jump ramps.
   *  They are part of the analytic radius, so rendering, rays and wheel
   *  contact all agree without a second obstacle system. */
  #featureRadiusDelta(s: number, a: number) {
    const progress = this.#terrainProgress(s);
    if (progress <= 0) return 0;

    const cellIndex = Math.floor(s / config.CAVE_FEATURE_CELL);
    let delta = 0;
    for (let i = cellIndex - 1; i <= cellIndex + 1; i++) {
      const cell = this.#featureCell(i);
      for (const column of cell.columns) {
        const along = this.#smoothPulse(s, column.centerS, column.halfLen);
        if (along <= 0) continue;
        const angular = Math.exp(
          -(this.#angleDistance(a, column.angle) ** 2) /
            (2 * column.angleWidth * column.angleWidth),
        );
        // A full-height column cuts down to the floor clamp, so it spans
        // the whole cave: it cannot be jumped, only gone around.
        const cut = column.full
          ? this.#waveRadius(s) - config.CAVE_MIN_RADIUS + 40
          : column.height;
        delta -= progress * along * angular * cut;
      }

      const ramp = cell.ramp;
      if (!ramp) continue;
      // A climb to a flat lip, then a smooth back slope: the launch comes
      // from leaving the lip at speed, not from a sharp back edge, so a
      // slow car rolls over the lip instead of pivoting over it.
      const span = ramp.halfLen * 2;
      const back = ramp.height / 0.35;
      const f = (s - (ramp.centerS - span)) / span;
      if (s > ramp.centerS + back || f <= 0) continue;
      // Hold the top flat over the last stretch so the lip reads as a real
      // jump platform instead of a single ridge.
      const g = f >= 0.8 ? 1 : f / 0.8;
      let along = g * g * (3 - 2 * g);
      if (s > ramp.centerS) {
        const b = 1 - (s - ramp.centerS) / back;
        along *= b * b * (3 - 2 * b);
      }
      // Plateau across the whole band (the deck never crowns it and tips
      // a car driving beside its center), falling away into the banks.
      const angular = this.#plateauAcross(
        a,
        config.CAVE_BAND_HALF_WIDTH * 0.9,
        config.CAVE_BAND_HALF_WIDTH + 0.25,
      );
      delta -= progress * along * angular * ramp.height;
    }
    return delta;
  }

  /** one corner of the bump noise grid, deterministic in (i, j, seed) */
  #noiseCorner(i: number, j: number) {
    let h =
      (this.#noiseSalt | 0) ^
      Math.imul(i | 0, 0x85ebca6b) ^
      Math.imul(j | 0, 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 13), 0x2f1b66d9);
    h ^= h >>> 16;
    return ((h >>> 0) % 4096) / 4096;
  }

  /** fine bumpy skin: value noise on an (arc, angle) grid. The angle wraps
   *  on an integer number of cells so the seam of the tube is seamless. */
  #bump(s: number, a: number) {
    const u = s / config.CAVE_BUMP_WAVE;
    const v = (((a < 0 ? a + TWO_PI : a) / TWO_PI) * NOISE_CELLS) % NOISE_CELLS;
    const u0 = Math.floor(u);
    const v0 = Math.floor(v);
    const fu = u - u0;
    const fv = v - v0;
    const su = fu * fu * (3 - 2 * fu);
    const sv = fv * fv * (3 - 2 * fv);
    const v1 = (v0 + 1) % NOISE_CELLS;
    const n00 = this.#noiseCorner(u0, v0);
    const n10 = this.#noiseCorner(u0 + 1, v0);
    const n01 = this.#noiseCorner(u0, v1);
    const n11 = this.#noiseCorner(u0 + 1, v1);
    const nx0 = n00 + (n10 - n00) * su;
    const nx1 = n01 + (n11 - n01) * su;
    const n = nx0 + (nx1 - nx0) * sv;
    const amp = (16 + 24 * this.difficulty) * this.#terrainProgress(s);
    return (n - 0.5) * 2 * amp;
  }

  /** Smooth 1..0 mask of the flat driving band centered on the cave floor
   *  (a = PI): one at the center, zero at the band edge and beyond. */
  #bandInfluence(a: number) {
    const d = this.#angleDistance(a, Math.PI);
    if (d >= config.CAVE_BAND_HALF_WIDTH) return 0;
    const t = 1 - d / config.CAVE_BAND_HALF_WIDTH;
    return t * t * (3 - 2 * t);
  }

  /** Steep side walls: outside the driving band the floor is raised
   *  quadratically toward the tube wall, so most of the cross-section stays
   *  a flat plateau and the sides read as cliffs. */
  #bankRise(a: number) {
    const d = this.#angleDistance(a, Math.PI);
    const x = d - config.CAVE_BAND_HALF_WIDTH;
    if (x <= 0) return 0;
    const edge = Math.PI / 2 - config.CAVE_BAND_HALF_WIDTH;
    const t = Math.min(1, x / edge);
    return config.CAVE_BANK_RISE * t * t;
  }

  /** Plateau across the driving band: one over the whole inner span, then
   *  a smooth fall to zero just past the band edge, into the banks. Used
   *  by band-wide features (the launch ramp) so their deck never crowns
   *  the band and tips a car driving beside its center. */
  #plateauAcross(a: number, inner: number, outer: number) {
    const d = this.#angleDistance(a, Math.PI);
    if (d <= inner) return 1;
    if (d >= outer) return 0;
    const t = (d - inner) / (outer - inner);
    return 1 - t * t * (3 - 2 * t);
  }

  /** 0..1 ramp deck mask (climb, lip and back slope) for the mesh tint */
  #rampInfluence(s: number, a: number) {
    const cellIndex = Math.floor(s / config.CAVE_FEATURE_CELL);
    let influence = 0;
    for (let i = cellIndex - 1; i <= cellIndex + 1; i++) {
      const ramp = this.#featureCell(i).ramp;
      if (!ramp) continue;
      const span = ramp.halfLen * 2;
      const back = ramp.height / 0.35;
      const f = (s - (ramp.centerS - span)) / span;
      if (s > ramp.centerS + back || f <= 0) continue;
      const g = f >= 0.8 ? 1 : f / 0.8;
      let along = g * g * (3 - 2 * g);
      if (s > ramp.centerS) {
        const b = 1 - (s - ramp.centerS) / back;
        along *= b * b * (3 - 2 * b);
      }
      const angular = this.#plateauAcross(
        a,
        config.CAVE_BAND_HALF_WIDTH * 0.9,
        config.CAVE_BAND_HALF_WIDTH + 0.25,
      );
      influence = Math.max(influence, along * angular);
    }
    return influence;
  }

  /** Original rock profile, before the directional floor ramp pass. The flat
   *  driving band keeps no bump skin and only a sliver of the long waves;
   *  outside it the floor rises steeply into the side walls. A road lane
   *  raises the floor and damps the bump noise, so it drives smooth. */
  #rawRadius(s: number, a: number) {
    const road = this.#roadInfluence(s, a);
    const band = this.#bandInfluence(a);
    // The band keeps only a sliver of the long waves; the rest of the wave
    // breathing ramps back in over the bank span (mirroring the bank's own
    // quadratic), so the ledge between the flat plateau and the breathing
    // tube is a gentle shoulder instead of a step that tips slow cars.
    const d = this.#angleDistance(a, Math.PI);
    let waveKeep = 1 - config.CAVE_BAND_WAVE_DAMP;
    const x = d - config.CAVE_BAND_HALF_WIDTH;
    if (x > 0) {
      const edge = Math.PI / 2 - config.CAVE_BAND_HALF_WIDTH;
      waveKeep = Math.min(
        1,
        waveKeep + (1 - waveKeep) * ((x / edge) * (x / edge)),
      );
    }
    const wave =
      config.CAVE_RADIUS +
      (this.#waveRadius(s) - config.CAVE_RADIUS) * waveKeep;
    const bump = this.#bump(s, a) * (1 - road) * (1 - band);
    const r =
      wave +
      bump +
      this.#featureRadiusDelta(s, a) -
      road * config.CAVE_ROAD_RISE * this.#terrainProgress(s) -
      this.#bankRise(a) * this.#terrainProgress(s);
    return r < config.CAVE_MIN_RADIUS ? config.CAVE_MIN_RADIUS : r;
  }

  /** Floor profiles share the mesh grid, so a wheel never meets a hidden
   * six-unit spike between the visible vertices. Each angular lane is kept
   * independent: broadening a ramp along the road does not flatten it across X. */
  #floorProfiles = new Map<number, Float64Array>();

  #floorProfile(index: number) {
    const cached = this.#floorProfiles.get(index);
    if (cached) return cached;
    const rise = config.CAVE_FLOOR_MAX_CLIMB / config.CAVE_VERTICAL_SCALE;
    const stepRise = rise * PER;
    const drop = config.CAVE_FLOOR_MAX_DROP / config.CAVE_VERTICAL_SCALE;
    const stepDrop = drop * PER;
    // Features only subtract radius. This upper bound guarantees that no
    // farther peak can affect this chunk, keeping independently built chunk
    // edges identical regardless of generation/query order.
    const maxRadius =
      config.CAVE_RADIUS +
      this.#waves.reduce((sum, wave) => sum + wave.amp, 0) +
      16 +
      24 * this.difficulty;
    const lookAhead =
      Math.ceil((maxRadius - config.CAVE_MIN_RADIUS) / stepRise) + 1;
    const last = SAMPLES + lookAhead;
    const profile = new Float64Array((SAMPLES + 1) * SIDES);
    for (let k = 0; k < SIDES; k++) {
      const angle = (k * TWO_PI) / SIDES;
      let nextRadius = Infinity;
      for (let j = last; j >= 0; j--) {
        const arc = index * LEN + j * PER;
        // Smaller radius raises the floor. The uphill slope is bounded so a
        // distant peak is climbed gradually; the downhill drop is bounded
        // too, so a slow car noses over a ramp lip or a lane edge instead
        // of flipping over it. Fast cars still leave the ground: the capped
        // drop outruns gravity at driving speed.
        const raw = this.#rawRadius(arc, angle);
        nextRadius =
          nextRadius === Infinity
            ? raw
            : Math.min(
                Math.max(raw, nextRadius - stepDrop),
                nextRadius + stepRise,
              );
        if (j <= SAMPLES) profile[j * SIDES + k] = nextRadius;
      }
    }
    this.#floorProfiles.set(index, profile);
    return profile;
  }

  /** One surface for rendering, sensors, chassis collisions and suspension. */
  radius(s: number, a: number) {
    const floor = Math.max(0, Math.min(1, -Math.cos(a) * 2));
    if (floor === 0) return this.#rawRadius(s, a);
    const arc = Math.max(0, s);
    const index = Math.floor(arc / LEN);
    const profile = this.#floorProfile(index);
    const along = (arc - index * LEN) / PER;
    const row = Math.min(SAMPLES - 1, Math.floor(along));
    const forward = along - row;
    const around = ((((a % TWO_PI) + TWO_PI) % TWO_PI) * SIDES) / TWO_PI;
    const column = Math.floor(around) % SIDES;
    const across = around - Math.floor(around);
    const nextColumn = (column + 1) % SIDES;
    const first =
      profile[row * SIDES + column] * (1 - across) +
      profile[row * SIDES + nextColumn] * across;
    const second =
      profile[(row + 1) * SIDES + column] * (1 - across) +
      profile[(row + 1) * SIDES + nextColumn] * across;
    const ramp = first + (second - first) * forward;
    if (floor === 1) return ramp;
    // Blend into untouched side walls and ceiling outside the driving arc.
    const blend = floor * floor * (3 - 2 * floor);
    return this.#rawRadius(s, a) * (1 - blend) + ramp * blend;
  }

  /** 0..1 jump platform deck influence at (s, a), public for the brain */
  platformAt(s: number, a: number): number {
    return this.#rampInfluence(s, a);
  }

  /** 0..1 boost pad influence at (s, a); the car triggers its push from it */
  boostAt(s: number, a: number): number {
    const progress = this.#terrainProgress(s);
    if (progress <= 0) return 0;
    const cellIndex = Math.floor(s / config.CAVE_FEATURE_CELL);
    let influence = 0;
    for (let i = cellIndex - 1; i <= cellIndex + 1; i++) {
      const pad = this.#featureCell(i).boost;
      if (!pad) continue;
      const along = this.#smoothPulse(s, pad.centerS, pad.halfLen);
      if (along <= 0) continue;
      const acrossRaw = 1 - this.#angleDistance(a, pad.centerA) / pad.halfA;
      if (acrossRaw <= 0) continue;
      influence = Math.max(influence, along * acrossRaw);
    }
    return influence * progress;
  }

  /** centerline point at arc s, into out */
  center(s: number, out: Pt) {
    const i = Math.max(0, Math.floor(s / LEN));
    this.#centerInChunk(i, Math.min(1, (s - i * LEN) / LEN), out);
    return out;
  }

  /** centerline tangent at arc s, normalized, into out */
  tangent(s: number, out: Pt) {
    const i = Math.max(0, Math.floor(s / LEN));
    this.#tangentInChunk(i, Math.min(1, (s - i * LEN) / LEN), out);
    return out;
  }

  /** the tube frame at arc s: tangent, normal and binormal. The normal is a
   *  pure function of the tangent (world-up anchored), so the frame is
   *  continuous across chunk borders without any carried state */
  frame(s: number, outT: Pt, outN: Pt, outB: Pt) {
    this.tangent(s, outT);
    const t = outT;
    // world up unless the tangent points almost straight up or down
    let ux = 0;
    let uy = 1;
    let uz = 0;
    if (Math.abs(t.y) > 0.93) {
      ux = 1;
      uy = 0;
      uz = 0;
    }
    const dot = t.x * ux + t.y * uy + t.z * uz;
    let nx = ux - t.x * dot;
    let ny = uy - t.y * dot;
    let nz = uz - t.z * dot;
    const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= nlen;
    ny /= nlen;
    nz /= nlen;
    outN.x = nx;
    outN.y = ny;
    outN.z = nz;
    // b = t x n, a right-handed frame around the tube
    outB.x = t.y * nz - t.z * ny;
    outB.y = t.z * nx - t.x * nz;
    outB.z = t.x * ny - t.y * nx;
    return { t: outT, n: outN, b: outB };
  }

  /** surface point at (arc, angle), into out */
  surface(s: number, a: number, out: Pt) {
    const t: Pt = { x: 0, y: 0, z: 0 };
    const n: Pt = { x: 0, y: 0, z: 0 };
    const b: Pt = { x: 0, y: 0, z: 0 };
    this.frame(s, t, n, b);
    const c = this.center(s, { x: 0, y: 0, z: 0 });
    const r = this.radius(s, a);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    out.x = c.x + (n.x * ca + b.x * sa) * r;
    out.y = c.y + (n.y * ca + b.y * sa) * r;
    out.z = c.z + (n.z * ca + b.z * sa) * r;
    return out;
  }

  /** scratch frame, reused by every query so a frame allocates nothing */
  #qt: Pt = { x: 0, y: 0, z: 0 };
  #qn: Pt = { x: 0, y: 0, z: 0 };
  #qb: Pt = { x: 0, y: 0, z: 0 };
  #qc: Pt = { x: 0, y: 0, z: 0 };

  /** march a ray against the analytic tube from (o) along the unit (d).
   *  Returns the hit distance, or -1 when the ray stays inside for maxLen.
   *  sHint is the arc position of the ray origin and tHint its tangent, so
   *  the march projects the ray travel onto the cave direction. When out is
   *  given the hit point, the radial normal and the local radius land there
   *  too, ready for the suspension and the embed push-out. */
  castRay(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    maxLen: number,
    sHint: number,
    thx: number,
    thy: number,
    thz: number,
    out?: RadialHit,
  ) {
    const dotDT = dx * thx + dy * thy + dz * thz;
    const step = config.RAY_STEP;
    const q = this;
    for (let t = 0; t < maxLen; t += step) {
      const px = ox + dx * t;
      // Collision space is the unscaled generator space. Convert world Y
      // through the same vertical scale used by the rendered chunk mesh.
      const py =
        oy / config.CAVE_VERTICAL_SCALE + (dy / config.CAVE_VERTICAL_SCALE) * t;
      const pz = oz + dz * t;
      const s = Math.max(0, sHint + t * dotDT);
      q.center(s, q.#qc);
      q.frame(s, q.#qt, q.#qn, q.#qb);
      const wx = px - q.#qc.x;
      const wy = py - q.#qc.y;
      const wz = pz - q.#qc.z;
      const a = Math.atan2(
        wx * q.#qb.x + wy * q.#qb.y + wz * q.#qb.z,
        wx * q.#qn.x + wy * q.#qn.y + wz * q.#qn.z,
      );
      const d = Math.sqrt(wx * wx + wy * wy + wz * wz);
      if (d - q.radius(s, a) > 0) {
        const hitT = Math.max(0.01, t - step / 2);
        if (out) q.#fillRadialAt(hitT, s, a, out);
        return hitT;
      }
    }
    return -1;
  }

  /** write the hit point and radial normal of a ray hit at (hitT, s, a)
   *  into out, reusing the scratch frame the march just filled */
  #fillRadialAt(hitT: number, s: number, a: number, out: RadialHit) {
    out.s = s;
    out.a = a;
    const c = this.#qc;
    const r = this.radius(s, a);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    out.hx = c.x + (this.#qn.x * ca + this.#qb.x * sa) * r;
    out.hy = c.y + (this.#qn.y * ca + this.#qb.y * sa) * r;
    out.hz = c.z + (this.#qn.z * ca + this.#qb.z * sa) * r;
    // radial outward normal at the surface point
    const nx = this.#qn.x * ca + this.#qb.x * sa;
    const ny = this.#qn.y * ca + this.#qb.y * sa;
    const nz = this.#qn.z * ca + this.#qb.z * sa;
    out.nx = nx;
    out.ny = ny;
    out.nz = nz;
    out.dist = hitT;
  }

  /** Short suspension ray, refined to avoid stepping over the rest length.
   * Uses world-space clearance, so it matches the vertically scaled cave. */
  castWheelRay(
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    length: number,
    sHint: number,
    out: RadialHit,
  ) {
    const sample = (t: number) =>
      this.nearestRadial(ox + dx * t, oy + dy * t, oz + dz * t, sHint, out)
        .dist;
    let low = 0;
    if (sample(0) >= 0) return 0;
    for (let high = Math.min(1, length); ; high = Math.min(length, high + 1)) {
      if (sample(high) >= 0) {
        for (let i = 0; i < 7; i++) {
          const mid = (low + high) / 2;
          if (sample(mid) >= 0) high = mid;
          else low = mid;
        }
        sample(high);
        // The terrain varies along and around the cave. Its radial direction
        // alone is not a surface normal on ramps or rock features.
        const arc = out.s;
        const angle = out.a;
        this.surface(arc + 0.25, angle, this.#surfaceA);
        this.surface(Math.max(0, arc - 0.25), angle, this.#surfaceB);
        this.#surfaceT.subVectors(this.#surfaceA, this.#surfaceB);
        this.surface(arc, angle + 0.005, this.#surfaceA);
        this.surface(arc, angle - 0.005, this.#surfaceB);
        this.#surfaceN.subVectors(this.#surfaceA, this.#surfaceB);
        this.#surfaceT.y *= config.CAVE_VERTICAL_SCALE;
        this.#surfaceN.y *= config.CAVE_VERTICAL_SCALE;
        this.#surfaceN.cross(this.#surfaceT).normalize();
        if (
          this.#surfaceN.x * out.nx +
            this.#surfaceN.y * out.ny +
            this.#surfaceN.z * out.nz <
          0
        )
          this.#surfaceN.negate();
        out.nx = this.#surfaceN.x;
        out.ny = this.#surfaceN.y;
        out.nz = this.#surfaceN.z;
        return high;
      }
      if (high === length) return -1;
      low = high;
    }
  }

  #surfaceA = new THREE.Vector3();
  #surfaceB = new THREE.Vector3();
  #surfaceT = new THREE.Vector3();
  #surfaceN = new THREE.Vector3();

  /** nearest point of the analytic surface to (p), searching the arc around
   *  sHint. Fills out with the hit, its signed radial distance and its
   *  radial outward normal. */
  nearestRadial(
    px: number,
    py: number,
    pz: number,
    sHint: number,
    out: RadialHit,
  ) {
    let bestS = sHint;
    let bestA = 0;
    // Choose the nearest centerline point, not the most negative signed
    // clearance. The latter can select a different arc sample and let a car
    // tunnel through a wall when it is outside the local cross-section.
    let bestCenterDistance = Infinity;
    for (let s = sHint - 20; s <= sHint + 20; s += 4) {
      if (s < 0) continue;
      this.center(s, this.#qc);
      this.frame(s, this.#qt, this.#qn, this.#qb);
      const wx = px - this.#qc.x;
      const wy = py / config.CAVE_VERTICAL_SCALE - this.#qc.y;
      const wz = pz - this.#qc.z;
      const a = Math.atan2(
        wx * this.#qb.x + wy * this.#qb.y + wz * this.#qb.z,
        wx * this.#qn.x + wy * this.#qn.y + wz * this.#qn.z,
      );
      const d = Math.sqrt(wx * wx + wy * wy + wz * wz);
      if (d < bestCenterDistance) {
        bestCenterDistance = d;
        bestS = s;
        bestA = a;
      }
    }
    // Refine the closest axis coordinate instead of quantizing contacts to
    // four-unit slices (which made suspension jump as the car moved).
    this.center(bestS, this.#qc);
    this.tangent(bestS, this.#qt);
    bestS = Math.max(
      0,
      bestS +
        (px - this.#qc.x) * this.#qt.x +
        (py / config.CAVE_VERTICAL_SCALE - this.#qc.y) * this.#qt.y +
        (pz - this.#qc.z) * this.#qt.z,
    );
    this.center(bestS, this.#qc);
    this.frame(bestS, this.#qt, this.#qn, this.#qb);
    const wx = px - this.#qc.x;
    const wy = py / config.CAVE_VERTICAL_SCALE - this.#qc.y;
    const wz = pz - this.#qc.z;
    const d = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
    bestA = Math.atan2(
      wx * this.#qb.x + wy * this.#qb.y + wz * this.#qb.z,
      wx * this.#qn.x + wy * this.#qn.y + wz * this.#qn.z,
    );
    out.s = bestS;
    out.a = bestA;
    out.dist = d - this.radius(bestS, bestA);
    // Transform the radial normal back into world space: the scaled mesh's
    // Y gradient is compressed, so its world normal has the inverse scale.
    const rawNx = wx / d;
    const rawNy = wy / d;
    const rawNz = wz / d;
    const worldLength =
      Math.hypot(rawNx, rawNy / config.CAVE_VERTICAL_SCALE, rawNz) || 1;
    out.dist /= worldLength;
    out.nx = rawNx / worldLength;
    out.ny = rawNy / config.CAVE_VERTICAL_SCALE / worldLength;
    out.nz = rawNz / worldLength;
    const r = this.radius(bestS, bestA);
    const ca = Math.cos(bestA);
    const sa = Math.sin(bestA);
    out.hx = this.#qc.x + (this.#qn.x * ca + this.#qb.x * sa) * r;
    out.hy =
      (this.#qc.y + (this.#qn.y * ca + this.#qb.y * sa) * r) *
      config.CAVE_VERTICAL_SCALE;
    out.hz = this.#qc.z + (this.#qn.z * ca + this.#qb.z * sa) * r;
    return out;
  }

  /** the point of the cave axis at arc s, for the camera and the gates */
  centerAt(s: number, out: Pt) {
    this.center(s, out);
    out.y *= config.CAVE_VERTICAL_SCALE;
    return out;
  }

  /** Place the body just above the lower cave wall. The opening is flat, so
   *  cars start with a real ground contact instead of floating at the axis. */
  groundSpawn(s: number, lateral = 0) {
    const c = this.center(s, { x: 0, y: 0, z: 0 });
    const t = this.tangent(s, { x: 0, y: 0, z: 0 });
    const n = { x: 0, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    this.#frameFromTangent(t, n, b);
    const floorRadius = this.radius(s, Math.PI);
    const lateralOffset = lateral * floorRadius * 0.45;
    const floorY = (c.y - n.y * floorRadius) * config.CAVE_VERTICAL_SCALE;
    const floorX = c.x - n.x * floorRadius + b.x * lateralOffset;
    const floorZ = c.z - n.z * floorRadius + b.z * lateralOffset;
    const upX = n.x;
    const upY = n.y * config.CAVE_VERTICAL_SCALE;
    const upZ = n.z;
    const upLength = Math.hypot(upX, upY, upZ) || 1;
    return {
      x: floorX + (upX / upLength) * config.CAVE_GROUND_CLEARANCE,
      y: floorY + (upY / upLength) * config.CAVE_GROUND_CLEARANCE,
      z: floorZ + (upZ / upLength) * config.CAVE_GROUND_CLEARANCE,
      tx: t.x,
      ty: t.y,
      tz: t.z,
      s,
    };
  }

  /** the single start point, just inside the mouth, every car overlaps there */
  getSpawn() {
    return this.groundSpawn(config.SPAWN_OFFSET);
  }

  /** build or drop the chunk meshes so the window [minS, maxS] stays meshed */
  update(minS: number, maxS: number, dt = 1 / 60) {
    this.#time += dt;
    const minChunk = Math.max(0, Math.floor(minS / LEN));
    const maxChunk = Math.floor(maxS / LEN);
    for (let i = minChunk; i <= maxChunk; i++) {
      if (!this.#chunks.has(i)) this.#buildChunk(i);
    }
    for (const [i, chunk] of this.#chunks) {
      if (i < minChunk || i > maxChunk) this.#removeChunk(chunk);
    }
    for (const index of this.#floorProfiles.keys()) {
      if (index < minChunk - 1 || index > maxChunk + 1)
        this.#floorProfiles.delete(index);
    }
    for (const index of this.#featureCells.keys()) {
      if (index < minChunk - 1 || index > maxChunk + 1)
        this.#featureCells.delete(index);
    }
    // the control line only needs to reach one chunk past the meshed range,
    // trim what fell behind, the remaining control points are absolute
    while (this.#controlOffset < minChunk && this.#control.length > 1) {
      this.#control.shift();
      this.#controlOffset++;
    }
    // spin the boost items so they read as collectible pickups
    for (const chunk of this.#chunks.values()) {
      for (const item of chunk.items) {
        item.rotation.y += dt * 2.2;
        item.rotation.x += dt * 1.1;
      }
    }
  }

  #removeChunk(chunk: ChunkData) {
    if (chunk.mesh) {
      this.#scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
    }
    for (const gate of chunk.gates) {
      this.#scene.remove(gate);
      gate.geometry.dispose();
    }
    for (const item of chunk.items) this.#scene.remove(item);
    this.#chunks.delete(chunk.index);
  }

  /** number of boost items currently meshed, used by the HUD/tests */
  public boostItemCount() {
    let count = 0;
    for (const chunk of this.#chunks.values()) count += chunk.items.length;
    return count;
  }

  /** precompute the sample table and build the tube mesh of one chunk */
  #buildChunk(index: number) {
    this.#ensureControl(index + 1);

    const samples = new Float32Array((SAMPLES + 1) * 13);
    const point: Pt = { x: 0, y: 0, z: 0 };
    const t: Pt = { x: 0, y: 0, z: 0 };
    const n: Pt = { x: 0, y: 0, z: 0 };
    const b: Pt = { x: 0, y: 0, z: 0 };
    for (let j = 0; j <= SAMPLES; j++) {
      const s = index * LEN + j * PER;
      this.#centerInChunk(index, j / SAMPLES, point);
      this.#tangentInChunk(index, j / SAMPLES, t);
      this.#frameFromTangent(t, n, b);
      const o = j * 13;
      samples[o] = point.x;
      samples[o + 1] = point.y;
      samples[o + 2] = point.z;
      samples[o + 3] = t.x;
      samples[o + 4] = t.y;
      samples[o + 5] = t.z;
      samples[o + 6] = n.x;
      samples[o + 7] = n.y;
      samples[o + 8] = n.z;
      samples[o + 9] = b.x;
      samples[o + 10] = b.y;
      samples[o + 11] = b.z;
      samples[o + 12] = this.#waveRadius(s);
    }

    // tube mesh: a ring of SIDES vertices per sample
    const count = (SAMPLES + 1) * (SIDES + 1);
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    let vi = 0;
    for (let j = 0; j <= SAMPLES; j++) {
      const o = j * 13;
      for (let k = 0; k <= SIDES; k++) {
        const a = (k / SIDES) * TWO_PI;
        const s = index * LEN + j * PER;
        const r = this.radius(s, a);
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const nx = samples[o + 6] * ca + samples[o + 9] * sa;
        const ny = samples[o + 7] * ca + samples[o + 10] * sa;
        const nz = samples[o + 8] * ca + samples[o + 11] * sa;
        positions[vi * 3] = samples[o] + nx * r;
        positions[vi * 3 + 1] = samples[o + 1] + ny * r;
        positions[vi * 3 + 2] = samples[o + 2] + nz * r;
        normals[vi * 3] = nx;
        normals[vi * 3 + 1] = ny;
        normals[vi * 3 + 2] = nz;
        // the bump decides the shade: high rock reads lighter than the hollows,
        // and a road lane reads lighter still so its surface stands out
        const road = this.#roadInfluence(s, a);
        const shade =
          0.62 + 0.5 * this.#bumpNoise01(s, a) * (1 - road) + road * 0.22;
        // Feature tints over the rock shade: the jump platform deck reads as
        // a cyan slab, boost pads as glowing amber patches.
        let cr = shade;
        let cg = shade;
        let cb = shade;
        const platform = this.#rampInfluence(s, a);
        if (platform > 0.05) {
          const tint = config.CAVE_PLATFORM_COLOR;
          cr = cr * (1 - platform) + tint[0] * platform;
          cg = cg * (1 - platform) + tint[1] * platform;
          cb = cb * (1 - platform) + tint[2] * platform;
        }
        const pad = this.boostAt(s, a);
        if (pad > 0.35) {
          const tint = config.CAVE_BOOST_COLOR;
          const t = (pad - 0.35) / 0.65;
          cr = cr * (1 - t) + tint[0] * t;
          cg = cg * (1 - t) + tint[1] * t;
          cb = cb * (1 - t) + tint[2] * t;
        }
        colors[vi * 3] = cr;
        colors[vi * 3 + 1] = cg;
        colors[vi * 3 + 2] = cb;
        uvs[vi * 2] = (k / SIDES) * 4;
        uvs[vi * 2 + 1] = (j / SAMPLES) * 12;
        vi++;
      }
    }
    const indices: number[] = [];
    for (let j = 0; j < SAMPLES; j++) {
      for (let k = 0; k < SIDES; k++) {
        const a0 = j * (SIDES + 1) + k;
        const a1 = a0 + 1;
        const b0 = a0 + SIDES + 1;
        const b1 = b0 + 1;
        // Keep both triangles wound consistently. The previous alternating
        // winding made BackSide lighting produce a black/white checkerboard.
        indices.push(a0, a1, b0, a1, b1, b0);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, this.#material);
    // Keep the cave wide while compressing its rendered vertical profile.
    mesh.scale.y = config.CAVE_VERTICAL_SCALE;
    this.#scene.add(mesh);

    // the gates this chunk owns: a thin unlit ring across the cave
    const gates: THREE.Mesh[] = [];
    for (let g = 0; g < config.GATES_PER_SEED; g++) {
      const gs = this.gatePositions[g];
      if (Math.floor(gs / LEN) !== index) continue;
      const t: Pt = { x: 0, y: 0, z: 0 };
      const n: Pt = { x: 0, y: 0, z: 0 };
      const b: Pt = { x: 0, y: 0, z: 0 };
      this.tangent(gs, t);
      this.#frameFromTangent(t, n, b);
      const c = this.centerAt(gs, { x: 0, y: 0, z: 0 });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(this.#waveRadius(gs) * 0.99, 1.1, 6, 48),
        this.#gateMaterial,
      );
      const m = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(n.x, n.y, n.z),
        new THREE.Vector3(b.x, b.y, b.z),
        new THREE.Vector3(t.x, t.y, t.z),
      );
      ring.quaternion.setFromRotationMatrix(m);
      ring.position.set(c.x, c.y, c.z);
      this.#scene.add(ring);
      this.gateMeshes[g] = ring;
      gates.push(ring);
    }

    // glowing boost items floating over this chunk's boost pads: collected by
    // rolling through the pad underneath (boostAt drives the push)
    const items: THREE.Mesh[] = [];
    const firstCell = Math.floor((index * LEN) / config.CAVE_FEATURE_CELL) - 1;
    const lastCell =
      Math.floor(((index + 1) * LEN) / config.CAVE_FEATURE_CELL) + 1;
    for (let c = firstCell; c <= lastCell; c++) {
      const pad = this.#featureCell(c).boost;
      if (!pad) continue;
      if (Math.floor(pad.centerS / LEN) !== index) continue;
      const at = this.surface(pad.centerS, pad.centerA, {
        x: 0,
        y: 0,
        z: 0,
      });
      const center = this.centerAt(pad.centerS, { x: 0, y: 0, z: 0 });
      let dx = center.x - at.x;
      let dy = center.y - at.y;
      let dz = center.z - at.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      dx /= len;
      dy /= len;
      dz /= len;
      const lift = config.CAVE_BOOST_ITEM_RADIUS + 2.2;
      const orb = new THREE.Mesh(
        this.#boostItemGeometry,
        this.#boostItemMaterial,
      );
      orb.position.set(at.x + dx * lift, at.y + dy * lift, at.z + dz * lift);
      orb.frustumCulled = false;
      this.#scene.add(orb);
      items.push(orb);
    }

    const chunk: ChunkData = { index, samples, mesh, gates, items };
    this.#chunks.set(index, chunk);
    return chunk;
  }

  /** frame from a known tangent: world-up anchored normal, right-handed binormal */
  #frameFromTangent(t: Pt, n: Pt, b: Pt) {
    let ux = 0;
    let uy = 1;
    let uz = 0;
    if (Math.abs(t.y) > 0.93) {
      ux = 1;
      uy = 0;
      uz = 0;
    }
    const dot = t.x * ux + t.y * uy + t.z * uz;
    let nx = ux - t.x * dot;
    let ny = uy - t.y * dot;
    let nz = uz - t.z * dot;
    const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= nlen;
    ny /= nlen;
    nz /= nlen;
    n.x = nx;
    n.y = ny;
    n.z = nz;
    b.x = t.y * nz - t.z * ny;
    b.y = t.z * nx - t.x * nz;
    b.z = t.x * ny - t.y * nx;
  }

  /** the bump in 0..1, for the vertex shade */
  #bumpNoise01(s: number, a: number) {
    const u = s / config.CAVE_BUMP_WAVE;
    const v = (((a < 0 ? a + TWO_PI : a) / TWO_PI) * NOISE_CELLS) % NOISE_CELLS;
    const u0 = Math.floor(u);
    const v0 = Math.floor(v);
    const fu = u - u0;
    const fv = v - v0;
    const su = fu * fu * (3 - 2 * fu);
    const sv = fv * fv * (3 - 2 * fv);
    const v1 = (v0 + 1) % NOISE_CELLS;
    const n00 = this.#noiseCorner(u0, v0);
    const n10 = this.#noiseCorner(u0 + 1, v0);
    const n01 = this.#noiseCorner(u0, v1);
    const n11 = this.#noiseCorner(u0 + 1, v1);
    const nx0 = n00 + (n10 - n00) * su;
    const nx1 = n01 + (n11 - n01) * su;
    return nx0 + (nx1 - nx0) * sv;
  }

  /** dispose every chunk mesh and material, used when the whole cave is
   *  regenerated */
  clear() {
    for (const chunk of [...this.#chunks.values()]) this.#removeChunk(chunk);
    this.#chunks.clear();
    this.#control.length = 0;
    this.#controlOffset = 0;
    this.#featureCells.clear();
    this.gateMeshes = new Array(config.GATES_PER_SEED).fill(null);
    this.#material.dispose();
    this.#rockTexture.dispose();
    this.#gateMaterial.dispose();
    this.#gateNextMaterial.dispose();
    this.#boostItemGeometry.dispose();
    this.#boostItemMaterial.dispose();
    this.#generateControl(0);
  }
}

/** rotate the unit vector v around the unit axis (ax,ay,az) by angle,
 *  written into out. Rodrigues, no allocations. */
function rotateAroundAxis(
  v: Pt,
  ax: number,
  ay: number,
  az: number,
  angle: number,
  out: Pt,
) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const vx = v.x;
  const vy = v.y;
  const vz = v.z;
  out.x =
    (t * ax * ax + c) * vx +
    (t * ax * ay - s * az) * vy +
    (t * ax * az + s * ay) * vz;
  out.y =
    (t * ax * ay + s * az) * vx +
    (t * ay * ay + c) * vy +
    (t * ay * az - s * ax) * vz;
  out.z =
    (t * ax * az - s * ay) * vx +
    (t * ay * az + s * ax) * vy +
    (t * az * az + c) * vz;
}
