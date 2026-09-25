import {
  getIntersection,
  lerp,
  segmentHitsAABB,
  type Vector,
} from '../../../utilities/math';
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
  /** touched by the current ray, reused across rays and frames */
  #touches: Reading[] = [];
  /** each ray's fixed offset from the car angle, with its sin/cos precomputed */
  #cosOff: number[] = [];
  #sinOff: number[] = [];

  constructor(car: Car) {
    this.car = car;
    this.rayCount = config.SENSORS;

    this.rays = [];
    this.readings = new Array(this.rayCount);
    for (let i = 0; i < this.rayCount; i++) {
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
        roadBorders,
        traffic,
        deathRays,
      );
    }
  }

  #getReading(
    ray: Vector[],
    roadBorders: Vector[][],
    traffic: Car[],
    deathRays: DeathRay[],
  ): Reading | null {
    const touches = this.#touches;
    touches.length = 0;
    const ax = ray[0].x;
    const ay = ray[0].y;
    const bx = ray[1].x;
    const by = ray[1].y;

    for (let i = 0; i < roadBorders.length; i++) {
      const touch = getIntersection(
        ray[0],
        ray[1],
        roadBorders[i][0],
        roadBorders[i][1],
      );
      if (touch) {
        touches.push(touch);
      }
    }

    for (let i = 0; i < traffic.length; i++) {
      const car = traffic[i];
      // most rays miss most cars, the box rejects them before any edge test
      if (!segmentHitsAABB(ax, ay, bx, by, car.aabb)) continue;
      const poly = car.polygon;
      for (let j = 0; j < poly.length; j++) {
        const value = getIntersection(
          ray[0],
          ray[1],
          poly[j],
          poly[(j + 1) % poly.length],
        );
        if (value) {
          touches.push(value);
        }
      }
    }

    for (let i = 0; i < deathRays.length; i++) {
      RAY_A.y = deathRays[i].y;
      RAY_B.y = RAY_A.y;
      const touch = getIntersection(ray[0], ray[1], RAY_A, RAY_B);
      if (touch) {
        touches.push(touch);
      }
    }

    if (touches.length === 0) {
      return null;
    }
    let best = touches[0];
    for (let i = 1; i < touches.length; i++) {
      if (touches[i].offset < best.offset) {
        best = touches[i];
      }
    }
    return best;
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
