import { clamp } from '../../../utilities/math';
import { config, SLOTS } from './Config';
import type { Platform, Tower } from './Tower';

/**
 * Object-centric sensor: one slot per each of the `slotCount` vertically
 * nearest platforms, plus seven body channels. The platform the player is
 * standing on is excluded from the slots — its geometry comes from the two
 * edge channels instead.
 *
 * Slot channels (in order): dx and dy from the sensor origin to the
 * platform center (signed, positive dy = above, scaled by SENSOR_LENGTH,
 * clamped to ±1), visible (1/0, 0 for an empty slot), width (scaled by
 * PLATFORM_MAX_WIDTH).
 *
 * Body channels (in order): distance to the left wall and to the right wall
 * (scaled by TOWER_WIDTH), horizontal and vertical velocity, ground contact
 * (1/0), the standing platform's distances to the left and right walls
 * (0 when standing on the ground or not standing at all), and the normalized
 * combo value.
 *
 * Slots fill deterministically: the tower's rows are sorted by y, so a
 * two-pointer walk from the player's row outward always puts the closest
 * row in slot 0, the next closest in slot 1, and so on.
 */
export class Sensor {
  readonly slotCount: number;
  /** total brain inputs, `slotCount * 4 + 8` */
  readonly inputCount: number;
  /** normalized inputs, refreshed in place */
  readonly readings: number[];
  /** platform per slot after the last update, for drawing */
  #slots: (Platform | null)[];

  constructor(slotCount = SLOTS) {
    this.slotCount = slotCount;
    this.inputCount = slotCount * 4 + 8;
    this.readings = new Array(this.inputCount).fill(0);
    this.#slots = new Array(slotCount).fill(null);
  }

  /**
   * Refresh all readings. `x` is the player's center x, `bodyY` the sensor
   * origin (body center), `current` the platform under the feet (null when
   * on the ground or airborne without one).
   */
  update(
    x: number,
    bodyY: number,
    vx: number,
    vy: number,
    grounded: boolean,
    tower: Tower,
    current: Platform | null,
    comboValue = 0,
  ) {
    const platforms = tower.platforms;
    const n = platforms.length;

    // Rows are sorted by y: find the first row at or above the origin, then
    // walk the pointers outward, always taking the closer row.
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (platforms[mid].y < bodyY) lo = mid + 1;
      else hi = mid;
    }
    let above = lo;
    let below = lo - 1;

    const L = config.SENSOR_LENGTH;
    const slots = this.#slots;
    const readings = this.readings;
    for (let s = 0; s < this.slotCount; s++) {
      let plat: Platform | null = null;
      for (;;) {
        const b = below >= 0 ? platforms[below] : null;
        const a = above < n ? platforms[above] : null;
        if (!b && !a) break;
        let pick: Platform;
        let stepUp: boolean;
        if (!b) {
          pick = a as Platform;
          stepUp = true;
        } else if (!a) {
          pick = b;
          stepUp = false;
        } else {
          // y is strictly increasing, so the two distances are unequal in
          // practice; the tie still resolves deterministically (lower row).
          stepUp = a.y - bodyY < bodyY - b.y;
          pick = stepUp ? a : b;
        }
        if (stepUp) above++;
        else below--;
        if (pick === current) continue;
        plat = pick;
        break;
      }
      slots[s] = plat;
      const r = s * 4;
      if (plat) {
        readings[r] = clamp((plat.x + plat.w * 0.5 - x) / L, -1, 1);
        readings[r + 1] = clamp((plat.y - bodyY) / L, -1, 1);
        readings[r + 2] = 1;
        readings[r + 3] = Math.min(1, plat.w / config.PLATFORM_MAX_WIDTH);
      } else {
        readings[r] = 0;
        readings[r + 1] = 0;
        readings[r + 2] = 0;
        readings[r + 3] = 0;
      }
    }

    // Body channels.
    const o = this.slotCount * 4;
    const W = config.TOWER_WIDTH;
    readings[o] = clamp(x / W, 0, 1);
    readings[o + 1] = clamp((W - x) / W, 0, 1);
    readings[o + 2] = clamp(vx / config.MAX_SPEED, -1, 1);
    readings[o + 3] = clamp(vy / config.JUMP_SPEED, -1, 1);
    readings[o + 4] = grounded ? 1 : 0;
    readings[o + 5] = current ? clamp(current.x / W, 0, 1) : 0;
    readings[o + 6] = current
      ? clamp((W - current.x - current.w) / W, 0, 1)
      : 0;
    readings[o + 7] = clamp(comboValue / config.MAX_COMBO, 0, 1);
  }

  /** draw the tracked platforms, only ever used for the followed player */
  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const plat of this.#slots) {
      if (!plat) continue;
      const py = plat.y - config.PLATFORM_THICKNESS * 0.5;
      ctx.moveTo(cx, cy);
      ctx.lineTo(plat.x + plat.w * 0.5, py);
      // width bracket at the platform's mid-height
      ctx.moveTo(plat.x, py);
      ctx.lineTo(plat.x + plat.w, py);
    }
    ctx.stroke();
    ctx.restore();
  }
}
