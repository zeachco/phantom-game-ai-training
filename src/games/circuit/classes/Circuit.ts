import { mulberry32, Rng, Vector } from '../../../utilities/math';
import { config } from './Config';
import { Obstacle } from './Obstacle';
import { Checkpoint } from './Checkpoint';

/** one boundary edge with its precomputed box, the sensor's wall */
export interface Segment {
  a: Vector;
  b: Vector;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * The looped track. The centerline is a radial curve r(theta), every ray from
 * the map center crosses it exactly once, so the random harmonics carve left
 * and right turns but can never make the road cross itself.
 */
export class Circuit {
  /** centerline resampled at even arc length, index 0 is the start line */
  public points: Vector[] = [];
  public tangents: Vector[] = [];
  public normals: Vector[] = [];
  public left: Vector[] = [];
  public right: Vector[] = [];
  /** half width per point per side: the pinched edge is closer than the other */
  public leftHalf: number[] = [];
  public rightHalf: number[] = [];
  /** decimated boundary edges with precomputed boxes, what the rays bounce off */
  public segments: Segment[] = [];
  public checkpoints: Checkpoint[] = [];
  public length = 0;
  /** the road is static, its paths are built once and stroked every frame */
  public roadPath: Path2D;
  public lanePaths: Path2D[] = [];
  public edgePaths: Path2D[] = [];
  /** obstacles placed along the circuit, seeded with the same random stream */
  public obstacles: Obstacle[] = [];
  /** centerline candidates for the per-car road membership query */
  #roadGrid = new Map<number, number[]>();
  #roadGridMinX = 0;
  #roadGridMinY = 0;
  #roadGridWidth = 0;
  #roadGridHeight = 0;
  #roadCellSize = config.ROAD_WIDTH;

  constructor(public seed: number) {
    this.#generate(mulberry32(seed));
  }

  #generate(rng: Rng) {
    const nonnegativeSeed = Math.max(0, this.seed);
    const difficulty = Math.min(
      1,
      nonnegativeSeed /
        (config.CIRCUIT_DIFFICULTY_SEED_BASE + nonnegativeSeed),
    );
    // Random harmonics of the radius start as four low frequencies for wide
    // sweeping turns.  Extra waves use this same seeded stream, so maps stay
    // deterministic while later seeds add more frequent, sharper curves.
    const waves: { freq: number; amp: number; phase: number }[] = [];
    for (let k = 0; k < config.CIRCUIT_BASE_HARMONICS; k++) {
      waves.push({
        freq: k + 2,
        amp:
          (0.25 + rng() * 0.75) *
          (config.CIRCUIT_WAVINESS / config.CIRCUIT_BASE_HARMONICS) *
          (1 + difficulty * config.CIRCUIT_BASE_AMPLITUDE_GROWTH),
        phase: rng() * Math.PI * 2,
      });
    }
    const extraHarmonics = Math.ceil(
      difficulty * config.CIRCUIT_EXTRA_HARMONICS,
    );
    for (let k = 0; k < extraHarmonics; k++) {
      waves.push({
        freq: config.CIRCUIT_EXTRA_HARMONIC_START + k,
        amp:
          (0.25 + rng() * 0.75) *
          (config.CIRCUIT_EXTRA_WAVINESS / config.CIRCUIT_EXTRA_HARMONICS) *
          difficulty,
        phase: rng() * Math.PI * 2,
      });
    }
    const radius = (t: number) => {
      let r = config.CIRCUIT_BASE_RADIUS;
      for (let i = 0; i < waves.length; i++) {
        r += waves[i].amp * Math.cos(waves[i].freq * t + waves[i].phase);
      }
      return r;
    };

    // coarse sample by angle, then re-pace at even arc length
    const coarse: Vector[] = [];
    const samples = config.CIRCUIT_SAMPLES * 2;
    for (let i = 0; i < samples; i++) {
      const t = (i / samples) * Math.PI * 2;
      const r = radius(t);
      coarse.push({ x: Math.cos(t) * r, y: Math.sin(t) * r });
    }
    this.points = resample(coarse, config.CIRCUIT_SAMPLES);

