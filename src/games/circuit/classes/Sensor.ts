import { lerp, segmentHitsAABB, type Vector } from '../../../utilities/math';
import type { Car } from './Car';
import type { Segment } from './Circuit';
import { config } from './Config';
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
  /** each ray's fixed offset from the car angle, with its sin/cos precomputed */
  #cosOff: number[] = [];
  #sinOff: number[] = [];
  /** each ray's reach, a smooth profile over the fan angle */
  #lengths: number[] = [];

  constructor(car: Car) {
    this.car = car;
    this.rayCount = config.SENSORS;

    this.rays = [];
    this.readings = new Array(this.rayCount);
    const halfAngle = config.SENSOR_ANGLE / 2;
    for (let i = 0; i < this.rayCount; i++) {
      // u runs -1 (left edge) .. 1 (right edge); the power warp keeps the
      // edges in place and packs the rays in between toward the heading
      const u = this.rayCount === 1 ? 0 : (2 * i) / (this.rayCount - 1) - 1;
      const warped = Math.sign(u) * Math.abs(u) ** config.SENSOR_FORWARD_BIAS;
      const offset = -warped * halfAngle;
      this.#cosOff.push(Math.cos(offset));
      this.#sinOff.push(Math.sin(offset));
      // cosine bell over the real angle: 1 straight ahead, 0 at the edges
      this.#lengths.push(
        lerp(
          config.SENSORS_EDGE_LENGTH,
          config.SENSORS_MAX_LENGTH,
          Math.cos((offset / halfAngle) * (Math.PI / 2)),
        ),
      );
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

  /** Whether an obstacle's translated sensor radius is inside any current ray. */
  isObstacleInView(obstacle: Obstacle) {
    for (const ray of this.rays) {
      const origin = ray[0];
      const distance = Math.hypot(obstacle.x - origin.x, obstacle.y - origin.y);
      const sensorOffset = obstacle.getSensorCollisionOffset(distance);
      const projectedX =
        obstacle.x + obstacle.movementDirectionX * sensorOffset;
      const projectedY =
        obstacle.y + obstacle.movementDirectionY * sensorOffset;
      const actualHit = circleIntersectionOffset(
        ray[0].x,
        ray[0].y,
        ray[1].x,
        ray[1].y,
        obstacle.x,
        obstacle.y,
        obstacle.width / 2,
      );
      const projectedHit = circleIntersectionOffset(
        ray[0].x,
        ray[0].y,
        ray[1].x,
        ray[1].y,
        projectedX,
        projectedY,
        obstacle.width / 2,
      );
      const linkHit = intersectionOffset(
        ray[0].x,
        ray[0].y,
        ray[1].x,
        ray[1].y,
        obstacle.x,
        obstacle.y,
        projectedX,
        projectedY,
      );
      if (actualHit >= 0 || projectedHit >= 0 || linkHit >= 0) {
        return true;
      }
    }
    return false;
  }

  #getReading(
    ray: Vector[],
    obstacles: Obstacle[],
    segments: Segment[],
  ): Reading | null {
    const ax = ray[0].x;
    const ay = ray[0].y;
    const bx = ray[1].x;
    const by = ray[1].y;
    let bestOffset = Infinity;

    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      if (obstacle.type === 'moving') {
        const distance = Math.hypot(obstacle.x - ax, obstacle.y - ay);
        const sensorOffset = obstacle.getSensorCollisionOffset(distance);
        const projectedX =
          obstacle.x + obstacle.movementDirectionX * sensorOffset;
        const projectedY =
          obstacle.y + obstacle.movementDirectionY * sensorOffset;
        const actualOffset = circleIntersectionOffset(
          ax,
          ay,
          bx,
          by,
          obstacle.x,
          obstacle.y,
          obstacle.width / 2,
        );
        const projectedOffset = circleIntersectionOffset(
          ax,
          ay,
          bx,
          by,
          projectedX,
          projectedY,
          obstacle.width / 2,
        );
        const linkOffset = intersectionOffset(
          ax,
          ay,
          bx,
          by,
          obstacle.x,
          obstacle.y,
          projectedX,
          projectedY,
        );
        if (actualOffset >= 0 && actualOffset < bestOffset)
          bestOffset = actualOffset;
        if (projectedOffset >= 0 && projectedOffset < bestOffset)
          bestOffset = projectedOffset;
        if (linkOffset >= 0 && linkOffset < bestOffset) bestOffset = linkOffset;
        continue;
      }
      // most rays miss most blocks, the box rejects them before any edge test
      if (!segmentHitsAABB(ax, ay, bx, by, obstacle.aabb)) continue;
      const poly = obstacle.polygon;
      for (let j = 0; j < poly.length; j++) {
        const next = poly[(j + 1) % poly.length];
        const offset = intersectionOffset(
          ax,
          ay,
          bx,
          by,
          poly[j].x,
          poly[j].y,
          next.x,
          next.y,
        );
        if (offset >= 0 && offset < bestOffset) bestOffset = offset;
      }
    }

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segmentHitsAABB(ax, ay, bx, by, segment)) continue;
      const offset = intersectionOffset(
        ax,
        ay,
        bx,
        by,
        segment.a.x,
        segment.a.y,
        segment.b.x,
        segment.b.y,
      );
      if (offset >= 0 && offset < bestOffset) bestOffset = offset;
    }

    return bestOffset === Infinity
      ? null
      : {
          x: ax + (bx - ax) * bestOffset,
          y: ay + (by - ay) * bestOffset,
          offset: bestOffset,
        };
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
      end.x = this.car.x - sinR * this.#lengths[i];
      end.y = this.car.y - cosR * this.#lengths[i];
    }
  }

  /** the sensor coverage area, using the current eff fective ray endpoints */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([]);
    const origin = this.rays[0][0];
    ctx.moveTo(origin.x, origin.y);
    for (let i = 0; i < this.rays.length; i++) {
      const end = this.readings[i] || this.rays[i][1];
      ctx.lineTo(end.x, end.y);
    }
    ctx.closePath();
    ctx.fillStyle = this.car.color;
    ctx.globalAlpha = 0.22;
    ctx.fill();
    ctx.strokeStyle = this.car.color;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

function circleIntersectionOffset(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  radius: number,
) {
  const dx = bx - ax;
  const dy = by - ay;
  const fx = ax - cx;
  const fy = ay - cy;
  const a = dx * dx + dy * dy;
  if (a === 0) return -1;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return -1;
  const root = Math.sqrt(discriminant);
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  if (first >= 0 && first <= 1) return first;
  return second >= 0 && second <= 1 ? second : -1;
}

function intersectionOffset(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
) {
  const tTop = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const uTop = (cy - ay) * (ax - bx) - (cx - ax) * (ay - by);
  const bottom = (dy - cy) * (bx - ax) - (dx - cx) * (by - ay);

  if (bottom === 0) return -1;
  const t = tTop / bottom;
  const u = uTop / bottom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}
