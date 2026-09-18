import type { Car } from './Car';
import {
  getIntersection,
  lerp,
  segmentHitsAABB,
  Vector,
} from '../../../utilities/math';
import { config } from './Config';
import type { Segment } from './Circuit';
import type { Obstacle } from './Obstacle';

interface Reading {
  x: number;
  y: number;
  offset: number;
}

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
        this.rayCount == 1 ? 0.5 : i / (this.rayCount - 1),
      );
      this.#cosOff.push(Math.cos(offset));
      this.#sinOff.push(Math.sin(offset));
      this.rays.push([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ]);
    }
  }

  update(obstacles: Obstacle[], segments: Segment[]) {
    this.#castRays();
    for (let i = 0; i < this.rays.length; i++) {
      this.readings[i] = this.#getReading(this.rays[i], obstacles, segments);
    }
  }

  #getReading(
    ray: Vector[],
    obstacles: Obstacle[],
    segments: Segment[],
  ): Reading | null {
    const touches = this.#touches;
    touches.length = 0;
    const ax = ray[0].x;
    const ay = ray[0].y;
    const bx = ray[1].x;
    const by = ray[1].y;

    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      // most rays miss most blocks, the box rejects them before any edge test
      if (!segmentHitsAABB(ax, ay, bx, by, obstacle.aabb)) continue;
      const poly = obstacle.polygon;
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

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segmentHitsAABB(ax, ay, bx, by, segment)) continue;
      const value = getIntersection(ray[0], ray[1], segment.a, segment.b);
      if (value) {
        touches.push(value);
      }
    }

    if (touches.length == 0) {
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

  /** the whole fan of rays stroked in two passes, one per color */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.strokeStyle = 'yellow';
    for (let i = 0; i < this.rays.length; i++) {
      const end = this.readings[i] || this.rays[i][1];
      ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
      ctx.lineTo(end.x, end.y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = 'black';
    for (let i = 0; i < this.rays.length; i++) {
      const end = this.readings[i] || this.rays[i][1];
      ctx.moveTo(this.rays[i][1].x, this.rays[i][1].y);
      ctx.lineTo(end.x, end.y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
