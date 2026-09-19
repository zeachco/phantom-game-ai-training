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

  constructor(public seed: number) {
    this.#generate(mulberry32(seed));
  }

  #generate(rng: Rng) {
    // random harmonics of the radius, low frequencies for wide sweeping turns
    const harmonics = 4;
    const waves: { freq: number; amp: number; phase: number }[] = [];
    for (let k = 0; k < harmonics; k++) {
      waves.push({
        freq: k + 2,
        amp: (0.25 + rng() * 0.75) * (config.CIRCUIT_WAVINESS / harmonics),
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
    for (let i = 0; i < n; i++) {
      const p = this.points[i];
      const nm = this.normals[i];
      this.left.push({ x: p.x + nm.x * half, y: p.y + nm.y * half });
      this.right.push({ x: p.x - nm.x * half, y: p.y - nm.y * half });
    }

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

    // obstacles seeded with the same rng stream
    this.obstacles = [];
    const per = this.length / n;
    const first = Math.round((config.SPAWN_OFFSET + 250) / per) + 1;
    const last = n - 4;
    const span = Math.max(1, last - first);
    const step = span / config.OBSTACLES;
    for (let i = 0; i < config.OBSTACLES; i++) {
      const base = first + (i + 0.5) * step;
      const idx = Math.round(base + (-0.35 + rng() * 0.7) * step) % n;
      const p = this.points[idx];
      const t = this.tangents[idx];
      const off = -60 + rng() * 120;
      this.obstacles.push(
        new Obstacle(
          p.x + this.normals[idx].x * off,
          p.y + this.normals[idx].y * off,
          Math.atan2(-t.x, -t.y),
        ),
      );
    }

    const loopPath = (pts: Vector[]) => {
      const path = new Path2D();
      path.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
      path.closePath();
      return path;
    };
    this.roadPath = loopPath(this.points);
    this.edgePaths = [loopPath(this.left), loopPath(this.right)];
    for (let l = 1; l < config.ROAD_LANES; l++) {
      const off = (l / config.ROAD_LANES - 0.5) * config.ROAD_WIDTH;
      const line: Vector[] = [];
      for (let i = 0; i < n; i++) {
        line.push({
          x: this.points[i].x + this.normals[i].x * off,
          y: this.points[i].y + this.normals[i].y * off,
        });
      }
      this.lanePaths.push(loopPath(line));
    }
  }

  #indexAtArc(arc: number) {
    const n = this.points.length;
    const per = this.length / n;
    return ((Math.round(arc / per) % n) + n) % n;
  }

  /** true when the point sits on the road, the nearest centerline point decides */
  isOnRoad(x: number, y: number) {
    const points = this.points;
    const n = points.length;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const dx = points[i].x - x;
      const dy = points[i].y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    // refine on the two segments around the nearest point, an exact projection
    bestD = Math.min(
      bestD,
      distToSegment2(x, y, points[(best - 1 + n) % n], points[best]),
      distToSegment2(x, y, points[best], points[(best + 1) % n]),
    );
    const half = config.ROAD_WIDTH / 2 + 4;
    return bestD <= half * half;
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
    ctx.strokeStyle = config.ROAD_COLOR;
    ctx.lineWidth = config.ROAD_WIDTH;
    ctx.stroke(this.roadPath);

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

/** squared distance from a point to a segment, clamped to the segment ends */
function distToSegment2(px: number, py: number, a: Vector, b: Vector) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - a.x) * dx + (py - a.y) * dy) / len2 : 0;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const cx = a.x + dx * t - px;
  const cy = a.y + dy * t - py;
  return cx * cx + cy * cy;
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