    // Alternate the opening bend by map index so the networks see both
    // steering patterns. In canvas coordinates a positive tangent cross
    // product is a right-hand bend for the car's heading convention.
    const openingTurnIsRight = turnIsRight(this.points);
    const shouldTurnRight = this.seed % 2 === 0;
    if (openingTurnIsRight !== shouldTurnRight) {
      for (const point of this.points) point.x = -point.x;
    }

    const n = this.points.length;
    this.length = 0;
    for (let i = 0; i < n; i++) {
      const a = this.points[i];
      const b = this.points[(i + 1) % n];
      this.length += Math.hypot(b.x - a.x, b.y - a.y);
    }

    for (let i = 0; i < n; i++) {
      const prev = this.points[(i - 1 + n) % n];
      const next = this.points[(i + 1) % n];
      const len = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
      const tx = (next.x - prev.x) / len;
      const ty = (next.y - prev.y) / len;
      this.tangents.push({ x: tx, y: ty });
      this.normals.push({ x: -ty, y: tx });
    }

    const half = config.ROAD_WIDTH / 2;
    const per = this.length / n;
    const first = Math.round((config.SPAWN_OFFSET + 250) / per) + 1;
    const last = n - 4;

    const laneWidth = config.ROAD_LANE_WIDTH;
    const leftHalf = new Array<number>(n).fill(half);
    const rightHalf = new Array<number>(n).fill(half);
    // A section closes or opens one lane at a time.  Moving just one edge is
    // important: the boundaries of all the lanes that remain stay in place.
    const sectionSide = new Array<'left' | 'right'>(n).fill('left');
    const targets = [
      config.ROAD_MIN_LANES,
      Math.max(config.ROAD_MIN_LANES, Math.min(config.ROAD_MAX_LANES, 2)),
      config.ROAD_MAX_LANES,
    ].slice(0, config.ROAD_SECTION_COUNT);
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
    const transition = config.ROAD_SECTION_TRANSITION;
    const hold = config.ROAD_SECTION_LENGTH;
    const sectionLengths = targets.map(
      (target) => hold + 2 * transition * Math.abs(config.ROAD_LANES - target),
    );
    const profileStart = first + 8;
    const profileEnd = last - 8;
    const totalSectionLength = sectionLengths.reduce(
      (sum, value) => sum + value,
      0,
    );
    let free = Math.max(0, profileEnd - profileStart - totalSectionLength);
    let cursor = profileStart;

    for (let s = 0; s < targets.length; s++) {
      const target = targets[s];
      const distance = Math.abs(config.ROAD_LANES - target);
      const sectionLen = sectionLengths[s];
      const gapsLeft = targets.length - s;
      const gap =
        gapsLeft > 0 ? Math.floor(rng() * (free / gapsLeft + 1)) : free;
      cursor += gap;
      free -= gap;
      const start = cursor;
      cursor += sectionLen;
      const pinchLeft = rng() < 0.5;

      for (let i = 0; i < sectionLen; i++) {
        let lanes: number;
        const enterLength = distance * transition;
        const exitStart = enterLength + hold;
        if (distance === 0) {
          lanes = target;
        } else if (i < enterLength) {
          const stage = Math.floor(i / transition);
          const local = i % transition;
          const progress = transition > 1 ? local / (transition - 1) : 1;
          const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
          lanes =
            config.ROAD_LANES +
            ((target - config.ROAD_LANES) * (stage + eased)) / distance;
        } else if (i < exitStart) {
          lanes = target;
        } else {
          const stage = Math.floor((i - exitStart) / transition);
          const local = (i - exitStart) % transition;
          const progress = transition > 1 ? local / (transition - 1) : 1;
          const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
          lanes =
            target +
            ((config.ROAD_LANES - target) * (stage + eased)) / distance;
        }
        const width = lanes * laneWidth;
        const idx = start + i;
        sectionSide[idx] = pinchLeft ? 'left' : 'right';
        if (pinchLeft) leftHalf[idx] = width - rightHalf[idx];
        else rightHalf[idx] = width - leftHalf[idx];
      }
    }
    this.leftHalf = leftHalf;
    this.rightHalf = rightHalf;

