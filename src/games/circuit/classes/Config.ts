import { CTRL_COLORS } from '../../../ai/utils';

export function likelyLagsOnHeavyJs(): boolean {
  if (location.href.includes('demo=true')) return true;
  const cores = navigator.hardwareConcurrency ?? 8; // undefined on very old browsers
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8; // Chromium only, GiB, rounded to 0.25..8
  return cores <= 4 || memory <= 4;
}

class Config {
  // population
  /** number of AI car slots: each slot holds one car at a time (alive or a
   *  corpse), so the map never holds more AI cars than this */
  public CAR_NB = 200;
  public MAX_MUTATION_LVL = 0.9;
  public MIN_MUTATION_LVL = Number.MIN_VALUE;
  /** every brain category runs a pool of exactly this many cars, slots 0..9 */
  public CARS_PER_GROUP = likelyLagsOnHeavyJs() ? 8 : 50;
  /** a group that has seen one of its cars cross the finish line respawns as a
   *  mutation-only swarm of this many cars, on slots 1..FINISHED_CARS_PER_GROUP,
   *  so the untouched champion never re-enters that pool */
  public FINISHED_CARS_PER_GROUP = 5;
  /** a finished group's cars mutate at the full ladder's bottom rung
   *  (max / CARS_PER_GROUP) times this: the brain already wins, the swarm only
   *  looks for a faster line */
  public FINISHED_MUTATION_SCALE = 0.1;
  /** laps over which the max mutation shrinks from MAX down to MIN */
  public MUTATION_LAP_DECAY = 50;
  /** cap of brain variants, the keyboard shortcuts only cover 1..9 */
  public MAX_NETWORK_LAYERS = 9;
  /** gap from the line to the start point, wider than the claim radius */
  public SPAWN_OFFSET = 150;
  /** corpses linger that long after the crash, fading from 0.5 to 0 opacity;
   *  a whole group respawns together once every member's corpse has expired */
  public DEAD_LIFETIME = 3000;
  /** a car under this speed (u/f) is stalling; CAR_STALL_FRAMES of that in
   *  a row kills it */
  public CAR_STALL_SPEED = 1;
  /** score lost when a car dies of a stall; steeper than the worst obstacle
   *  hit so idling is never the cheaper way out */
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
  /** length of the line from a car to its next gate */
  public GATE_LINE_LENGTH = 70;
  public PLANE_COLOR = '#11150f';
  public ROAD_COLOR = '#1e2124';
  public LANE_COLOR = 'rgba(255, 255, 255, 0.4)';
  public EDGE_COLORS = ['white', '#aa88bb'];

  // env, the sensor fan is a front arc: longest straight ahead, tapering
  // to the edges, so reach is one honest function of where a ray points
  public SENSORS = 19;
  /** total fan spread centered on the heading, was a ~315 deg sweep */
  public SENSOR_ANGLE = (Math.PI / 180) * 120;
  /** packs the rays toward the heading: 1 is even spacing, higher values
   *  put more of the fan straight ahead where the car actually drives.
   *  At 2 the middle third of the rays cover only ~5% of the arc */
  public SENSOR_FORWARD_BIAS = 2;
  /** reach of the center ray, extended by 40% for earlier obstacle planning */
  public SENSORS_MAX_LENGTH = 336;
  /** reach of the edge rays, preserving the 60% edge-to-center profile */
  public SENSORS_EDGE_LENGTH = 202;

  // car
  /** yaw rate (rad/frame) at zero speed, full steer: the on-the-spot pivot */
  public CAR_YAW_SHARP = 0.06;
  /** yaw rate at max speed, full steer: the lazier top-speed corner */
  public CAR_YAW_LAZY = 0.025;
  /** first-order response of the yaw toward its target (yaw inertia) */
  public CAR_YAW_RESPONSE = 0.35;
  /** lateral velocity fraction cancelled per frame when grip is not saturated */
  public CAR_GRIP = 0.45;
  /** fraction cancelled when the grip limit is saturated: the drift */
  public CAR_DRIFT_GRIP = 0.06;
  /** grip limit as a fraction of maxSpeed, the turn demand that breaks it */
  public CAR_GRIP_LIMIT_RATIO = 0.02;
  /** |lateral velocity| above which the car counts as drifting */
  public CAR_DRIFT_THRESHOLD = 0.15;
  /** forward speed fraction lost per frame while drifting: drifts bleed */
  public CAR_DRIFT_SPEED_LOSS = 0.005;
  /** braking before the reverse drive kicks in */
  public CAR_BRAKE_DECEL = 0.1;
  /** reverse driving acceleration, the cap stays maxSpeed/2 */
  public CAR_REVERSE_ACCEL = 0.03;
  /** tripled on purpose: the car needs the speed to actually drift */
  public CAR_ACCELERATION = 0.09;
  public CAR_FRICTION = 0.005;
  /** top speed in u/f */
  public CAR_MAX_SPEED = 9;
  public CLEAR_STORAGE = /clear/.test(window.location.href);
  /** leaving the road kills; score comes from claiming checkpoints */

