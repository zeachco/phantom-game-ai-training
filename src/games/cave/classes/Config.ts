import { CTRL_COLORS } from '../../../ai/utils';
import { isDemo, likelyLagsOnHeavyJs } from '../../../utilities/env';

export { isDemo, likelyLagsOnHeavyJs };

class Config {
  // population
  /** number of AI car slots: each slot holds one car at a time (alive or a
   *  corpse), so the cave never holds more AI cars than this */
  public CAR_NB = 200;
  public MAX_MUTATION_LVL = 0.5;
  /** floor of the mutation schedule: exploration never fully dies, so a
   *  population that has run many caves keeps the ability to escape the
   *  champion line it converged on */
  public MIN_MUTATION_LVL = 0.1;
  /** the demo profile only simulates three balls per brain, one original
   *  and two mutations; the full profile is much richer */
  public DEMO = isDemo;
  /** every brain category runs a pool of exactly this many balls, slots
   *  0..N-1. Much smaller than the car game: the cave sphere physics and the
   *  ray sensors cost far more per ball, so the 3D training pool stays small */
  public CARS_PER_GROUP = isDemo ? 3 : likelyLagsOnHeavyJs() ? 4 : 6;
  /** a group that has seen one of its cars finish respawns as a
   *  mutation-only swarm of this many cars, on slots 1..N, so the untouched
   *  champion never re-enters that pool */
  public FINISHED_CARS_PER_GROUP = isDemo ? 3 : 5;
  /** a finished group's cars mutate at max / this divisor: the brain already
   *  won this cave, but the swarm keeps hunting genuinely different lines
   *  for the next one instead of freezing the champion */
  public FINISHED_SWARM_DIVISOR = 5;
  /** gates over which the max mutation shrinks from MAX down to MIN */
  public MUTATION_LAP_DECAY = 50;
  /** the slot ladder divides the max mutation by the slot number, capped here:
   *  without the cap the late slots mutate by ~0 and most of the pool becomes
   *  a clone of the champion */
  public MUTATION_LADDER_CAP = 10;
  /** the last slots of a pool drive a fresh fully-random brain instead of a
   *  champion mutation: a standing source of novelty, so the population can
   *  never fully converge on one overfit line. The demo runs originals and
   *  mutations only, nothing random */
  public EXPLORER_CARS = isDemo ? 0 : 1;
  /** random explorers only earn a car slot while the group is still finding
   *  its feet: once its cars have claimed this many gates on the current
   *  seed, the line is proven and the slot reverts to a regular mutation
   *  car, because a blank brain can no longer beat the established line */
  public EXPLORER_LAP_LIMIT = 2;
  /** hall of fame: recent lines kept per brain category. The newest one is
   *  the champion, the older ones are re-explored by the scout slot, so a
   *  second family of weights survives even when the champion line overfits
   *  the caves it saw */
  public HALL_OF_FAME_SIZE = 3;
  /** cap of brain variants, the keyboard shortcuts only cover 1..9 */
  public MAX_NETWORK_LAYERS = 9;
  /** arc distance from the cave mouth to the spawn point, before the first gate */
  public SPAWN_OFFSET = 100;
  /** corpses linger that long after the crash, fading from 0.5 to 0 opacity;
   *  a whole group respawns together once every member's corpse has expired */
  public DEAD_LIFETIME = 3000;
  /** a car under this speed (u/f) is stalling; SECTION_BUDGET_FRAMES of that
   *  in a row kills it */
  public BALL_STALL_SPEED = 0.8;
  /** score lost when a car dies of a stall; steeper than the worst wall hit
   *  so idling is never the cheaper way out */
  public STALL_PENALTY = 9;

  // mixed: a brain that picks which trained brain drives
  public MIXED_ENABLED = true;
  /** floor on the mutating mixed cars, the run needs a spread to arbitrate */
  public MIXED_MIN_CARS = 20;
  /** below that there is nothing to arbitrate, the run is skipped */
  public MIXED_MIN_EXPERTS = 2;
  /** how many saved brains per layer become selectable experts */
  public MIXED_EXPERTS_PER_LAYER = 1;
  /** single hidden layer, it only has to route the inputs to the right brain */
  public MIXED_HIDDEN_NODES = 12;
  /** odds of rerolling every weight leading to one expert, scaled by the factor */
  public MIXED_RESET_CHANCE = 0.15;
  public MIXED_MAX_MUTATION_LVL = 0.3;
  /** the mixed identity color, CTRL_COLORS[0]: mixed groups live on layer 0 */
  public MIXED_COLOR = CTRL_COLORS[0];

