import { isDemo, likelyLagsOnHeavyJs } from '../../../utilities/env';

export { isDemo, likelyLagsOnHeavyJs };

/** `?slots=N` overrides the per-platform sensor slot count, e.g. ?slots=15. */
export const SLOTS = (() => {
  if (typeof window === 'undefined') return 10;
  const match = location.search.match(/[?&]slots=(\d+)/);
  if (!match) return 10;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(30, parsed)) : 10;
})();

/**
 * Total brain inputs: four channels per slot (dx, dy, visible, width), then
 * eight body channels (left wall, right wall, vx, vy, grounded, current
 * platform to left wall, current platform to right wall, combo value).
 */
export const CLIMB_INPUT_COUNT = SLOTS * 4 + 8;

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
  /** score lost when a player dies of the height budget; steeper than the
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
  /** widest platforms, at the foot of the tower; rows narrow toward
   *  PLATFORM_MIN_WIDTH as the tower climbs */
  public PLATFORM_MAX_WIDTH = 180;
  /** vertical gap between rows, widening with tower difficulty */
  public ROW_SPACING_MIN = 32;
  public ROW_SPACING_MAX = 42;
  /** seed at which the tower difficulty reaches its maximum */
  public DIFFICULTY_SEED_BASE = 100;
  /** rows are generated this far above the highest living player */
  public AHEAD = 800;
  /** horizontal landing reach used to randomize the next platform's center.
   *  The band spans nearly the full tower width, so rows spread left and
   *  right across the tower instead of clustering over the previous row.
   *  Combo jumps are what let a player recover the larger gaps created by
   *  removed rows. */
  public JUMP_REACH = 240;
  /** floor number at which one platform-removal slot is guaranteed. Below it,
   *  the removal rate is a fractional chance; above it, the fractional part
   *  adds another removed row half the time, for example. */
  public PLATFORM_REMOVAL_RATE_FLOOR = 100;
  /** never remove more than this many consecutive generated rows */
  public MAX_REMOVED_PLATFORMS_IN_ROW = 4;
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
  public GRAVITY = 0.1875;
  /** grounded jump impulse at zero horizontal speed; the launch impulse is
   *  scaled so a player moving at MAX_SPEED gets up to 2x the jump height */
  public JUMP_SPEED = 6.75;
  public MAX_JUMP_HEIGHT_MULTIPLIER = 2;
  /** top horizontal speed in u/f */
  public MAX_SPEED = 7;
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
  /** falling this far below the last surface the feet stood on kills; the
   *  reference is the last touched platform, so a jump's own rise is never
   *  counted against the fall. About twice the old 130u threshold. */
  public DEATH_HEIGHT = 260;
  /** physics terminal speed for long falls; kept well above the death speed
   *  so the lethal threshold stays reachable while keeping corpse falls
   *  numerically stable */
  public TERMINAL_VELOCITY = 20;
  /** a player that fails to set a new personal-best height for this many
   *  simulation frames dies: ~5.6 s at the 90 FPS reference */
  public HEIGHT_BUDGET_FRAMES = 500;
  /** a jump must follow a landing within this many simulation frames to keep
   *  the climb combo alive */
  public COMBO_FRAME_BUDGET = 8;
  /** combo values are displayed as x2..x10; x1 is the landing starter */
  public MAX_COMBO = 10;
  /** x2 is 1.1x the normal jump strength; each later step adds the same
   *  tenth-strength increment, capped by MAX_COMBO */
  public COMBO_JUMP_STRENGTH = 1.1;

  // sensors, object-centric: one slot per each of the SLOTS vertically
  // nearest platforms (dx, dy, visible, width, the standing platform
  // excluded), then the body channels. SENSOR_LENGTH scales the slot
  // dx/dy; wall and platform-edge distances scale by TOWER_WIDTH.
  public SENSOR_LENGTH = 300;

  public CLEAR_STORAGE =
    typeof window !== 'undefined' && /clear/.test(window.location.href);
  /** browser cap while the human is active, so the reference 90 FPS rate is
   *  what the human plays at even when following an AI player */
  public HUMAN_FPS_CAP_ENABLED = true;
  public HUMAN_FPS_CAP = 90;
}

export const config = new Config();
