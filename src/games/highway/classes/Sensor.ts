import type { Car } from './Car';
import { getIntersection, lerp, Vector } from '../../../utilities/math';
import { config } from './Config';
import { DeathRay } from './DeathRay';

export class Sensor {
  car: Car;
  rayCount: number;
  rays: Vector[][];
  readings: { x: number; y: number; offset: number }[];
  constructor(car: Car) {
    this.car = car;
    this.rayCount = config.SENSORS;

    this.rays = [];
    this.readings = [];
  }

  update(roadBorders: Vector[][], traffic: Car[], deathRays: DeathRay[]) {
    this.#castRays();
    this.readings = [];
    for (let i = 0; i < this.rays.length; i++) {
      this.readings.push(this.#getReading(this.rays[i], roadBorders, traffic, deathRays));
    }
  }

  #getReading(ray: Vector[], roadBorders: Vector[][], traffic: Car[], deathRays: DeathRay[]) {
    let touches: any[] = [];

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
      const poly = traffic[i].polygon;
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
      const touch = getIntersection(
        ray[0],
        ray[1],
        { x: 0, y: deathRays[i].y },
        { x: 500, y: deathRays[i].y },
      );
      if (touch) {
        touches.push(touch);
      }
    }

    if (touches.length == 0) {
      return null;
    } else {
      const offsets = touches.map((e) => e.offset);
      const minOffset = Math.min(...offsets);
      return touches.find((e) => e.offset == minOffset);
    }
  }

  #castRays() {
    this.rays = [];
    for (let i = 0; i < this.rayCount; i++) {
      const rayAngle =
        lerp(
          config.SENSOR_ANGLE / 2,
          -config.SENSOR_ANGLE / 2,
          this.rayCount == 1 ? 0.5 : i / (this.rayCount - 1),
        ) + this.car.angle;

      const start = { x: this.car.x, y: this.car.y };
      const end = {
        x: this.car.x - Math.sin(rayAngle) * config.SENSORS_MAX_WIDTH,
        y: this.car.y - Math.cos(rayAngle) * config.SENSORS_MAX_DEPTH,
      };
      this.rays.push([start, end]);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.rays.length; i++) {
      let end: any = this.rays[i][1];
      if (this.readings[i]) {
        end = this.readings[i];
      }

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'yellow';
      ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'black';
      ctx.moveTo(this.rays[i][1].x, this.rays[i][1].y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  }
}