  // visual
  public SCORES_NB = this.MAX_NETWORK_LAYERS * 2;
  /** scene background and fog, the cave is darker than its mouth */
  public PLANE_COLOR = '#05070a';
  public CAVE_COLOR = '#ffffff';
  public GATE_COLORS = ['#ffffff', '#aa88bb'];
  /** arc distance around the followed car inside which car meshes sync */
  public VISUAL_RANGE = 700;
  /** Fixed world-space offset behind the ball; independent of its motion. */
  public CAMERA_FOLLOW_DISTANCE = 60;
  public CAMERA_FOLLOW_HEIGHT = 12;
  /** Keep this much clear between the camera and a blocked boom. */
  public CAMERA_COLLISION_MARGIN = 2;

  // env, the sensor is a forward cone opening along the ball's movement
  // direction: a center ray plus concentric rings, the longest reach straight
  // down the axis and a shorter reach at the rim, so the brain gets a 3D view
  // of the tube ahead. Two extra rays stay world-up and world-down for the
  // floor and the ceiling regardless of which way the ball is moving.
  public SENSORS = 9;
  /** total cone angle: the rim sits this many radians off the movement axis */
  public SENSOR_ANGLE = (Math.PI / 180) * 120;
  /** concentric rings the cone spreads its rays over, besides the center ray;
   *  ring ray counts are sized to the ring circumference so coverage is even */
  public SENSOR_CONE_RINGS = 2;
  /** below this speed (u/f) the cone axis falls back to the cave tangent: a
   *  near-still velocity direction is just noise */
  public SENSOR_MIN_AXIS_SPEED = 0.5;
  /** how many checkpoints ahead the cone aims. The ball's next gate counts as
   *  the first checkpoint later, so 2 lands on the gate after it, pulling the
   *  cone around an upcoming turn instead of down the current velocity */
  public SENSOR_AHEAD_CHECKPOINTS = 2;
  /** cone axis blend: this share of the current movement direction ... */
  public SENSOR_AXIS_VELOCITY_WEIGHT = 0.3;
  /** ... and this share of the direction to the lookahead checkpoint */
  public SENSOR_AXIS_CHECKPOINT_WEIGHT = 0.7;
  /** reach of the center ray, along the cone axis */
  public SENSORS_MAX_LENGTH = 336;
  /** reach of the rim rays, preserving the 60% edge-to-center profile */
  public SENSORS_EDGE_LENGTH = 202;
  /** reach of the vertical rays, the cave never gets higher than this */
  public VERTICAL_RAY_LENGTH = 46;
  /** march step of the analytic ray test, smaller = tighter hit distance */
  public RAY_STEP = 2.5;

