import { CTRL_COLORS } from '../../../ai/utils';

export function likelyLagsOnHeavyJs(): boolean {
  if (typeof window === 'undefined') return true;
  if (location.href.includes('demo=true')) return true;
  const cores = navigator.hardwareConcurrency ?? 8; // undefined on very old browsers
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8; // Chromium only, GiB, rounded down to 0.25..8
  return cores <= 4 || memory <= 4;
}

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
  /** every brain category runs a pool of exactly this many cars, slots 0..N-1 */
  public CARS_PER_GROUP = likelyLagsOnHeavyJs() ? 15 : 50;
  /** a group that has seen one of its cars finish respawns as a
   *  mutation-only swarm of this many cars, on slots 1..N, so the untouched
   *  champion never re-enters that pool */
  public FINISHED_CARS_PER_GROUP = 5;
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
   *  never fully converge on one overfit line */
  public EXPLORER_CARS = 1;
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
  public CAR_STALL_SPEED = 0.8;
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
  public CAVE_COLOR = '#46525c';
  public GATE_COLORS = ['#ffffff', '#aa88bb'];
  public GATE_NEXT_COLOR = '#ffd23f';
  /** arc distance around the followed car inside which car meshes sync */
  public VISUAL_RANGE = 700;
  /** how far the camera looks along the cave axis ahead of the followed car */
  public CAMERA_LOOK_AHEAD = 55;

  // env, the sensor fan is a front arc in the car's plane: longest straight
  // ahead, tapering to the edges, so reach is one honest function of where a
  // ray points, plus one ray straight up and one straight down for the
  // ceiling and the floor
  public SENSORS = 19;
  /** total fan spread centered on the heading */
  public SENSOR_ANGLE = (Math.PI / 180) * 120;
  /** packs the rays toward the heading: 1 is even spacing, higher values
   *  put more of the fan straight ahead where the car actually drives.
   *  At 2 the middle third of the rays covers only ~5% of the arc */
  public SENSOR_FORWARD_BIAS = 2;
  /** reach of the center ray */
  public SENSORS_MAX_LENGTH = 336;
  /** reach of the edge rays, preserving the 60% edge-to-center profile */
  public SENSORS_EDGE_LENGTH = 202;
  /** reach of the vertical rays, the cave never gets higher than this */
  public VERTICAL_RAY_LENGTH = 46;
  /** march step of the analytic ray test, smaller = tighter hit distance */
  public RAY_STEP = 2.5;

  // car, an emulated rigid body: one body with four raycast wheel contacts
  /** top speed in u/f */
  public CAR_MAX_SPEED = 7;
  /** world down acceleration per frame^2 */
  public CAR_GRAVITY = 0.28;
  /** the body collides with the cave as a sphere around its center */
  public CAR_BODY_RADIUS = 3.2;
  /** each wheel is a sphere for the embed test and a ray for the suspension */
  public CAR_WHEEL_RADIUS = 2.6;
  /** wheel anchor offsets in body space: x right, y up, z back (front = -z) */
  public WHEEL_OFFSETS: [number, number, number][] = [
    [2.4, -1.5, -4.4], // front left
    [-2.4, -1.5, -4.4], // front right
    [2.4, -1.5, 4.4], // rear left
    [-2.4, -1.5, 4.4], // rear right
  ];
  /** suspension rest length of the wheel ray, travel below it is spring */
  public SUSP_REST = 3.0;
  public SUSP_TRAVEL = 4.0;
  /** softer spring acceleration per unit of compression for smoother bumps */
  public SUSP_SPRING = 0.35;
  /** critical-ish damping keeps the elastic contact from oscillating */
  public SUSP_DAMP = 1.25;
  /** hard contact solve: wheel centers are snapped to the rendered/queried
   *  cave surface after integration instead of being allowed to bounce away */
  public WHEEL_SNAP = 1;
  /** wheel contacts only support the lower floor arc, not tunnel side walls;
   *  the radial angle is measured from the cave frame's upward normal */
  public WHEEL_GROUND_ANGLE_COS = -0.8;
  /** forward acceleration at full throttle, u/f^2 */
  public CAR_ENGINE = 0.06;
  /** braking before the reverse drive kicks in */
  public CAR_BRAKE_DECEL = 0.2;
  /** reverse driving acceleration, the cap stays maxSpeed/2 */
  public CAR_REVERSE_ACCEL = 0.06;
  /** fraction of the lateral wheel velocity cancelled per frame, divided by
   *  the four wheels; falls with speed so the car drifts at the top end */
  public CAR_GRIP = 0.42;
  /** max steering angle of the front wheels in rad at full steer */
  public CAR_STEER_MAX = 0.45;
  /** body moment of inertia for the wheel torque, larger = slower yaw */
  public CAR_INERTIA = 9;
  /** normal impact speed (u/f) at which a wall hit kills the car */
  public CAR_CRASH_SPEED = 5.5;
  /** fraction of the normal velocity kept after a wall bounce */
  public CAR_RESTITUTION = 0.05;
  /** the car is upside down (and dead) below this dot with world up */
  public UPSIDE_DOWN_LIMIT = -0.25;
  /** upright assist keeps the lightweight emulated body drivable over bumps */
  public CAR_UPRIGHT_RESPONSE = 0.35;

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
  /** angular cell of the fine bumps around the circumference */
  public CAVE_BUMP_ANGLE = 0.35;
  /** distance over which the initially smooth cave grows into its full
   *  bumpy/obstacle-filled terrain */
  public CAVE_TERRAIN_RAMP = 1400;
  /** distance between deterministic terrain feature cells */
  public CAVE_FEATURE_CELL = 280;
  /** clearance from the cave floor to a car's body center at spawn */
  public CAVE_GROUND_CLEARANCE = 4.1;
  /** max turn (rad) of the centerline per segment at difficulty 1 */
  public CAVE_TURN_BASE = 0.1;
  public CAVE_TURN_GROWTH = 0.22;
  /** seed at which the cave difficulty reaches its maximum */
  public CAVE_DIFFICULTY_SEED_BASE = 100;
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
  /**
   * Reference 60 FPS budget for advancing into the next cave section.
   * Sections are deliberately used instead of gates for the liveness check:
   * a car can make progress through a long section without crossing the
   * decorative/scoring ring exactly. Ten times the old seven-second budget.
   */
  public SECTION_BUDGET_FRAMES = 2200;

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