    for (let i = 0; i < n; i++) {
      const p = this.points[i];
      const nm = this.normals[i];
      this.left.push({
        x: p.x + nm.x * leftHalf[i],
        y: p.y + nm.y * leftHalf[i],
      });
      this.right.push({
        x: p.x - nm.x * rightHalf[i],
        y: p.y - nm.y * rightHalf[i],
      });
    }

    this.#buildRoadGrid();

    const pushSegments = (bound: Vector[]) => {
      for (let i = 0; i < n; i += config.SENSOR_DECIMATION) {
        const a = bound[i];
        const b = bound[(i + config.SENSOR_DECIMATION) % n];
        this.segments.push({
          a,
          b,
          minX: Math.min(a.x, b.x),
          minY: Math.min(a.y, b.y),
          maxX: Math.max(a.x, b.x),
          maxY: Math.max(a.y, b.y),
        });
      }
    };
    pushSegments(this.left);
    pushSegments(this.right);

    for (let i = 0; i < config.CHECKPOINTS; i++) {
      const idx = Math.round((i / config.CHECKPOINTS) * n) % n;
      this.checkpoints.push(
        new Checkpoint(
          this.points[idx].x,
          this.points[idx].y,
          this.left[idx],
          this.right[idx],
          i,
        ),
      );
    }

    // Obstacles use the same seeded stream as the road and always remain
    // round, leaving a useful lane around each one.
    this.obstacles = [];
    const span = Math.max(1, last - first);
    const step = span / config.OBSTACLES;
    const makeObstacle = (idx: number) => {
      const roadWidth = this.leftHalf[idx] + this.rightHalf[idx];
      // A single-lane section has no safe passing lane, so leave it empty.
      if (roadWidth <= laneWidth + 1e-6) return null;
      const p = this.points[idx];
      const t = this.tangents[idx];
      const roadAngle = Math.atan2(-t.x, -t.y);
      const maxWidth = Math.max(1, roadWidth - laneWidth);
      const minDiameter = Math.min(laneWidth * 0.7, maxWidth);
      const maxDiameter = Math.min(laneWidth * 0.8, maxWidth);
      const width = minDiameter + rng() * (maxDiameter - minDiameter);
      const crossHalf = width / 2;
      const leftRoom = this.leftHalf[idx] - crossHalf;
      const rightRoom = this.rightHalf[idx] - crossHalf;
      if (leftRoom < 0 || rightRoom < 0) return null;

      // On a two-lane road an obstacle this wide already occupies one lane.
      // Keep the other lane usable by anchoring the obstacle to an edge;
      // centering it would leave two half-lane slivers on either side.
      const twoLaneRoad = roadWidth <= laneWidth * 2 + 1e-6;
      const gap = config.OBSTACLE_PASS_GAP;
      const minWithGap = gap - rightRoom;
      const maxWithGap = leftRoom - gap;
      const off =
        twoLaneRoad
          ? rng() < 0.5
            ? leftRoom
            : -rightRoom
          : minWithGap <= maxWithGap && rng() > 0.25
            ? minWithGap + rng() * (maxWithGap - minWithGap)
            : rng() < 0.5
              ? leftRoom
              : -rightRoom;

      return new Obstacle(
        p.x + this.normals[idx].x * off,
        p.y + this.normals[idx].y * off,
        roadAngle,
        width,
        width,
        'circle',
      );
    };

    for (let i = 0; i < config.OBSTACLES; i++) {
      const base = first + (i + 0.5) * step;
      let obstacle: Obstacle | null = null;
      // Keep twelve obstacles even when a seeded sample lands in a
      // one-lane section: reroll that sample rather than adding an obstacle
      // where it would remove every safe route.
      for (let attempt = 0; attempt < n && !obstacle; attempt++) {
        const idx =
          (((Math.round(base + (-0.35 + rng() * 0.7) * step) + attempt) % n) +
            n) %
          n;
        obstacle = makeObstacle(idx);
      }
      if (obstacle) this.obstacles.push(obstacle);
    }

