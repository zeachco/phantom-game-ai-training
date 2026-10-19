import { mulberry32 } from '../../../utilities/math';
import type { Cave } from './Cave';
import { config } from './Config';

/** where the fixer had to touch a cell: an arc position plus the angle of
 *  the column it moved (or the ramp it placed) */
export interface PathFix {
  s: number;
  angle: number;
}

/** landing-zone runout, in arc units: the extra clear span appended behind
 *  a ramp's back slope (height / launch speed). A ball descending from the
 *  lip keeps moving along the band after touchdown, so the zone keeps
 *  that distance free of in-band columns before the next feature may sit */
export const LANDING_RUNOUT = 60;

/**
 * The path guarantee: every stretch of the cave keeps a drivable line.
 * Runs once at construction, before any mesh is built, mutating the cached
 * feature cells in place:
 *  - in-band columns must leave a gap of at least CAVE_PATH_MIN_GAP on one
 *    side of the band (shifted toward a band edge, or spread apart when a
 *    pair pinches the band);
 *  - every volatile stretch with columns carries a launch ramp over the
 *    rough ground even when the random draw skipped it;
 *  - every ramp keeps a clear landing zone behind its lip.
 * Shifting always works and placing a ramp always works, so an impossible
 * map can never be produced.
 *
 * The validated result is kept on the instance: the sampled drivable line,
 * the extent of every ramp, the clear span of every landing zone and the
 * spots where the fixer ran, so the `?path=1` debug overlay can draw it.
 */
export class PathCheck {
  /** arc samples of the validated drivable line, from the cave mouth to maxS */
  readonly samples: number[] = [];
  /** [from, to] arc extents of every ramp in the validated range: deck start
   *  to the lip back cut */
  readonly ramps: [number, number][] = [];
  /** [from, to] arc spans of every clear landing zone behind a ramp lip */
  readonly landings: [number, number][] = [];
  /** spots on the driving band where the fixer moved a column or placed a
   *  ramp */
  readonly fixes: PathFix[] = [];

  run(cave: Cave, maxS: number): void {
    // the band the guarantee keeps clear is the cave's own: it narrows with
    // the annealed difficulty, and the fixer works on that lane
    const band = cave.bandHalfWidth;
    const radius = config.CAVE_RADIUS;
    const cells = Math.ceil(maxS / config.CAVE_FEATURE_CELL) + 1;

    for (let i = 0; i < cells; i++) {
      const cell = cave.featureCell(i);
      const inBand = cell.columns
        .filter((c) => angleDist(c.angle, Math.PI) < band + 0.3)
        .sort((a, b) => a.angle - b.angle);

      // 1. one column: keep the wider side open at the minimum gap by sliding
      // the column toward the opposite band edge.
      const gapArc = config.CAVE_PATH_MIN_GAP / radius;
      for (const col of inBand) {
        const half = col.angleWidth * 1.5;
        const gapLeft = (col.angle - half) - (Math.PI - band);
        const gapRight = Math.PI + band - (col.angle + half);
        if (Math.max(gapLeft, gapRight) * radius < config.CAVE_PATH_MIN_GAP) {
          // Slide the column out of the band far enough that the wider side
          // keeps the minimum gap, whatever the column's own width is.
          col.angle =
            gapLeft >= gapRight
              ? Math.PI - band + gapArc + half
              : Math.PI + band - gapArc - half;
          this.fixes.push({ s: col.centerS, angle: col.angle });
        }
      }

      // 2. a pair of in-band columns: spread them so a full car width plus
      // margin passes between them.
      for (let k = 1; k < inBand.length; k++) {
        const prev = inBand[k - 1];
        const next = inBand[k];
        const gap =
          (next.angle - prev.angle) * radius -
          radius * (prev.angleWidth + next.angleWidth) * 1.5;
        if (gap < config.CAVE_PATH_MIN_GAP) {
          next.angle =
            prev.angle +
            config.CAVE_PATH_MIN_GAP / radius +
            (prev.angleWidth + next.angleWidth) * 1.5;
          this.fixes.push({ s: next.centerS, angle: next.angle });
        }
      }

      // 3. a volatile stretch with columns but no launch ramp gets one, so
      // the ball can launch over rough ground on momentum instead of grinding.
      if (cell.volatility >= 0.7 && cell.columns.length > 0 && !cell.ramp) {
        const rng = mulberry32((cave.seed ^ (i * 0x9e3779b9)) >>> 0 || 1);
        const target = cell.columns[0].centerS;
        cell.ramp = {
          centerS: Math.max(
            i * config.CAVE_FEATURE_CELL + 8,
            target - config.CAVE_RAMP_LEAD - rng() * 30,
          ),
          halfLen: config.CAVE_RAMP_LENGTH / 2,
          angle: Math.PI,
          angleWidth: 0.4,
          height: config.CAVE_RAMP_HEIGHT,
        };
        this.fixes.push({ s: cell.ramp.centerS, angle: cell.ramp.angle });
      }

      // 4. every ramp keeps a clear landing zone behind its lip: no in-band
      // column inside the back slope plus a car length of run-out.
      if (cell.ramp) {
        const landingFrom = cell.ramp.centerS;
        const landingTo =
          cell.ramp.centerS + cell.ramp.height / 0.35 + LANDING_RUNOUT;
        for (const col of cell.columns) {
          if (
            col.centerS + col.halfLen > landingFrom &&
            col.centerS - col.halfLen < landingTo &&
            angleDist(col.angle, Math.PI) < band + 0.3
          ) {
            col.angle =
              col.angle > Math.PI
                ? Math.PI + band + 0.35
                : Math.PI - band - 0.35;
            this.fixes.push({ s: col.centerS, angle: col.angle });
          }
        }
        this.ramps.push([
          cell.ramp.centerS - cell.ramp.halfLen * 2,
          cell.ramp.centerS + config.CAVE_RAMP_LIP_DROP,
        ]);
        this.landings.push([landingFrom, landingTo]);
      }
    }

    // the validated line is the band center over the whole validated range
    for (let s = 0; s <= maxS; s += 20) this.samples.push(s);
  }
}

function angleDist(a: number, b: number) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}
