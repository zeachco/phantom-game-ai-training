import { lerp, segmentHitsAABB, type Vector } from '../../../utilities/math';
import type { Car } from './Car';
import { config } from './Config';
import type { DeathRay } from './DeathRay';

interface Reading {
  x: number;
  y: number;
  offset: number;
}

/** reused across rays, the death line only moves in y between runs */
const RAY_A: Vector = { x: 0, y: 0 };
const RAY_B: Vector = { x: 500, y: 0 };

export class Sensor {
  car: Car;
  rayCount: number;
  /** one [start, end] pair per ray, the points are updated in place */
  rays: Vector[][];
  readings: (Reading | null)[];
  /** one reusable hit point per ray, so update never allocates a Reading */
  #readingPool: Reading[] = [];
  /** the current ray's endpoints, read by #rayHit to keep it argument-light */
  #rayAx = 0;
  #rayAy = 0;
  #rayBx = 0;
  #rayBy = 0;
  /** each ray's fixed offset from the car angle, with its sin/cos precomputed */
  #cosOff: number[] = [];
  #sinOff: number[] = [];

  constructor(car: Car) {
    this.car = car;
    this.rayCount = config.SENSORS;

    this.rays = [];
    this.readings = new Array(this.rayCount);
    this.#readingPool = new Array(this.rayCount);
    for (let i = 0; i < this.rayCount; i++) {
      this.#readingPool[i] = { x: 0, y: 0, offset: 0 };
      const offset = lerp(
        config.SENSOR_ANGLE / 2,
        -config.SENSOR_ANGLE / 2,
        this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1),
      );
      this.#cosOff.push(Math.cos(offset));
      this.#sinOff.push(Math.sin(offset));
      this.rays.push([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ]);
    }
  }

  update(roadBorders: Vector[][], traffic: Car[], deathRays: DeathRay[]) {
    this.#castRays();
    for (let i = 0; i < this.rays.length; i++) {
      this.readings[i] = this.#getReading(
        this.rays[i],
        this.#readingPool[i],
        roadBorders,
        traffic,
        deathRays,
      );
    }
  }

  #getReading(
    ray: Vector[],
    out: Reading,
    roadBorders: Vector[][],
    traffic: Car[],
    deathRays: DeathRay[],
  ): Reading | null {
    const ax = ray[0].x;
    const ay = ray[0].y;
    const bx = ray[1].x;
    const by = ray[1].y;
    this.#rayAx = ax;
    this.#rayAy = ay;
    this.#rayBx = bx;
    this.#rayBy = by;
    // track the closest touch along the ray; no per-hit object is allocated
    let bestX = 0;
    let bestY = 0;
    let bestOffset = Infinity;

    for (let i = 0; i < roadBorders.length; i++) {
      const c = roadBorders[i][0];
      const d = roadBorders[i][1];
      const t = this.#rayHit(c.x, c.y, d.x, d.y);
      if (t >= 0 && t < bestOffset) {
        bestOffset = t;
        bestX = ax + (bx - ax) * t;
        bestY = ay + (by - ay) * t;
      }
    }

    for (let i = 0; i < traffic.length; i++) {
      const car = traffic[i];
      // most rays miss most cars, the box rejects them before any edge test
      if (!segmentHitsAABB(ax, ay, bx, by, car.aabb)) continue;
      const poly = car.polygon;
      for (let j = 0; j < poly.length; j++) {
        const e = poly[j];
        const f = poly[(j + 1) % poly.length];
        const t = this.#rayHit(e.x, e.y, f.x, f.y);
        if (t >= 0 && t < bestOffset) {
          bestOffset = t;
          bestX = ax + (bx - ax) * t;
          bestY = ay + (by - ay) * t;
        }
      }
    }

    for (let i = 0; i < deathRays.length; i++) {
      RAY_A.y = deathRays[i].y;
      RAY_B.y = RAY_A.y;
      const t = this.#rayHit(RAY_A.x, RAY_A.y, RAY_B.x, RAY_B.y);
      if (t >= 0 && t < bestOffset) {
        bestOffset = t;
        bestX = ax + (bx - ax) * t;
        bestY = ay + (by - ay) * t;
      }
    }

    if (bestOffset === Infinity) return null;
    out.x = bestX;
    out.y = bestY;
    out.offset = bestOffset;
    return out;
  }

  /** parametric t in [0,1] where the current ray meets (cx,cy)-(dx,dy) */
  #rayHit(cx: number, cy: number, dx: number, dy: number): number {
    const ax = this.#rayAx;
    const ay = this.#rayAy;
    const bx = this.#rayBx;
    const by = this.#rayBy;
    const tTop = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
    const uTop = (cy - ay) * (ax - bx) - (cx - ax) * (ay - by);
    const bottom = (dy - cy) * (bx - ax) - (dx - cx) * (by - ay);
    if (bottom === 0) return -1;
    const t = tTop / bottom;
    const u = uTop / bottom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
  }

  #castRays() {
    // two trig calls for the car angle, then a sum formula per ray
    const sinA = Math.sin(this.car.angle);
    const cosA = Math.cos(this.car.angle);
    for (let i = 0; i < this.rayCount; i++) {
      const start = this.rays[i][0];
      const end = this.rays[i][1];
      start.x = this.car.x;
      start.y = this.car.y;
      const sinR = sinA * this.#cosOff[i] - cosA * this.#sinOff[i];
      const cosR = cosA * this.#cosOff[i] + sinA * this.#sinOff[i];
      end.x = this.car.x - sinR * config.SENSORS_MAX_WIDTH;
      end.y = this.car.y - cosR * config.SENSORS_MAX_DEPTH;
    }
  }

  /** the sensor coverage area, using the current effective ray endpoints */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    const origin = this.rays[0][0];
    ctx.moveTo(origin.x, origin.y);
    for (let i = 0; i < this.rays.length; i++) {
      const end = this.readings[i] || this.rays[i][1];
      ctx.lineTo(end.x, end.y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(125, 211, 252, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}
