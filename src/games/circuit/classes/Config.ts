import { ModelsByLayerCount } from '../../../ai/utils';

class Config {
  // population
  /** number of AI car slots: each slot holds one car at a time (alive or a
   *  corpse), so the map never holds more AI cars than this */
  public CAR_NB = 200;
  public MAX_MUTATION_LVL = 0.9;
  public MIN_MUTATION_LVL = Number.MIN_VALUE;
  /** every brain category runs a pool of exactly this many cars, slots 0..9 */
  public CARS_PER_GROUP = 10;
  /** laps over which the max mutation shrinks from MAX down to MIN */
  public MUTATION_LAP_DECAY = 50;
  /** cap of brain variants, the keyboard shortcuts only cover 1..9 */
  public MAX_NETWORK_LAYERS = 9;
  /** gap from the line to the start point, wider than the claim radius */
  public SPAWN_OFFSET = 150;
  /** corpses linger that long after the crash, fading to 0 opacity, and
   *  their slot respawns once they expire */
  public DEAD_LIFETIME = 5000;
  /** a car under this speed (u/f) is stalling; CAR_STALL_TIMEOUT of that in a row kills it */
  public CAR_STALL_SPEED = 1;
  public CAR_STALL_TIMEOUT = 5000;

  // mixed: a brain that picks which trained brain drives
  public MIXED_ENABLED = true;
  public MIXED_CARS = 10;
  /** floor on the mutating mixed cars, the run needs a spread to arbitrate */
  public MIXED_MIN_CARS = 20;
  /** below that there is nothing to arbitrate, the run is skipped */
  public MIXED_MIN_EXPERTS = 2;
  /** how many saved brains per layer become selectable experts */
  public MIXED_EXPERTS_PER_LAYER = 1;
  /** single hidden layer, it only has to route the inputs to the right brain */
  public MIXED_HIDDEN_NODES = 12;
  /** mutations are boosted, every expert is good at something worth trying */
  public MIXED_MUTATION_BOOST = 3;
  /** odds of rerolling every weight leading to one expert, scaled by the factor */
  public MIXED_RESET_CHANCE = 0.15;
  public MIXED_MAX_MUTATION_LVL = 0.3;
  public MIXED_COLOR = '#ff69b4';

  // visual
  public SCORES_NB = this.MAX_NETWORK_LAYERS * 2;
  /** length of the line from a car to its next gate */
  public GATE_LINE_LENGTH = 70;
  public PLANE_COLOR = '#11150f';
  public ROAD_COLOR = '#1e2124';
  public LANE_COLOR = 'rgba(255, 255, 255, 0.4)';
  public EDGE_COLOR = 'white';

  // env, the sensor fan is a front arc: longest straight ahead, tapering
  // to the edges, so reach is one honest function of where a ray points
  public SENSORS = 17;
  /** total fan spread centered on the heading, was a ~315 deg sweep */
  public SENSOR_ANGLE = (Math.PI / 180) * 120;
  /** reach of the center ray, ~1 s of lookahead at full throttle */
  public SENSORS_MAX_LENGTH = 240;
  /** reach of the edge rays, the sides pay for the forward reach */
  public SENSORS_EDGE_LENGTH = 144;

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

  // circuit, a radial curve r(theta) so the random waves can never
  // self-intersect, the map is bigger than the screen
  public CIRCUIT_BASE_RADIUS = 1500;
  /** max total deviation of the radius from the base, wide sweeping turns */
  public CIRCUIT_WAVINESS = 420;
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

  // checkpoints, claimed in order so the only way to bank score is
  // around the loop, donuts in the open plane earn nothing
  public CHECKPOINTS = 32;
  /** base checkpoint reward, divided by frames taken since the last gate */
  public CHECKPOINT_SCORE = 1000;
  /** no checkpoint pass can award less than this floor */
  public MIN_CHECKPOINT_SCORE = 10;
  /** fixed debt for entering a checkpoint out of order */
  public WRONG_CHECKPOINT_PENALTY = 100;
  public CHECKPOINT_CLAIM_RADIUS = 100;
  /** reference 60 FPS budget for reaching the next checkpoint (seven seconds) */
  public CHECKPOINT_BUDGET_FRAMES = 420;
  /** full laps one car needs on a seed before the map advances */
  public LAPS_PER_SEED = 3;

  // obstacles, round objects along the road, none in the start zone
  public OBSTACLES = 12;
  /** one car width (Car.width): the minimum gap between a block's side and
   *  the road edge, otherwise the block snaps flush to the edge */
  public OBSTACLE_PASS_GAP = 30;

  public get CAR_PER_LEVELS() {
    return this.CAR_NB / this.MAX_NETWORK_LAYERS;
  }
}

export const config = ((window as any).config = new Config());
