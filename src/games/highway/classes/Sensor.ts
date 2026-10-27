import {
  lerp,
  segmentHitsAABB,
  type Vector,
} from '../../../utilities/math';
import { RayFan2D } from '../../../utilities/sensors/RayFan2D';
import type { Car } from './Car';
import { config } from './Config';
import type { DeathRay } from './DeathRay';

/** reused across rays, the death line only moves in y between runs */
const RAY_A: Vector = { x: 0, y: 0 };
const RAY_B: Vector = { x: 500, y: 0 };

/** a linear fan with fixed reach: wide and shallow, the same cone every frame */
export class Sensor extends RayFan2D {
  car: Car;

  constructor(car: Car) {
    super(
      config.SENSORS,
      (i) =>
        lerp(
          config.SENSOR_ANGLE / 2,
          -config.SENSOR_ANGLE / 2,
          config.SENSORS === 1 ? 0.5 : i / (config.SENSORS - 1),
        ),
      () => ({ x: config.SENSORS_MAX_WIDTH, y: config.SENSORS_MAX_DEPTH }),
    );
    this.car = car;
  }

  update(roadBorders: Vector[][], traffic: Car[], deathRays: DeathRay[]) {
    this.cast(this.car.x, this.car.y, this.car.angle);
    for (let i = 0; i < this.rays.length; i++) {
      const ray = this.rays[i];
      this.startReading(i);
      for (let j = 0; j < roadBorders.length; j++) {
        const c = roadBorders[j][0];
        const d = roadBorders[j][1];
        this.testSegment(c.x, c.y, d.x, d.y);
      }
      for (let j = 0; j < traffic.length; j++) {
        const other = traffic[j];
        // most rays miss most cars, the box rejects them before any edge test
        if (
          !segmentHitsAABB(ray[0].x, ray[0].y, ray[1].x, ray[1].y, other.aabb)
        ) {
          continue;
        }
        const poly = other.polygon;
        for (let k = 0; k < poly.length; k++) {
          const e = poly[k];
          const f = poly[(k + 1) % poly.length];
          this.testSegment(e.x, e.y, f.x, f.y);
        }
      }
      for (let j = 0; j < deathRays.length; j++) {
        RAY_A.y = deathRays[j].y;
        RAY_B.y = RAY_A.y;
        this.testSegment(RAY_A.x, RAY_A.y, RAY_B.x, RAY_B.y);
      }
      this.readings[i] = this.endReading();
    }
  }

  /** the sensor coverage area, using the current effective ray endpoints */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    this.tracePath(ctx);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.22)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}