  // ball, Monkey Ball style: a sphere that rolls through the tube. The stick
  // accelerates it in the camera/track plane, gravity and the walls do the
  // rest.
  /** top speed in u/f. Kept low so the ball feels heavy; collected coins are
   *  the only way past it */
  public BALL_MAX_SPEED = 6 / 3;
  /** sphere radius: collision, rendering and camera framing all read it */
  public BALL_RADIUS = 1.4;
  /** world down acceleration per frame^2. Light gravity lets a fast ball
   *  carry valley momentum into a higher, longer natural launch. */
  public BALL_GRAVITY = 0.085;
  public PHYSICS_SUBSTEPS = 4;
  /** stick-directed acceleration (u/f^2) at full deflection */
  public BALL_ACCEL = 0.17 / 3;
  /** Grounded jump impulse in world units per frame. */
  public BALL_JUMP_SPEED = 1.8;
  /** Frames after the last jumpable contact during which a jump press is
   *  still accepted. Rough terrain makes the ball micro-bounce, so a press can
   *  land on a frame with no contact; this is a short coyote-time window. */
  public BALL_JUMP_GRACE_FRAMES = 6;
  /** cos(55 deg): a contact whose inward normal is within 55 deg of straight
   *  up counts as jumpable ground. Steeper slopes and walls do not. */
  public BALL_JUMP_MAX_SLOPE_COS = 0.5736;
  /** gauge points an AI ball loses every frame it holds jump while no jump
   *  actually fires, so a brain cannot mash jump for free */
  public AI_WASTED_JUMP_GAUGE = 1;
  /** velocity retained per frame while the ball rolls on a surface. Near-unit
   *  drag preserves its valley speed so it can climb out and launch naturally. */
  public BALL_ROLL_DRAG = 0.999;
  /** velocity retained per frame while the ball is off the ground; airborne
   *  momentum is almost conserved until terrain catches it again. */
  public BALL_AIR_DRAG = 0.9999;
  /** fraction of the normal velocity kept on a wall bounce */
  public BALL_RESTITUTION = 0.42;
  /** impacts slower than this do not bounce; resting contacts just settle */
  public BALL_BOUNCE_SPEED = 1.5;
  /** tangential velocity retained on a hard wall hit */
  public BALL_WALL_SCRUB = 0.85;
  /** spin retained per frame by the visual roll when the ball is airborne */
  public BALL_SPIN_DAMP = 0.98;
  /** normal impact speed (u/f) at which a wall hit kills the ball. Below the
   *  unboosted top speed: only a near head-on full-speed hit is fatal */
  public BALL_CRASH_SPEED = 8;
  /** acceleration (u/f^2) of the temporary coin boost while its timer runs */
  public COIN_BOOST_ACCEL = 0.32 / 3;
  /** temporary top-speed bonus while a coin boost is active: 10% */
  public COIN_SPEED_BONUS = 0.1;
  /** frames the temporary coin boost lasts after collecting a coin; a fresh
   *  coin refreshes the timer, boosts never stack */
  public COIN_BOOST_DURATION = 90;
  /** permanent top-speed bonus each collected coin adds: 1% */
  public COIN_PERMANENT_BONUS = 0.01;
  /** cap on the stacked permanent coin bonus: 100% (double top speed) */
  public COIN_PERMANENT_CAP = 1;
  /** score for collecting a coin */
  public COIN_SCORE = 1;
  /** explicit score for the temporary boost a coin grants, added at pickup
   *  alongside COIN_SCORE: half a gate's payout, still well under
   *  GATE_SCORE, so taking coins is a direct choice, not a speed byproduct
   */
  public COIN_BOOST_REWARD = 5;

