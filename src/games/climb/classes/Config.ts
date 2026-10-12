import { CTRL_COLORS } from '../../../ai/utils';

/** `?demo=true` is the light showcase profile: the hosted demo skips the
 *  model panel entirely and runs a small population. */
export const isDemo =
  typeof window !== 'undefined' && location.href.includes('demo=true');

/** `?sensors=N` overrides the 360° ray count, e.g. ?sensors=45 halves it. */
export const SENSORS = (() => {
  if (typeof window === 'undefined') return 90;
  const match = location.search.match(/[?&]sensors=(\d+)/);
  if (!match) return 90;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? Math.max(8, Math.min(180, parsed)) : 90;
})();

export function likelyLagsOnHeavyJs(): boolean {
  if (typeof window === 'undefined') return true;
  if (isDemo) return true;
  const cores = navigator.hardwareConcurrency ?? 8; // undefined on very old browsers
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8; // Chromium only, GiB, rounded to 0.25..8
  return cores <= 4 || memory <= 4;
}

class Config {
  // population
  /** every brain category runs a pool of exactly this many players, slots
   *  0..N-1. Deaths are frequent in a tower (missed rows kill), so the pools
   *  are twice the light profile's size */
  public CARS_PER_GROUP = isDemo ? 6 : likelyLagsOnHeavyJs() ? 15 : 30;
  public MAX_MUTATION_LVL = 0.5;
  /** floor of the mutation schedule: exploration never fully dies, so a
   *  population that has climbed many seeds keeps the ability to escape the
   *  champion line it converged on */
  public MIN_MUTATION_LVL = 0.1;
  /** seeds over which the max mutation shrinks from MAX down to MIN */
  public MUTATION_SEED_DECAY = 50;
  /** a group that has seen one of its players reach the seed height target
   *  respawns as a mutation-only swarm of this many players, on slots 1..N,
   *  so the untouched champion never re-enters that pool */
  public FINISHED_CARS_PER_GROUP = 5;
  /** a finished group's players mutate at max / this divisor: the brain
   *  already won this seed, but the swarm keeps hunting genuinely different
   *  lines for the next one instead of freezing the champion */
  public FINISHED_SWARM_DIVISOR = 5;
  /** the slot ladder divides the max mutation by the slot number, capped here:
   *  without the cap the late slots mutate by ~0 and most of the pool becomes
   *  a clone of the champion */
  public MUTATION_LADDER_CAP = 10;
  /** the last slot of a pool drives a fresh fully-random brain instead of a
   *  champion mutation: a standing source of novelty, so the population can
   *  never fully converge on one overfit line */
  public EXPLORER_CARS = 1;
  /** random explorers only earn a slot while the group is still finding its
   *  feet: once its players have banked this many floors on the current
   *  seed, the line is proven and the slot reverts to a regular mutation
   *  player, because a blank brain can no longer beat the established line */
  public EXPLORER_FLOOR_LIMIT = 10;
  /** hall of fame: recent lines kept per brain category. The newest one is
   *  the champion, the older ones are re-explored by the scout slot, so a
   *  second family of weights survives even when the champion line overfits
   *  the towers it saw */
  public HALL_OF_FAME_SIZE = 3;
  /** cap of brain variants, the keyboard shortcuts only cover 1..9 */
  public MAX_NETWORK_LAYERS = 9;
  /** corpses linger that long after the death, fading from 0.5 to 0 opacity;
   *  a whole group respawns together once every member's corpse has expired */
  public DEAD_LIFETIME = 3000;
  /** score lost when an AI player dies of the height budget; steeper than the
   *  worst impact-speed debt so idling is never the cheaper way out */
  public STALL_PENALTY = 9;

  // mixed: a brain that picks which trained brain drives
  public MIXED_ENABLED = true;
  /** below that there is nothing to arbitrate, the run is skipped */
  public MIXED_MIN_EXPERTS = 2;
  /** how many saved brains per layer become selectable experts */
  public MIXED_EXPERTS_PER_LAYER = 1;
  /** single hidden layer, it only has to route the inputs to the right brain */
  public MIXED_HIDDEN_NODES = 12;
  /** odds of rerolling every weight leading to one expert, scaled by the factor */
  public MIXED_RESET_CHANCE = 0.15;
  /** the mixed identity color, CTRL_COLORS[0]: mixed groups live on layer 0 */
  public MIXED_COLOR = CTRL_COLORS[0];