    const loopPath = (pts: Vector[]) => {
      const path = new Path2D();
      path.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
      path.closePath();
      return path;
    };
    // the road surface is the variable-width strip between the two edges
    const strip = new Path2D();
    strip.moveTo(this.left[0].x, this.left[0].y);
    for (let i = 1; i < n; i++) strip.lineTo(this.left[i].x, this.left[i].y);
    for (let i = n - 1; i >= 0; i--)
      strip.lineTo(this.right[i].x, this.right[i].y);
    strip.closePath();
    this.roadPath = strip;
    this.edgePaths = [loopPath(this.left), loopPath(this.right)];
    for (let divider = 1; divider < config.ROAD_MAX_LANES; divider++) {
      const path = new Path2D();
      let drawing = false;
      for (let step = 0; step <= n; step++) {
        const i = step % n;
        const stableEdge =
          sectionSide[i] === 'left' ? -rightHalf[i] : leftHalf[i];
        const direction = sectionSide[i] === 'left' ? 1 : -1;
        const off = stableEdge + direction * divider * laneWidth;
        // Divider slots are measured from the untouched edge.  Thus only the
        // boundary of a lane being closed reaches the moving edge; all
        // unaffected lane boundaries remain separate through the transition.
        const valid = off > -rightHalf[i] + 1e-6 && off < leftHalf[i] - 1e-6;
        if (valid) {
          const p = this.points[i];
          if (!drawing)
            path.moveTo(
              p.x + this.normals[i].x * off,
              p.y + this.normals[i].y * off,
            );
          else
            path.lineTo(
              p.x + this.normals[i].x * off,
              p.y + this.normals[i].y * off,
            );
          drawing = true;
        } else {
          drawing = false;
        }
      }
      this.lanePaths.push(path);
    }
  }