  // cave, a tube along a seeded 3D centerline, streamed in segments
  /** length of one streamed segment, the unit of streaming and of difficulty */
  public CAVE_SEGMENT_LENGTH = 240;
  /** centerline samples per segment, the mesh resolution along the tube */
  public CAVE_CHUNK_SAMPLES = 48;
  /** cross-section sides of the tube mesh */
  public CAVE_SIDES = 40;
  /** base radius of the tube; the original tunnel was 45 units, this is 2x */
  public CAVE_RADIUS = 90;
  /** visual vertical compression requested for the rendered tunnel mesh */
  public CAVE_VERTICAL_SCALE = 0.5;
  /** the bumps and the waves never pinch the tube below this */
  public CAVE_MIN_RADIUS = 48;
  /** base deviation of the long radius waves, split over CAVE_HARMONICS */
  public CAVE_WAVINESS = 36;
  public CAVE_HARMONICS = 3;
  /** arc wavelength of the fine bumps, the bumpy rock skin */
  public CAVE_BUMP_WAVE = 6;
  /** Maximum terrain rise in world Y per forward unit; downhill faces stay sharp. */
  public CAVE_FLOOR_MAX_CLIMB = 0.1;
  /** Maximum terrain drop in world Y per forward unit: steep enough that a
   *  driving car still leaves the ground off a lip, gentle enough that a
   *  slow car noses over it instead of flipping. */
  public CAVE_FLOOR_MAX_DROP = 0.3;
  /** angular cell of the fine bumps around the circumference */
  public CAVE_BUMP_ANGLE = 0.35;
  /** angular half-width of the flat driving band around the cave floor
   *  (a = PI) at difficulty 0: the bump skin is gone there and the long
   *  waves are damped; it narrows to CAVE_BAND_HALF_WIDTH_MIN as the
   *  annealed difficulty rises */
  public CAVE_BAND_HALF_WIDTH = 0.36;
  /** angular half-width of the driving band at full difficulty: the lane
   *  shrinks with the annealed difficulty, so the sides roughen faster in
   *  the wilder caves */
  public CAVE_BAND_HALF_WIDTH_MIN = 0.28;
  /** fraction of the long wave undulation the driving band keeps, so the
   *  plateau rides a slow residual instead of the full tube breathing */
  public CAVE_BAND_WAVE_DAMP = 0.85;
  /** lateral floor raise (inward radius cut) at the horizontal wall, making
   *  the side sections steep cliffs around the flat plateau */
  public CAVE_BANK_RISE = 30;
  /** distance over which the initially smooth cave grows into its full
   *  bumpy/obstacle-filled terrain */
  public CAVE_TERRAIN_RAMP = 1400;
  /** arc distance over which the feature variation then keeps compounding:
   *  0 at the mouth, 1 here, so deeper sections are wilder than the mouth */
  public CAVE_DEPTH_RAMP = 2600;
  /** how much taller columns, walls and ramps grow at full depth */
  public CAVE_DEPTH_HEIGHT = 0.5;
  /** how much more likely (and wider) the hard features are at full depth */
  public CAVE_DEPTH_CHANCE = 0.8;
  /** how much more the long waves and fine bumps deform the tube at full
   *  depth: amplitudes scale by 1 + this value as a run progresses */
  public CAVE_DEPTH_TERRAIN = 0.4;
  /** distance between deterministic terrain feature cells */
  public CAVE_FEATURE_CELL = 280;
  /** probability that a feature cell grows rock columns off the floor */
  public CAVE_COLUMN_CHANCE = 0.6;
  /** column height range (inward radius cut, world-scale units) */
  public CAVE_COLUMN_MIN = 14;
  public CAVE_COLUMN_MAX = 34;
  /** probability that a feature cell carries a smooth raised road lane */
  public CAVE_ROAD_CHANCE = 0.95;
  /** road lane length along the cave axis, and its angular half-width */
  public CAVE_ROAD_LENGTH = 190;
  public CAVE_ROAD_WIDTH = 0.4;
  /** how far the road lane raises the floor at full terrain progress */
  public CAVE_ROAD_RISE = 8;
  /** fixed dice on a jump ramp before a volatile stretch at volatility 1,
   *  at difficulty 0; it grows to CAVE_RAMP_CHANCE_MAX with the annealed
   *  difficulty */
  public CAVE_RAMP_CHANCE = 0.85;
  /** ramp dice at full difficulty: launch opportunities over rough ground
   *  get more frequent in the wilder caves */
  public CAVE_RAMP_CHANCE_MAX = 0.95;
  /** how far the ramp lip sits before the volatile stretch it launches over */
  public CAVE_RAMP_LEAD = 76;
  /** ramp approach length; the floor limiter turns it into a smooth climb */
  public CAVE_RAMP_LENGTH = 40;
  /** landing-zone runout, in arc units: the extra clear span appended
   *  behind a ramp's back slope (height / launch speed) — the landing-zone
   *  minimum. A ball descending from the lip keeps moving along the band
   *  after touchdown, so the zone keeps that distance free of in-band
   *  columns before the next feature may sit */
  public CAVE_LANDING_RUNOUT = 60;
  /** ramp lip height at full terrain progress (also its launch size) */
  public CAVE_RAMP_HEIGHT = 18;
  /** forward distance of the abrupt back cut behind a ramp lip: the deck
   *  ends in a near-shear face so a ball leaving the lip keeps flying */
  public CAVE_RAMP_LIP_DROP = 6;
  /** probability that a feature cell carries a run of coins on the driving
   *  band. Kept at the old boost-pad value (0.5) so the per-cell RNG stream
   *  stays aligned: a different chance would flip pass/fail on some cells and
   *  shift that cell's later wall/ramp draws, reshaping the terrain */
  public CAVE_COIN_CHANCE = 0.5;
  /** number of coins in one run, min..max inclusive */
  public CAVE_COIN_MIN = 3;
  public CAVE_COIN_MAX = 7;
  /** arc distance between two coins in a run */
  public CAVE_COIN_SPACING = 46;
  /** pickup footprint of one coin: arc half-length and angular half-width */
  public CAVE_COIN_HALF_LEN = 12;
  public CAVE_COIN_HALF_A = 0.16;
  /** rendered spinning coin: radius, thickness and gold color */
  public CAVE_COIN_RADIUS = 2.4;
  public CAVE_COIN_THICKNESS = 0.5;
  public CAVE_COIN_COLOR = '#ffd23f';
  /** how high above the floor the coin floats, in world units */
  public CAVE_COIN_LIFT = 3.6;
  /** probability that a rock column spans the whole cave (floor to wall) */
  public CAVE_COLUMN_FULL_HEIGHT_CHANCE = 0.5;
  /** probability that a column grows inside the driving band but never on
   *  its center, forcing a weave; the rest grow on the banks as before */
  public CAVE_COLUMN_IN_BAND_CHANCE = 0.35;
  /** Probability that a cell carries a bronze slab around the circumference. */
  public CAVE_WALL_CHANCE = 0.55;
  /** wall length along the cave, as a fraction of CAVE_SEGMENT_LENGTH: each
   *  wall takes between 1/8 and 1/3 of the section it sits in */
  public CAVE_WALL_MIN_FRACTION = 1 / 8;
  public CAVE_WALL_MAX_FRACTION = 1 / 3;
  /** Inward slab thickness in generator units; its world Y is compressed. */
  public CAVE_WALL_MIN = 16;
  public CAVE_WALL_MAX = 24;
  /** Base angular width; seeded slabs vary their span around the tunnel. */
  public CAVE_WALL_ANGLE = 0.5;
  /** wall face tint multiplied over the obstacle rock photo; white keeps
   *  the photo's natural colors */
  public CAVE_WALL_COLOR: [number, number, number] = [1, 1, 1];
  /** the smallest drivable gap the path check keeps open around columns,
   *  in world units (one car width plus margin) */
  public CAVE_PATH_MIN_GAP = 9;
  /** emissive tint (r, g, b in 0..1) blending over the rock vertex colors:
   *  the coin footprints */
  public CAVE_COIN_TINT: [number, number, number] = [1.0, 0.85, 0.35];
  /** clearance from the cave floor to a car's body center at spawn */
  public CAVE_GROUND_CLEARANCE = 2.2;
  /** max turn (rad) of the centerline per segment at difficulty 1 */
  public CAVE_TURN_BASE = 0.1;
  public CAVE_TURN_GROWTH = 0.22;
  /** seed at which the cave difficulty reaches its maximum */
  public CAVE_DIFFICULTY_SEED_BASE = 100;
  /** overall difficulty multiplier (0..1): training can anneal the cave
   *  from easy to full roughness without changing the seeds */
  public CAVE_DIFFICULTY = 1;
  /** segments kept generated ahead of the furthest car / behind the spawn */
  public CAVE_CHUNKS_AHEAD = 6;
  public CAVE_CHUNKS_BEHIND = 1;

