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
  /** Shared chassis dimensions for collision, inertia, rendering and camera framing. */
  public CAR_WIDTH = 6.4;
  public CAR_HEIGHT = 2.2;
  public CAR_LENGTH = 8.5;
  /** world down acceleration per frame^2 */
  public CAR_GRAVITY = 0.12;
  public PHYSICS_SUBSTEPS = 4;
  public CAR_WHEEL_RADIUS = 1.1;
  /** Suspension mounts: local X right, Y up, negative Z forward. */
  public WHEEL_OFFSETS: [number, number, number][] = [
    [-(this.CAR_WIDTH / 2 + 0.2), -0.6, -3.1],
    [this.CAR_WIDTH / 2 + 0.2, -0.6, -3.1],
    [-(this.CAR_WIDTH / 2 + 0.2), -0.6, 3.1],
    [this.CAR_WIDTH / 2 + 0.2, -0.6, 3.1],
  ];
  public SUSP_REST = 2.3;
  public SUSP_TRAVEL = 2.2;
  /** Per-wheel spring and damper, unit chassis mass, frame-based units. */
  public SUSP_SPRING = 0.09;
  public SUSP_DAMP = 0.45;
  public TIRE_FRICTION = 2.8;
  /** Effective tire force height below the center of mass, an arcade roll assist. */
  public TIRE_ROLL_CENTER = 0.6;
  /** Anti-roll bar coupling within an axle, as a fraction of the suspension
   *  spring. Transfers load toward the compressed wheel to resist body roll;
   *  the paired forces cancel, so only a restoring roll torque remains. */
  public CAR_ANTI_ROLL = 0.25;
  /** Anti-pitch coupling between the front and rear axle pairs, same units.
   *  Settles the nose after a jump instead of letting it oscillate. */
  public CAR_ANTI_PITCH = 0.2;
  /** Airborne attitude assist: target pitch/roll rate (rad/frame) per unit of
   *  forward/right vertical error, pulling the car level before it lands. */
  public CAR_AIR_LEVEL_GAIN = 0.06;
  /** Cap on the air assist's target rate, rad/frame. */
  public CAR_AIR_LEVEL_RATE = 0.05;
  /** Fraction of the gap to the target rate the air assist closes per frame. */
  public CAR_AIR_LEVEL_RESPONSE = 0.15;
  /** Airborne frames before the leveling assist engages, so short hops over
   *  bumps still let the car follow the ground instead of fighting it. */
  public CAR_AIR_LEVEL_DELAY = 6;
  /** Target yaw rate (rad/frame) applied in the air at full steer:
   *  Mario Kart style, steering keeps working mid-jump with reduced
   *  authority. */
  public CAR_AIR_STEER_TORQUE = 0.02;
  /** Normal angular damping per frame, the mild arcade assist. */
  public CAR_SPIN_DAMP = 0.94;
  /** Pitch/roll damping per frame on the frame of touchdown, fading back to
   *  CAR_SPIN_DAMP over CAR_LANDING_DAMP_FRAMES. Lower = more planted. */
  public CAR_LANDING_SPIN_DAMP = 0.7;
  /** Frames over which the landing damping fades out. */
  public CAR_LANDING_DAMP_FRAMES = 10;
  /** Fraction of the impact velocity absorbed along the first wheel normal
   *  on a landing: hard landings squat the car instead of bouncing it. */
  public CAR_LANDING_VEL_ABSORB = 0.85;
  /** Forward acceleration builds over two seconds of held throttle. */
  public CAR_ENGINE_START = 0.025;
  public CAR_ENGINE = 0.1;
  public CAR_ENGINE_BUILD_FRAMES = 120;
  /** Rolling resistance per wheel, proportional to its suspension load. */
  public WHEEL_ROLLING_RESISTANCE = 0.1;
  /** braking before the reverse drive kicks in */
  public CAR_BRAKE_DECEL = 0.2;
  /** reverse driving acceleration, the cap stays maxSpeed/2 */
  public CAR_REVERSE_ACCEL = 0.06;
  /** Lateral slip response per frame at mid speed, divided between four
   *  tires and limited by each wheel's available traction: grippy, not
   *  drifty. */
  public CAR_GRIP = 0.9;
  /** Grip relaxes toward top speed so the car goes straight when it should
   *  go straight. */
  public CAR_GRIP_AT_TOP = 0.75;
  /** max steering angle of the front wheels in rad at full steer */
  public CAR_STEER_MAX = 0.45;
  /** Lateral force cap per wheel, in load fractions: lower than the tire
   *  friction circle, so a too-tight turn understeers (slides its nose
   *  wide) instead of lifting the inner wheels and rolling the car over. */
  public CAR_LATERAL_FRICTION = 1.2;
  /** normal impact speed (u/f) at which a wall hit kills the car */
  public CAR_CRASH_SPEED = 5.5;
  /** fraction of the normal velocity kept after a wall bounce */
  public CAR_RESTITUTION = 0.05;
  /** acceleration (u/f^2) of a boost pad while its timer runs */
  public BOOST_ACCEL = 0.3;
  /** extra top speed while a boost is active, fading linearly to zero over
   *  BOOST_DURATION */
  public BOOST_SPEED_BONUS = 3;
  /** frames a boost lasts after (re)triggering; overlapping pads refresh
   *  the timer, they never stack */
  public BOOST_DURATION = 90;
  /** Body-up (uy) below this means the car is past the flip point,
   *  roof-down. Above it the car is still in control: no auto-righting
   *  interference, the driver/AI can tilt and recover on its own. */
  public CAR_INVERT_THRESHOLD = -0.5;
  /** Speed (u/f) above which an inverted car starts flipping back; below it
   *  the car rests on its roof and is left to drag, stall or be pushed off. */
  public CAR_SELF_RIGHT_SPEED = 3.5;
  /** Substeps of the scripted flip-back (180 substeps = 45 frames = 0.75s):
   *  a car that flipped while moving fast rotates back onto its wheels over
   *  this many substeps, imposed as an arcade moment. */
  public CAR_SELF_RIGHT_SUBSTEPS = 180;
  /** Drag on a roof-down chassis: body velocity fraction removed per
   *  substep while the roof touches. Grippier than the wheels: the car
   *  slides to a stop, it does not skid. */
  public ROOF_FRICTION = 0.2;
  /** Pitch/roll angular damping per substep while the roof touches: an
   *  upside-down car settles onto its roof instead of spinning. */
  public ROOF_SPIN_DAMP = 0.9;

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
   *  (a = PI): the bump skin is gone there and the long waves are damped */
  public CAVE_BAND_HALF_WIDTH = 0.36;
  /** fraction of the long wave undulation the driving band keeps, so the
   *  plateau rides a slow residual instead of the full tube breathing */
  public CAVE_BAND_WAVE_DAMP = 0.85;
  /** lateral floor raise (inward radius cut) at the horizontal wall, making
   *  the side sections steep cliffs around the flat plateau */
  public CAVE_BANK_RISE = 30;
  /** distance over which the initially smooth cave grows into its full
   *  bumpy/obstacle-filled terrain */
  public CAVE_TERRAIN_RAMP = 1400;
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
  /** fixed dice on a jump ramp before a volatile stretch at volatility 1 */
  public CAVE_RAMP_CHANCE = 0.85;
  /** how far the ramp lip sits before the volatile stretch it launches over */
  public CAVE_RAMP_LEAD = 76;
  /** ramp approach length; the floor limiter turns it into a smooth climb */
  public CAVE_RAMP_LENGTH = 40;
  /** ramp lip height at full terrain progress (also its launch size) */
  public CAVE_RAMP_HEIGHT = 18;
  /** probability that a feature cell carries a boost pad on the driving band */
  public CAVE_BOOST_CHANCE = 0.5;
  /** probability that a rock column spans the whole cave (floor to wall) */
  public CAVE_COLUMN_FULL_HEIGHT_CHANCE = 0.5;
  /** probability that a column grows inside the driving band but never on
   *  its center, forcing a weave; the rest grow on the banks as before */
  public CAVE_COLUMN_IN_BAND_CHANCE = 0.35;
  /** the smallest drivable gap the path check keeps open around columns,
   *  in world units (one car width plus margin) */
  public CAVE_PATH_MIN_GAP = 9;
  /** emissive tints (r, g, b in 0..1) blending over the rock vertex colors:
   *  the jump platform deck and the boost pads */
  public CAVE_PLATFORM_COLOR: [number, number, number] = [0.25, 0.9, 1.0];
  public CAVE_BOOST_COLOR: [number, number, number] = [1.0, 0.85, 0.25];
  /** clearance from the cave floor to a car's body center at spawn */
  public CAVE_GROUND_CLEARANCE = 3.5;
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
