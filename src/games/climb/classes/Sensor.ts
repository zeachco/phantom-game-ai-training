import { config, SENSORS } from './Config';
import type { Tower } from './Tower';

/**
 * A full 360° ring of rays around the player. Ray 0 points right (+x), the
 * ring is counter-clockwise in world space (y up), so with the default count
 * ray SENSORS/4 points up and ray SENSORS/2 straight down.
 *
 * Odd rays report the nearest obstacle. Even rays pass through that obstacle
 * and report the next one. The ground counts as an obstacle; side walls are
 * intentionally invisible to the sensor ring.
 *
 * A reading is `1 − hit/SENSOR_LENGTH` (1 on contact, 0 when nothing is hit),
 * circuit's convention.
 */
export class Sensor {
  readonly rayCount: number;
  /** normalized readings, one per ray, refreshed in place */
  readonly readings: number[];
  /** precomputed ray directions (unit) and full segment lengths */
  #cos: number[] = [];
  #sin: number[] = [];
  constructor(rayCount = SENSORS) {
    this.rayCount = rayCount;
    this.readings = new Array(rayCount).fill(0);
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      this.#cos.push(Math.cos(angle));
      this.#sin.push(Math.sin(angle));
    }
  }

  update(cx: number, cy: number, tower: Tower) {
    const L = config.SENSOR_LENGTH;
    const thickness = config.PLATFORM_THICKNESS;
    const platforms = tower.platforms;
    const readings = this.readings;
    const cos = this.#cos;
    const sin = this.#sin;

    for (let i = 0; i < this.rayCount; i++) {
      const dx = cos[i] * L;
      const dy = sin[i] * L;
      let nearest = 1;
      let next = 1;

      // The ground is the first obstacle for a downward ray when nothing
      // else is between the player and it. Keep the two nearest hits so even
      // rays can see through one platform and report the next one.
      if (sin[i] < 0) {
        const t = slabEntryT(
          cx,
          cy,
          dx,
          dy,
          0,
          -config.GROUND_THICKNESS,
          config.TOWER_WIDTH,
          0,
        );
        if (t >= 0 && t < next) {
          if (t < nearest) {
            next = nearest;
            nearest = t;
          } else next = t;
        }
      }

      // Platforms: side walls are deliberately not tested. The loose axis
      // filters keep slab tests to rows the ray can actually reach.
      const yLo = cy - L;
      const yHi = cy + L;
      const xLo = cx - L;
      const xHi = cx + L;
      for (let p = 0; p < platforms.length; p++) {
        const plat = platforms[p];
        if (plat.y < yLo || plat.y > yHi) continue;
        if (plat.x + plat.w < xLo || plat.x > xHi) continue;
        const t = slabEntryT(
          cx,
          cy,
          dx,
          dy,
          plat.x,
          plat.y - thickness,
          plat.x + plat.w,
          plat.y,
        );
        if (t >= 0 && t < next) {
          if (t < nearest) {
            next = nearest;
            nearest = t;
          } else next = t;
        }
      }

      const hit = i % 2 === 0 ? next : nearest;
      readings[i] = hit >= 1 ? 0 : 1 - hit;
    }
  }

  /** draw the current rays, only ever used for the followed player */
  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
    const L = config.SENSOR_LENGTH;
    const readings = this.readings;
    const cos = this.#cos;
    const sin = this.#sin;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.rayCount; i++) {
      const d = (1 - readings[i]) * L;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + cos[i] * d, cy + sin[i] * d);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Slab entry offset of the segment (ox,oy) → (ox+dx, oy+dy) into an
 * axis-aligned box, in [0, 1]. -1 when the segment misses the box.
 */
function slabEntryT(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): number {
  let tmin = 0;
  let tmax = 1;

  if (dx === 0) {
    if (ox < minX || ox > maxX) return -1;
  } else {
    const inv = 1 / dx;
    let t1 = (minX - ox) * inv;
    let t2 = (maxX - ox) * inv;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
  }

  if (dy === 0) {
    if (oy < minY || oy > maxY) return -1;
  } else {
    const inv = 1 / dy;
    let t1 = (minY - oy) * inv;
    let t2 = (maxY - oy) * inv;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
  }

  return tmin > tmax ? -1 : tmin;
}