  // gates, rings across the cave claimed in order along the axis; the cave
  // is infinite, so the map is a fixed run of gates instead of laps
  public GATES_PER_SEED = 18;
  /** arc distance between two consecutive gates */
  public GATE_SPACING = 600;
  /** flat reward for passing a gate in order */
  public GATE_SCORE = 10;
  /** speed bonus for every gate but the finish gate:
   *  GATE_SPEED_BONUS / frames taken since the last gate */
  public GATE_SPEED_BONUS = 10;
  /** one-time reward for claiming the last gate. The biggest payout in the
   *  game: finishing must always dominate any speed optimization on a single
   *  cave, so the selected line is one that can complete unknown caves, not
   *  one that shaves frames off a known one */
  public FINISH_BONUS = 600;
  /** fixed debt for entering a gate out of order */
  public WRONG_GATE_PENALTY = 100;
  /** reward for making forward progress into a new cave section, paid as
   *  SECTION_SCORE / race position so the leader banks more than the pack */
  public SECTION_SCORE = 5;
  /** score lost when a hard side impact bounces the ball back off an
   *  obstacle: the rock banks and the bronze slabs both count */
  public OBSTACLE_HIT_SCORE = 1;
  /** share of the section gauge a side impact costs. A ball that keeps
   *  bouncing back off obstacles drains its own liveness budget, while one
   *  that rolls over the top is untouched */
  public OBSTACLE_GAUGE_PENALTY = 0.1;
  /** frames after an obstacle hit before another one can be charged, so one
   *  impact does not bill once per collision substep */
  public BALL_HIT_COOLDOWN_FRAMES = 10;
  /** per-frame score paid by race position: 1st place earns this each frame,
   *  2nd half as much, and so on, so leading is worth slightly more */
  public POSITION_SCORE_SCALE = 1 / 10000;
  /**
   * Reference 60 FPS budget for advancing into the next cave section.
   * Sections are deliberately used instead of gates for the liveness check:
   * a car can make progress through a long section without crossing the
   * decorative/scoring ring exactly. Ten times the old seven-second budget.
   */
  public SECTION_BUDGET_FRAMES = 2200;
  /** the section gauge drains this many frames per simulation frame, so the
   *  budget above is consumed this much faster */
  public SECTION_GAUGE_DRAIN = 4;

  public CLEAR_STORAGE =
    typeof window !== 'undefined' && /clear/.test(window.location.href);
  /** optional browser cap while a human is actively being followed */
  public HUMAN_FPS_CAP_ENABLED = true;
  public HUMAN_FPS_CAP = 90;

  public get CAR_PER_LEVELS() {
    return this.CAR_NB / this.MAX_NETWORK_LAYERS;
  }
}

export const config = new Config();
