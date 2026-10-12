import { clamp } from '../../../ai/utils';
import { lerp, mulberry32, type Rng } from '../../../utilities/math';
import { config } from './Config';

/** one one-way platform: its top surface sits at y, the body hangs below */
export interface Platform {
  x: number;
  y: number;
  w: number;
}

/**
 * A seeded, infinite tower of one-way platforms. Rows are generated
 * deterministically from the seed and streamed upward on demand as the
 * players climb; the ground at y = 0 always remains. Rows are never culled —
 * a full seed is a few dozen platforms, and culling would void the floor
 * under respawned players.
 */
export class Tower {
  readonly seed: number;
  readonly platforms: Platform[] = [];
  #rng: Rng;
  /** height of the highest generated row */
  #rowY = 0;
  /** horizontal landing band the next row can be placed into, guaranteed
   *  reachable from the previous row */
  #bandLo = 0;
  #bandHi = config.TOWER_WIDTH;
  /** scratch band, reused so no row allocates */
  #landingLo = 0;
  #landingHi = 0;

  constructor(seed: number) {
    this.seed = seed;
    this.#rng = mulberry32(seed + 1);
    // the first row sits just above the ground, wide and centered, so a fresh
    // spawn always has an easy first step
    this.#rowY = config.ROW_SPACING_MIN;
    this.#spawnFirstRow();
  }

  /** tower difficulty in [0, 1], rising with the seed */
  difficulty() {
    return Math.min(1, this.seed / config.DIFFICULTY_SEED_BASE);
  }

  /** Difficulty also ramps with height, so a single tower gets narrower
   *  platforms and wider gaps as the player climbs. A high seed still starts
   *  at its seed difficulty. */
  difficultyAt(y: number) {
    const progressHeight = config.SEED_TARGET_FLOORS * config.FLOOR_HEIGHT;
    const progress = Math.min(1, Math.max(0, y) / progressHeight);
    return Math.max(this.difficulty(), progress);
  }

  /** generate rows until the tower reaches at least `targetY` */
  ensureAbove(targetY: number) {
    while (this.#rowY < targetY) {
      this.#rowY +=
        lerp(
          config.ROW_SPACING_MIN,
          config.ROW_SPACING_MAX,
          this.difficultyAt(this.#rowY),
        ) *
        (0.9 + this.#rng() * 0.2);
      this.#spawnRow();
    }
  }

  #spawnFirstRow() {
    const w = config.PLATFORM_MAX_WIDTH;
    const x = (config.TOWER_WIDTH - w) / 2;
    this.platforms.push({ x, y: this.#rowY, w });
    this.#bandLo = x - config.JUMP_REACH;
    this.#bandHi = x + w + config.JUMP_REACH;
  }

  /** place the next row into the band reachable from the previous one, so
   *  every row is jumpable from the row below */
  #spawnRow() {
    const d = this.difficultyAt(this.#rowY);
    const rng = this.#rng;
    const w = clamp(
      config.PLATFORM_MIN_WIDTH * 0.7,
      config.TOWER_WIDTH,
      lerp(config.PLATFORM_MAX_WIDTH, config.PLATFORM_MIN_WIDTH, d) *
        (0.85 + rng() * 0.3),
    );
    // where a player standing on the previous row could land
    this.#landingLo = Math.max(0, this.#bandLo);
    this.#landingHi = Math.min(config.TOWER_WIDTH, this.#bandHi);
    const landing =
      this.#landingLo + rng() * Math.max(0, this.#landingHi - this.#landingLo);
    const x = clamp(0, config.TOWER_WIDTH - w, landing - w / 2);
    this.platforms.push({ x, y: this.#rowY, w });
    this.#bandLo = x - config.JUMP_REACH;
    this.#bandHi = x + w + config.JUMP_REACH;
  }

  /**
   * One-way landing query: the highest platform top crossed while the feet
   * fell from `prevFeet` to `feet`, overlapping [x - halfW, x + halfW].
   * The top may sit exactly at the start of the interval, so a player
   * standing on a surface is re-caught every frame instead of sinking
   * through it. -1 when nothing was crossed.
   */
  crossedSurface(x: number, halfW: number, prevFeet: number, feet: number) {
    let top = -1;
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      if (p.y > prevFeet + 1e-6 || p.y <= feet - 1e-6) continue;
      if (x + halfW <= p.x || x - halfW >= p.x + p.w) continue;
      if (p.y > top) top = p.y;
    }
    return top;
  }

  /** support query: the platform whose top surface sits within `tolerance`
   *  under the feet, or null when on the ground or over a gap */
  supportPlatform(
    x: number,
    halfW: number,
    feet: number,
    tolerance = 2,
  ): Platform | null {
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      if (Math.abs(p.y - feet) > tolerance) continue;
      if (x + halfW <= p.x || x - halfW >= p.x + p.w) continue;
      return p;
    }
    return null;
  }

  /** the visible window in world y, for culling the draw */
  draw(ctx: CanvasRenderingContext2D, viewMinY: number, viewMaxY: number) {
    const width = config.TOWER_WIDTH;
    const margin = 40;

    // side walls: thick dark lines at the tower edges
    ctx.fillStyle = config.PLATFORM_EDGE;
    ctx.fillRect(-6, viewMinY - margin, 6, viewMaxY - viewMinY + margin * 2);
    ctx.fillRect(width, viewMinY - margin, 6, viewMaxY - viewMinY + margin * 2);

    // floor markers, a subtle dashed line every FLOOR_HEIGHT
    ctx.strokeStyle = config.FLOOR_LINE;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    const firstFloor = Math.max(1, Math.ceil(viewMinY / config.FLOOR_HEIGHT));
    const lastFloor = Math.floor(viewMaxY / config.FLOOR_HEIGHT);
    for (let f = firstFloor; f <= lastFloor; f++) {
      const y = f * config.FLOOR_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // platforms: rounded warm slabs with a thick dark outline
    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      if (p.y < viewMinY - margin || p.y > viewMaxY + margin) continue;
      drawRoundedSlab(ctx, p.x, p.y, p.w, config.PLATFORM_THICKNESS, 5);
    }

    // the ground: grass top over a body, always present
    if (viewMaxY > -config.GROUND_THICKNESS) {
      ctx.fillStyle = config.GROUND_BODY;
      ctx.fillRect(0, -config.GROUND_THICKNESS, width, config.GROUND_THICKNESS);
      ctx.fillStyle = config.GROUND_TOP;
      ctx.fillRect(0, -6, width, 6);
    }
  }
}

/** a horizontal slab with rounded top corners and a dark outline */
export function drawRoundedSlab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y - h);
  ctx.lineTo(x + w - rr, y - h);
  ctx.arcTo(x + w, y - h, x + w, y - h + rr, rr);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x, y);
  ctx.lineTo(x, y - h + rr);
  ctx.arcTo(x, y - h, x + rr, y - h, rr);
  ctx.closePath();
  ctx.fillStyle = config.PLATFORM_COLOR;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = config.PLATFORM_EDGE;
  ctx.stroke();
  // a lighter top edge, the cartoon highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(x + 2, y - 3, w - 4, 2);
}