  // steering ui, the wheel and pedals mimic the followed car's outputs
  /** wheel rotation at full steer, radians */
  public STEER_UI_WHEEL_MAX_ANGLE = 2.2;
  /** half the pill stroke, px: the cap rests centered, gas lifts it, reverse drops it */
  public STEER_UI_PEDAL_TRAVEL = 27;
  /** display lerp for the wheel, the brain outputs are noisy per frame */
  public STEER_UI_SMOOTH = 0.35;
  /** optional browser cap while a human is actively being followed */
  public HUMAN_FPS_CAP_ENABLED = true;
  public HUMAN_FPS_CAP = 90;

  // circuit, a radial curve r(theta) so the random waves can never
  // self-intersect, the map is bigger than the screen
  public CIRCUIT_BASE_RADIUS = 1500;
  /** max base deviation from the radius, split over four broad waves */
  public CIRCUIT_WAVINESS = 420;
  /** seed scale for difficulty = seed / (scale + seed) */
  public CIRCUIT_DIFFICULTY_SEED_BASE = 10;
  /** low-frequency waves retained at difficulty zero */
  public CIRCUIT_BASE_HARMONICS = 4;
  /** maximum number of extra, higher-frequency waves at full difficulty */
  public CIRCUIT_EXTRA_HARMONICS = 4;
  /** first frequency after the four broad waves (which use 2 through 5) */
  public CIRCUIT_EXTRA_HARMONIC_START = 6;
  /** broad-wave amplitude growth at full difficulty (420 * 1.75 max) */
  public CIRCUIT_BASE_AMPLITUDE_GROWTH = 0.75;
  /** total extra-wave budget at full difficulty; 735 + 240 stays below radius */
  public CIRCUIT_EXTRA_WAVINESS = 240;
  /** points of the resampled centerline, also the drawn boundary resolution */
  public CIRCUIT_SAMPLES = 192;
  /** every Nth boundary point becomes a sensor segment, coarser is cheaper */
  public SENSOR_DECIMATION = 4;
  /** the default road is three 60-unit lanes (180 units total) */
  public ROAD_WIDTH = 180;
  public ROAD_LANES = 3;
  public ROAD_LANE_WIDTH = this.ROAD_WIDTH / this.ROAD_LANES;
  public ROAD_MIN_LANES = 1;
  public ROAD_MAX_LANES = 4;
  /** seeded lane sections are separated so most of the loop stays at default width */
  public ROAD_SECTION_COUNT = 3;
  /** points of centerline held at a seeded section's target lane count */
  public ROAD_SECTION_LENGTH = 12;
  /** points of smooth cosine ease in and out */
  public ROAD_SECTION_TRANSITION = 8;
  /** centerline samples kept clear before a lane reduction begins */
  public OBSTACLE_REDUCTION_CLEARANCE = 2;

  // checkpoints, claimed in order so the only way to bank score is
  // around the loop, donuts in the open plane earn nothing
  public CHECKPOINTS = 32;
  /** base checkpoint reward, divided by frames taken since the last gate */
  public CHECKPOINT_SCORE = 10;
  /** fixed debt for entering a checkpoint out of order */
  public WRONG_CHECKPOINT_PENALTY = 100;
  public CHECKPOINT_CLAIM_RADIUS = 100;
  /** reference 60 FPS budget for reaching the next checkpoint (seven seconds) */
  public CHECKPOINT_BUDGET_FRAMES = 220;
  /** full laps one car needs on a seed before the map advances */
  public LAPS_PER_SEED = 3;

  // obstacles, round objects along the road, none in the start zone
  public OBSTACLES = 12;
  /** one car width (Car.width): the minimum gap between a block's side and
   *  the road edge; edge-anchored blocks may extend half off the road */
  public OBSTACLE_PASS_GAP = 36;
  /** score lost on an obstacle crash, scaled by how head-on the hit is:
   *  a glancing brush costs MIN, driving straight into it costs MAX. Leaving
   *  the road only kills, so the obstacle is always the costlier crash */
  public OBSTACLE_PENALTY_MIN = 1;
  public OBSTACLE_PENALTY_MAX = 5;

  public get CAR_PER_LEVELS() {
    return this.CAR_NB / this.MAX_NETWORK_LAYERS;
  }
}

export const config = new Config();
