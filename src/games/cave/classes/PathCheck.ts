import { mulberry32 } from '../../../utilities/math';
import type { Cave } from './Cave';
import { config } from './Config';

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
 */
export function ensureDrivablePath(cave: Cave, maxS: number): void {
  const band = config.CAVE_BAND_HALF_WIDTH;
  const radius = config.CAVE_RADIUS;
  const cells = Math.ceil(maxS / config.CAVE_FEATURE_CELL) + 1;

  for (let i = 0; i < cells; i++) {
    const cell = cave.featureCell(i);
    const inBand = cell.columns
      .filter((c) => angleDist(c.angle, Math.PI) < band + 0.3)
      .sort((a, b) => a.angle - b.angle);

    // 1. one column: keep the wider side open at the minimum gap by sliding
    // the column toward the opposite band edge.
    for (const col of inBand) {
      const half = col.angleWidth * 1.5;
      const gapLeft = (col.angle - half - (Math.PI - band)) * radius;
      const gapRight = ((Math.PI + band) - (col.angle + half)) * radius;
      if (Math.max(gapLeft, gapRight) < config.CAVE_PATH_MIN_GAP) {
        col.angle =
          gapLeft >= gapRight ? Math.PI + band - 0.28 : Math.PI - band + 0.28;
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
      }
    }

    // 3. a volatile stretch with columns but no launch ramp gets one, so
    // the car can jump the rough ground instead of grinding through it.
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
    }

    // 4. every ramp keeps a clear landing zone behind its lip: no in-band
    // column inside the back slope plus a car length of run-out.
    if (cell.ramp) {
      const landingFrom = cell.ramp.centerS;
      const landingTo = cell.ramp.centerS + cell.ramp.height / 0.35 + 60;
      for (const col of cell.columns) {
        if (
          col.centerS + col.halfLen > landingFrom &&
          col.centerS - col.halfLen < landingTo &&
          angleDist(col.angle, Math.PI) < band + 0.3
        ) {
          col.angle =
            col.angle > Math.PI ? Math.PI + band + 0.35 : Math.PI - band - 0.35;
        }
      }
    }
  }
}

function angleDist(a: number, b: number) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}