  #indexAtArc(arc: number) {
    const n = this.points.length;
    const per = this.length / n;
    return ((Math.round(arc / per) % n) + n) % n;
  }

  /** true when the point sits between the actual left and right road edges */
  isOnRoad(x: number, y: number) {
    const key = this.#roadCellKey(x, y);
    if (key === undefined) return false;
    const candidates = this.#roadGrid.get(key);
    if (!candidates) return false;

    let best = candidates[0];
    let bestT = 0;
    let bestD = Infinity;
    for (let candidate = 0; candidate < candidates.length; candidate++) {
      const i = candidates[candidate];
      const a = this.points[i];
      const b = this.points[(i + 1) % this.points.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length2 = dx * dx + dy * dy;
      let t = length2 ? ((x - a.x) * dx + (y - a.y) * dy) / length2 : 0;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + dx * t;
      const py = a.y + dy * t;
      const distance = (x - px) * (x - px) + (y - py) * (y - py);
      if (distance < bestD) {
        bestD = distance;
        best = i;
        bestT = t;
      }
    }

    const next = (best + 1) % this.points.length;
    const p = this.points[best];
    const q = this.points[next];
    let normalX =
      this.normals[best].x * (1 - bestT) + this.normals[next].x * bestT;
    let normalY =
      this.normals[best].y * (1 - bestT) + this.normals[next].y * bestT;
    const normalLength = Math.hypot(normalX, normalY) || 1;
    normalX /= normalLength;
    normalY /= normalLength;
    const left =
      this.leftHalf[best] * (1 - bestT) + this.leftHalf[next] * bestT;
    const right =
      this.rightHalf[best] * (1 - bestT) + this.rightHalf[next] * bestT;
    const centerX = p.x + (q.x - p.x) * bestT;
    const centerY = p.y + (q.y - p.y) * bestT;
    const lateral = (x - centerX) * normalX + (y - centerY) * normalY;

    // Check both bounds explicitly. A one-lane section can sit entirely on
    // one side of the centerline, so choosing a bound from the sign of the
    // point would incorrectly treat the space between the centerline and the
    // road edge as drivable.
    return lateral >= -right - 4 && lateral <= left + 4;
  }

  #buildRoadGrid() {
    const padding = config.ROAD_MAX_LANES * config.ROAD_LANE_WIDTH + 4;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of this.points) {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    }

    this.#roadGridMinX =
      Math.floor((minX - padding) / this.#roadCellSize) * this.#roadCellSize;
    this.#roadGridMinY =
      Math.floor((minY - padding) / this.#roadCellSize) * this.#roadCellSize;
    const gridMaxX =
      Math.ceil((maxX + padding) / this.#roadCellSize) * this.#roadCellSize;
    const gridMaxY =
      Math.ceil((maxY + padding) / this.#roadCellSize) * this.#roadCellSize;
    this.#roadGridWidth = Math.ceil(
      (gridMaxX - this.#roadGridMinX) / this.#roadCellSize,
    );
    this.#roadGridHeight = Math.ceil(
      (gridMaxY - this.#roadGridMinY) / this.#roadCellSize,
    );

    this.#roadGrid.clear();
    for (let i = 0; i < this.points.length; i++) {
      const a = this.points[i];
      const b = this.points[(i + 1) % this.points.length];
      const minCellX = Math.floor(
        (Math.min(a.x, b.x) - padding - this.#roadGridMinX) /
          this.#roadCellSize,
      );
      const maxCellX = Math.floor(
        (Math.max(a.x, b.x) + padding - this.#roadGridMinX) /
          this.#roadCellSize,
      );
      const minCellY = Math.floor(
        (Math.min(a.y, b.y) - padding - this.#roadGridMinY) /
          this.#roadCellSize,
      );
      const maxCellY = Math.floor(
        (Math.max(a.y, b.y) + padding - this.#roadGridMinY) /
          this.#roadCellSize,
      );
      for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
          const key = cellX + cellY * this.#roadGridWidth;
          const cell = this.#roadGrid.get(key);
          if (cell) cell.push(i);
          else this.#roadGrid.set(key, [i]);
        }
      }
    }
  }

  #roadCellKey(x: number, y: number) {
    const cellX = Math.floor((x - this.#roadGridMinX) / this.#roadCellSize);
    const cellY = Math.floor((y - this.#roadGridMinY) / this.#roadCellSize);
    if (
      cellX < 0 ||
      cellX >= this.#roadGridWidth ||
      cellY < 0 ||
      cellY >= this.#roadGridHeight
    )
      return undefined;
    return cellX + cellY * this.#roadGridWidth;
  }

  /** the single start point, just behind the line, every car overlaps there */
  getSpawn() {
    const idx = this.#indexAtArc(-config.SPAWN_OFFSET);
    const p = this.points[idx];
    const gate = this.checkpoints[0];
    return {
      x: p.x,
      y: p.y,
      // face the first gate, that is where the score starts
      angle: Math.atan2(p.x - gate.x, p.y - gate.y),
    };
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.lineJoin = 'round';
    ctx.fillStyle = config.ROAD_COLOR;
    ctx.fill(this.roadPath);

    ctx.setLineDash([20, 20]);
    ctx.strokeStyle = config.LANE_COLOR;
    ctx.lineWidth = 3;
    for (let i = 0; i < this.lanePaths.length; i++) {
      ctx.stroke(this.lanePaths[i]);
    }
    ctx.setLineDash([]);

    ctx.strokeStyle = config.EDGE_COLOR;
    ctx.lineWidth = 5;
    for (let i = 0; i < this.edgePaths.length; i++) {
      ctx.stroke(this.edgePaths[i]);
    }
  }
}

/** In the canvas coordinate system, positive curvature turns the car right. */
function turnIsRight(points: Vector[]) {
  const a = points[0];
  const b = points[1];
  const c = points[2];
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const bcX = c.x - b.x;
  const bcY = c.y - b.y;
  return abX * bcY - abY * bcX > 0;
}

/** re-paces a closed polyline so the points sit at even arc distances */
function resample(input: Vector[], count: number): Vector[] {
  const n = input.length;
  const seg = new Array<number>(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = input[i];
    const b = input[(i + 1) % n];
    seg[i] = Math.hypot(b.x - a.x, b.y - a.y);
    total += seg[i];
  }
  const out = new Array<Vector>(count);
  const step = total / count;
  let from = 0;
  let covered = 0;
  for (let i = 0; i < count; i++) {
    const target = i * step;
    while (covered + seg[from] < target) {
      covered += seg[from];
      from = (from + 1) % n;
    }
    const a = input[from];
    const b = input[(from + 1) % n];
    const t = seg[from] ? (target - covered) / seg[from] : 0;
    out[i] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  return out;
}