  // visual
  public SCORES_NB = this.MAX_NETWORK_LAYERS * 2;
  public SKY_TOP = '#7ec8e3';
  public SKY_BOTTOM = '#dff3f7';
  public PLATFORM_COLOR = '#c98a4b';
  public PLATFORM_EDGE = '#5b3a1e';
  public GROUND_TOP = '#69b34c';
  public GROUND_BODY = '#8a5a33';
  public CLOUD_COLOR = 'rgba(255, 255, 255, 0.75)';
  public FLOOR_LINE = 'rgba(0, 0, 0, 0.12)';

  // tower, a fixed-width column of one-way platforms. All distances in world
  // units, all rates per frame at the 90 FPS reference
  public TOWER_WIDTH = 640;
  /** visual thickness of the ground slab below y = 0 */
  public GROUND_THICKNESS = 40;
  public PLATFORM_THICKNESS = 14;
  public PLATFORM_MIN_WIDTH = 60;
  public PLATFORM_MAX_WIDTH = 140;
  /** vertical gap between rows, widening with tower difficulty */
  public ROW_SPACING_MIN = 32;
  public ROW_SPACING_MAX = 42;
  /** seed at which the tower difficulty reaches its maximum */
  public DIFFICULTY_SEED_BASE = 100;
  /** rows are generated this far above the highest living player */
  public AHEAD = 800;
  /** horizontal landing reach from one row to the next: the max-speed airtime
   *  at the worst row spacing, minus a margin so every row is jumpable */
  public JUMP_REACH = 55;
  /** one scored floor of personal-best height */
  public FLOOR_HEIGHT = 50;
  /** floors that count as a completed seed: the score target per seed */
  public SEED_TARGET_FLOORS = 50;
  /** groups that hold the seed target before the countdown starts */
  public FINISHED_GROUPS_PER_SEED = 3;
  /** wall-clock countdown before the seed advances, once the groups qualify */
  public SEED_CHANGE_MS = 10_000;

  // player physics, tuned per frame at the 90 FPS reference. The simulation
  // runs every animation frame, so on a faster machine the world simply runs
  // faster — every frame count below is relative to that
  public GRAVITY = 0.75;
  /** grounded jump impulse at zero horizontal speed; the launch impulse is
   *  scaled so a player moving at MAX_SPEED gets up to 2x the jump height */
  public JUMP_SPEED = 9;
  public MAX_JUMP_HEIGHT_MULTIPLIER = 2;
  /** top horizontal speed in u/f */
  public MAX_SPEED = 7;
  /** horizontal speed multiplier when bouncing off a side wall */
  public WALL_BOUNCE = 1.1;
  /** ground horizontal acceleration per frame, deliberately gentle for the
   *  doubled top speed */
  public ACCEL = 0.3;
  /** air control, a fraction of the ground acceleration */
  public AIR_ACCEL = 0.105;
  /** ground velocity kept per idle frame: the player slides a little, not
   *  much — a released key settles in about a fifth of a second */
  public GROUND_FRICTION = 0.88;
  /** frames after the last grounded frame during which a jump press still
   *  fires, so walking off an edge does not cost the jump */
  public COYOTE_FRAMES = 6;
  /** frames a jump press is remembered before landing */
  public JUMP_BUFFER_FRAMES = 6;
  /** safe fall distance is about twice the old 130u threshold */
  public DEATH_HEIGHT = 260;
  /** falling at or below the speed reached after DEATH_HEIGHT of free fall */
  public DEATH_VELOCITY = Math.sqrt(2 * this.GRAVITY * this.DEATH_HEIGHT);
  /** physics terminal speed, just above the death speed so the threshold is
   *  reachable while keeping corpses' falls numerically stable */
  public TERMINAL_VELOCITY = 20;
  /** an AI player that fails to set a new personal-best height for this many
   *  simulation frames dies: 5 s at the 90 FPS reference */
  public HEIGHT_BUDGET_FRAMES = 450;

  // sensors, a full 360° ring around the player. Odd rays report the nearest
  // obstacle; even rays pass through it to the next. Horizontal rays report
  // side walls only and ignore platforms.
  public SENSOR_LENGTH = 300;

  public CLEAR_STORAGE =
    typeof window !== 'undefined' && /clear/.test(window.location.href);
  /** optional browser cap while a human is actively being followed, so the
   *  reference 90 FPS rate is what the human plays at */
  public HUMAN_FPS_CAP_ENABLED = true;
  public HUMAN_FPS_CAP = 90;
}

export const config = new Config();
