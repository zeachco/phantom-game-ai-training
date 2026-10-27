import {
  circleIntersectionOffset,
  lerp,
  segmentHitsAABB,
  segmentIntersectionOffset,
} from '../../../utilities/math';
import { RayFan2D } from '../../../utilities/sensors/RayFan2D';
import type { Car } from './Car';
import type { Segment } from './Circuit';
import { config } from './Config';
import type { Obstacle } from './Obstacle';

/** a power-warped fan whose reach swells in a cosine bell toward the middle */
export class Sensor extends RayFan2D {
  car: Car;

  constructor(car: Car) {
    const halfAngle = config.SENSOR_ANGLE / 2;
    // u runs -1 (left edge) .. 1 (right edge); the power warp keeps the
    // edges in place and packs the rays in between toward the heading
    const offset = (i: number): number => {
      const u = config.SENSORS === 1 ? 0 : (2 * i) / (config.SENSORS - 1) - 1;
      const warped = Math.sign(u) * Math.abs(u) ** config.SENSOR_FORWARD_BIAS;
      return -warped * halfAngle;
    };
    super(
      config.SENSORS,
      offset,
      // cosine bell over the real angle: 1 straight ahead, 0 at the edges
      (i) => {
        const length = lerp(
          config.SENSORS_EDGE_LENGTH,
          config.SENSORS_MAX_LENGTH,
          Math.cos((offset(i) / halfAngle) * (Math.PI / 2)),
        );
        return { x: length, y: length };
      },
    );
    this.car = car;
  }

  update(obstacles: Obstacle[], segments: Segment[]) {
    this.cast(this.car.x, this.car.y, this.car.angle);
    for (let i = 0; i < this.rays.length; i++) {
      const ray = this.rays[i];
      const ax = ray[0].x;
      const ay = ray[0].y;
      const bx = ray[1].x;
      const by = ray[1].y;
      this.startReading(i);
      for (let j = 0; j < obstacles.length; j++) {
        const obstacle = obstacles[j];
        if (obstacle.type === 'moving') {
          const distance = Math.hypot(obstacle.x - ax, obstacle.y - ay);
          const sensorOffset = obstacle.getSensorCollisionOffset(distance);
          const projectedX =
            obstacle.x + obstacle.movementDirectionX * sensorOffset;
          const projectedY =
            obstacle.y + obstacle.movementDirectionY * sensorOffset;
          this.testCircle(obstacle.x, obstacle.y, obstacle.width / 2);
          this.testCircle(projectedX, projectedY, obstacle.width / 2);
          this.testSegment(obstacle.x, obstacle.y, projectedX, projectedY);
          continue;
        }
        // most rays miss most blocks, the box rejects them before any edge test
        if (!segmentHitsAABB(ax, ay, bx, by, obstacle.aabb)) continue;
        const poly = obstacle.polygon;
        for (let k = 0; k < poly.length; k++) {
          const next = poly[(k + 1) % poly.length];
          this.testSegment(poly[k].x, poly[k].y, next.x, next.y);
        }
      }
      for (let j = 0; j < segments.length; j++) {
        const segment = segments[j];
        if (!segmentHitsAABB(ax, ay, bx, by, segment)) continue;
        this.testSegment(segment.a.x, segment.a.y, segment.b.x, segment.b.y);
      }
      this.readings[i] = this.endReading();
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
      const linkHit = segmentIntersectionOffset(
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

  /** the sensor coverage area, using the current effective ray endpoints */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.setLineDash([]);
    this.tracePath(ctx);
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
