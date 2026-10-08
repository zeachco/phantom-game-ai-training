import * as THREE from 'three';
import { NeuralNetwork } from '../../../ai/Network';
import { CTRL_COLORS, clamp } from '../../../ai/utils';
import { lerp } from '../../../utilities/math';
import { getRandomColor } from '../../../utilities/colors';
import type { Cave, RadialHit } from './Cave';
import { config } from './Config';
import { Controls } from './Controls';
import { ControlType } from '../types';
import { Sensor } from './Sensor';

/** The dimensions used by both regular and mixed cave brains: the sensor fan
 *  (fan + up + down), one previous frame of the same fan as the motion
 *  history, the four wheel compressions, then speed, velocity delta and gate
 *  delta. */
const WHEEL_INPUTS = 4;
/** speed, velocity delta, gate delta, then the feature block: airborne,
 *  inverted, on platform, on boost, platform ahead, boost ahead, column
 *  proximity and column side */
const EXTRA_BRAIN_INPUTS = 11;

export function getCaveBrainDimensions(rayCount = config.SENSORS + 2) {
  // AI controls have no event handlers, so their enumerable fields are the
  // actual output channels consumed by Car.update().
  const controls = new Controls(ControlType.AI);
  return {
    // current rays then one previous frame of rays: the history block is how
    // the weights tell that the car is moving
    inputCount: rayCount * 2 + WHEEL_INPUTS + EXTRA_BRAIN_INPUTS,
    outputCount: Object.keys(controls).length,
  };
}

/** squared stall threshold, the per-frame stall check needs no sqrt */
const STALL_SPEED_SQ = config.CAR_STALL_SPEED * config.CAR_STALL_SPEED;

/**
 * A car with an emulated rigid body: one body (position, quaternion, linear
 * and angular velocity) and four raycast wheel contacts that support the body
 * with spring-dampers and apply load-limited tire forces in
 * the wheel frame. The cave is never a physics object: the body and the
 * wheels are tested against the analytic tube, the same surface the mesh
 * renders, so what the wheels feel is exactly what is drawn.
 */
export class Car {
  public x: number;
  public y: number;
  public z: number;
  public vx: number;
  public vy: number;
  public vz: number;
  public avx: number;
  public avy: number;
  public avz: number;
  public quat: THREE.Quaternion;
  /** arc position along the cave axis, the car's progress */
  public s: number;
  /** body frame in world space, refreshed every frame: forward, right, up */
  public fx = 0;
  public fy = 0;
  public fz = 1;
  public rx = 1;
  public ry = 0;
  public rz = 0;
  public ux = 0;
  public uy = 1;
  public uz = 0;
  /** cave tangent at the car's arc position, the hint for the ray marches */
  public cx = 0;
  public cy = 0;
  public cz = -1;
  /** current speed magnitude, refreshed every frame */
  public speed = 0;
  public damaged: boolean;
  public useAI: boolean;
  public sensor?: Sensor;
  public brain: NeuralNetwork;
  public controls: Controls;
  public width = config.CAR_WIDTH;
  public height = config.CAR_HEIGHT;
  public length = config.CAR_LENGTH;
  /** index of the next gate to claim, the gates go forward in order */
  public nextGate = 0;
  /** set for one frame when the car claims a gate in order */
  public passedGate = false;
  /** gate event consumed by CaveRace to build split deltas */
  public completedGateIndex = -1;
  public completedGateFrames = 0;
  /** most recently completed gate split and its current-cave delta */
  public lastGateIndex = -1;
  public lastGateFrames = 0;
  public lastGateDelta: number | null = null;
  /** gate the car is currently inside, -1 in none, charges out-of-order entries */
  public insideGate = -1;
  /** position of the next gate and the signed delta, refreshed for the viz */
  public gateX = 0;
  public gateY = 0;
  public gateZ = 0;
  public gateDelta = 0;
  /** performance.now() of the crash: the corpse fades from 0.5 to 0 over
   *  DEAD_LIFETIME; the whole brain group respawns when every corpse has expired */
  public deathTime = 0;
  /** frames remaining to advance into another cave section */
  public sectionFramesRemaining = config.SECTION_BUDGET_FRAMES;
  /** furthest cave section reached; unlike gates, sections keep the car alive
   *  while it makes forward progress even if it misses a ring */
  private furthestSection = 0;
  /** simulation frames since the last gate was claimed */
  public framesSinceLastGate = 0;
  /** simulation frames spent on this cave run */
  public totalRaceFrames = 0;
  /** final total and delta when this car claims the last gate */
  public lastFinishFrames = 0;
  public lastFinishDelta: number | null = null;
  /** finished cars keep their finishing brain fixed until the next spawn */
  public finished = false;
  /** suspension compression per wheel, 0 airborne, the brain's ground truth */
  public compression: number[] = [0, 0, 0, 0];
  public grounded: boolean[] = [false, false, false, false];

  private stallFrames = 0;
  private engineBuild = 0;
  /** consecutive airborne frames, sets the strength of the landing damping */
  private airFrames = 0;
  /** 1 on the first grounded frame, decays to 0 over the landing window */
  private landingDamp = 0;
  /** per-wheel grounded state from the previous substep, landing detection */
  private wasGrounded: boolean[] = [false, false, false, false];
  /** true once the first wheel of a landing has absorbed the impact */
  private landingAbsorbed = false;
  /** substeps of the scripted flip-back remaining, 0 = not flipping */
  private selfRightFrames = 0;
  /** frames of boost remaining: a pad on the ground pushes the car and
   *  lifts its speed cap while this runs; overlapping pads refresh it */
  private boostFrames = 0;
  /** the world axis and total angle of the scripted flip, captured at start */
  private flipAxisX = 1;
  private flipAxisY = 0;
  private flipAxisZ = 0;
  private flipAngle = 0;
  /** anti-roll/pitch load transfer per wheel, rebuilt every substep */
  private stab: number[] = [0, 0, 0, 0];
  /** penalty for the death that just happened, charged with the crash speed */
  private deathPenalty = 0;
  private prevS = 0;
  private brainInputs: number[] = [];
  /** previous frame's ray values, the one-frame sensor history block */
  private prevSensorInputs: number[] = [];
  /** set after the first AI decision, until then the history is flat */
  private hasPrevSensors = false;
  /** scratch collision query, reused so no frame allocates */
  private hit: RadialHit = {
    s: 0,
    a: 0,
    dist: 0,
    nx: 0,
    ny: 0,
    nz: 0,
    hx: 0,
    hy: 0,
    hz: 0,
  };
  private wheelHit: RadialHit = {
    s: 0,
    a: 0,
    dist: 0,
    nx: 0,
    ny: 0,
    nz: 0,
    hx: 0,
    hy: 0,
    hz: 0,
  };

  constructor(
    spawn: {
      x: number;
      y: number;
      z: number;
      tx: number;
      ty: number;
      tz: number;
      s: number;
    },
    controlType = ControlType.DUMMY,
    public maxSpeed = config.CAR_MAX_SPEED,
    public label = '',
    public color = 'white',
    public brainLayers = 1,
    /** lets the caller swap in another kind of brain, like a mixed brain */
    public brainBuilder?: (
      inputCount: number,
      outputCount: number,
    ) => NeuralNetwork,
    /** lateral offset in cave radii so a pack of cars never spawns on one spot */
    public laneOffset = 0,
    public cave?: Cave,
  ) {
    this.color = CTRL_COLORS[this.brainLayers] || getRandomColor();
    this.x = spawn.x;
    this.y = spawn.y;
    this.z = spawn.z;
    this.s = spawn.s;
    this.prevS = spawn.s;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.avx = 0;
    this.avy = 0;
    this.avz = 0;
    this.damaged = false;
    this.sectionFramesRemaining = config.SECTION_BUDGET_FRAMES;
    this.furthestSection = Math.floor(spawn.s / config.CAVE_SEGMENT_LENGTH);
    this.stallFrames = 0;

    this.quat = new THREE.Quaternion();
    this.#setOrientation(spawn.tx, spawn.ty, spawn.tz);

    // a lateral offset slides the car along the cave frame at the spawn arc
    if (this.cave && laneOffset !== 0) {
      const t: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
      const n: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
      const b: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
      this.cave.frame(spawn.s, t, n, b);
      const off = laneOffset * this.cave.radius(spawn.s, 0) * 0.55;
      this.x += b.x * off;
      this.y += b.y * off;
      this.z += b.z * off;
    }

    this.useAI = controlType === ControlType.AI;
    this.controls = new Controls(controlType);

    if (controlType !== ControlType.DUMMY) {
      this.sensor = new Sensor(this);
      this.prevSensorInputs = new Array<number>(this.sensor.rayCount).fill(0);
      const { inputCount, outputCount } = getCaveBrainDimensions(
        this.sensor.rayCount,
      );
      this.brain = brainBuilder
        ? brainBuilder(inputCount, outputCount)
        : new NeuralNetwork(inputCount, outputCount, brainLayers);
    } else {
      this.brain = new NeuralNetwork(1, 1, 0);
      this.brain.levels = [];
    }
  }

  /** the accent can move at runtime, a mixed brain blends the brains it uses */
  setColor(color: string) {
    this.color = color;
  }

  /** Return a crashed car to a fresh spawn while preserving its controls and
   *  brain. This mirrors the circuit human respawn instead of leaving a dead
   *  mesh invisible forever. */
  reset(spawn: {
    x: number;
    y: number;
    z: number;
    tx: number;
    ty: number;
    tz: number;
    s: number;
  }) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.z = spawn.z;
    this.s = spawn.s;
    this.prevS = spawn.s;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.avx = 0;
    this.avy = 0;
    this.avz = 0;
    this.#setOrientation(spawn.tx, spawn.ty, spawn.tz);
    this.damaged = false;
    this.finished = false;
    this.nextGate = 0;
    this.insideGate = -1;
    this.passedGate = false;
    this.completedGateIndex = -1;
    this.sectionFramesRemaining = config.SECTION_BUDGET_FRAMES;
    this.furthestSection = Math.floor(spawn.s / config.CAVE_SEGMENT_LENGTH);
    this.framesSinceLastGate = 0;
    this.totalRaceFrames = 0;
    this.stallFrames = 0;
    this.deathPenalty = 0;
    this.speed = 0;
    this.engineBuild = 0;
    this.steeringAngle = 0;
    this.wheelLengths.fill(config.SUSP_REST);
    this.wheelSpin.fill(0);
    this.compression.fill(0);
    this.grounded.fill(false);
    this.airFrames = 0;
    this.landingDamp = 0;
    this.wasGrounded.fill(false);
    this.landingAbsorbed = false;
    this.selfRightFrames = 0;
    this.boostFrames = 0;
    this.stab.fill(0);
    this.hasPrevSensors = false;
    this.prevSensorInputs.fill(0);
  }

  #setOrientation(fwdx: number, fwdy: number, fwdz: number) {
    // right = forward x worldUp, normalized; up = right x forward. The
    // body's local -Z is the resulting forward direction.
    let rxw = -fwdz;
    let ryw = 0;
    let rzv = fwdx;
    const rlen = Math.sqrt(rxw * rxw + ryw * ryw + rzv * rzv) || 1;
    rxw /= rlen;
    ryw /= rlen;
    rzv /= rlen;
    const uxw = ryw * fwdz - rzv * fwdy;
    const uyw = rzv * fwdx - rxw * fwdz;
    const uzv = rxw * fwdy - ryw * fwdx;
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(rxw, ryw, rzv),
      new THREE.Vector3(uxw, uyw, uzv),
      new THREE.Vector3(-fwdx, -fwdy, -fwdz),
    );
    this.quat.setFromRotationMatrix(m);
    this.#refreshFrame();
  }

  update(cave: Cave) {
    if (this.damaged) return;
    this.controls.update();
    this.sectionFramesRemaining--;
    this.prevS = this.s;
    this.#move(cave);
    if (this.boostFrames > 0) this.boostFrames--;
    if (cave.boostAt(this.s, this.wheelHit.a) > 0.2) {
      if (this.boostFrames <= 0 && this.useAI)
        this.brain.score += config.BOOST_SCORE;
      this.boostFrames = config.BOOST_DURATION;
    }
    if (this.brain) this.#updateScore(cave);
    this.#updateSectionProgress();

    this.damaged =
      this.#assessDamage() || this.#checkStall() || this.#checkSectionBudget();
    if (this.damaged && this.brain) {
      this.brain.score -= this.deathPenalty + this.speed;
    }
    if (this.sensor) {
      this.sensor.update(cave);
      if (this.useAI) {
        const inputs = this.brainInputs;
        const prev = this.prevSensorInputs;
        const readings = this.sensor.readings;
        inputs.length = 0;
        for (let i = 0; i < readings.length; i++) inputs.push(readings[i]);
        if (!this.hasPrevSensors)
          for (let i = 0; i < prev.length; i++) prev[i] = readings[i];
        for (let i = 0; i < prev.length; i++) inputs.push(prev[i]);
        for (let i = 0; i < 4; i++)
          inputs.push(clamp(0, 1, this.compression[i] / config.SUSP_TRAVEL));
        inputs.push(Math.min(1, this.speed / this.maxSpeed));
        inputs.push(this.#velocityDelta());
        inputs.push(this.gateDelta);
        // Feature block: what the rays cannot say - the surface under the
        // car, what sits ahead on the line, and the car's own attitude.
        const surfaceA = this.wheelHit.a;
        const cellIndex = Math.floor(this.s / config.CAVE_FEATURE_CELL);
        const reach = config.CAVE_FEATURE_CELL * 1.5;
        let platformAhead = 0;
        let boostAhead = 0;
        let columnProximity = 0;
        let columnSide = 0;
        for (let i = cellIndex; i <= cellIndex + 2; i++) {
          const cell = cave.featureCell(i);
          if (cell.ramp) {
            const d = (cell.ramp.centerS - cell.ramp.halfLen - this.s) / reach;
            if (d >= 0)
              platformAhead = Math.max(platformAhead, 1 - Math.min(1, d));
          }
          if (cell.boost) {
            const d = (cell.boost.centerS - cell.boost.halfLen - this.s) / reach;
            if (d >= 0)
              boostAhead = Math.max(boostAhead, 1 - Math.min(1, d));
          }
          for (const col of cell.columns) {
            const d = (col.centerS - col.halfLen - this.s) / reach;
            if (d < 0 || d >= 1) continue;
            const wrap = (col.angle - surfaceA) % (Math.PI * 2);
            const offset =
              wrap > Math.PI
                ? wrap - Math.PI * 2
                : wrap < -Math.PI
                  ? wrap + Math.PI * 2
                  : wrap;
            const lateral = Math.abs(offset) * config.CAVE_RADIUS;
            const threat = (1 - d) * Math.max(0, 1 - lateral / 45);
            if (threat > columnProximity) {
              columnProximity = threat;
              columnSide = clamp(-1, 1, offset * 4);
            }
          }
        }
        inputs.push(
          this.grounded[0] ||
          this.grounded[1] ||
          this.grounded[2] ||
          this.grounded[3]
            ? 0
            : 1,
        );
        inputs.push(clamp(0, 1, -this.uy));
        inputs.push(clamp(0, 1, cave.platformAt(this.s, surfaceA)));
        inputs.push(clamp(0, 1, cave.boostAt(this.s, surfaceA)));
        inputs.push(platformAhead);
        inputs.push(boostAhead);
        inputs.push(columnProximity);
        inputs.push(columnSide);
        // refresh the history after the brain has read it
        for (let i = 0; i < prev.length; i++) prev[i] = inputs[i];
        const outputs = this.brain.process(inputs);
        const [throttle, left, right] = outputs;
        // one signed float: gas positive, brake / reverse negative
        this.controls.throttle = Math.max(-1, Math.min(1, throttle));
        this.controls.left = left;
        this.controls.right = right;
      }
    }
  }

  /** Forward progress into a new cave section is enough to reset the
   *  liveness budget. Reaching a scoring gate is not required: rings are
   *  sparse and can be missed while the car is still driving the cave. */
  #updateSectionProgress() {
    const section = Math.floor(this.s / config.CAVE_SEGMENT_LENGTH);
    if (section > this.furthestSection) {
      this.furthestSection = section;
      this.sectionFramesRemaining = config.SECTION_BUDGET_FRAMES;
    }
  }

  /** a car that makes no section progress for the frame budget dies, exactly
   *  like a collision */
  #checkSectionBudget() {
    return this.sectionFramesRemaining <= 0;
  }

  /** a car under CAR_STALL_SPEED for SECTION_BUDGET_FRAMES consecutive
   *  simulation frames has stalled: it dies and its brain pays STALL_PENALTY
   *  once. Any frame at or above the speed threshold resets the streak. */
  #checkStall() {
    if (
      this.vx * this.vx + this.vy * this.vy + this.vz * this.vz >=
      STALL_SPEED_SQ
    ) {
      this.stallFrames = 0;
      return false;
    }
    this.stallFrames++;
    if (this.stallFrames < config.SECTION_BUDGET_FRAMES) return false;
    this.deathPenalty = config.STALL_PENALTY;
    return true;
  }

  /** the gates in order carry the score; a gate touched out of order is a
   *  debt charged once per entry. The gates are rings across the cave at
   *  fixed arc spacing, so the claim is a simple arc crossing test */
  #updateScore(cave: Cave) {
    if (this.finished) return;
    this.framesSinceLastGate++;
    this.totalRaceFrames++;
    const n = config.GATES_PER_SEED;
    const spacing = config.GATE_SPACING;

    // the gate cell the car sits in: -1 before the first gate, capped at the
    // last gate once the finish is claimed
    const cellOf = (s: number) => {
      let cell = Math.floor(s / spacing) - 1;
      if (cell > n - 1) cell = n - 1;
      if (cell < -1) cell = -1;
      return cell;
    };
    const cell = cellOf(this.s);
    const prevCell = cellOf(this.prevS);

    if (cell !== this.insideGate) {
      // forward crossings report the new cell, backward ones the old one:
      // the gate ring crossed is always the higher of the two cells
      const crossed = cell > prevCell ? cell : prevCell;
      if (crossed === this.nextGate && this.nextGate < n) {
        this.brain.score += config.GATE_SCORE;
        const isFinish = this.nextGate === n - 1;
        // speed bonus on every gate but the finish gate, which is paid by the
        // finish bonus instead: faster crossing earns more
        if (!isFinish)
          this.brain.score +=
            config.GATE_SPEED_BONUS / Math.max(1, this.framesSinceLastGate);
        this.completedGateIndex = crossed;
        this.completedGateFrames = this.framesSinceLastGate;
        this.framesSinceLastGate = 0;
        this.passedGate = true;
        // Gates still award score, but do not control car lifetime. The
        // section-progress budget is reset only by actual forward progress.
        if (isFinish) {
          // completing the cave is the biggest reward in the game: it puts a
          // finisher far ahead of any partial run, whatever its pace
          this.finished = true;
          this.lastFinishFrames = this.totalRaceFrames;
          this.brain.score += config.FINISH_BONUS;
        }
        this.nextGate++;
      } else if (crossed >= 0) {
        this.brain.score -= config.WRONG_GATE_PENALTY;
      }
      this.insideGate = cell;
    }

    // the viz line reads these, the brain reads the same delta as an input
    if (this.nextGate < n) {
      const gp = cave.centerAt(cave.gatePositions[this.nextGate], {
        x: 0,
        y: 0,
        z: 0,
      });
      this.gateX = gp.x;
      this.gateY = gp.y;
      this.gateZ = gp.z;
      const dx = gp.x - this.x;
      const dy = gp.y - this.y;
      const dz = gp.z - this.z;
      // signed angle from the forward to the gate, around the car's up axis
      const crossX = this.fy * dz - this.fz * dy;
      const crossY = this.fz * dx - this.fx * dz;
      const crossZ = this.fx * dy - this.fy * dx;
      const dot = this.fx * dx + this.fy * dy + this.fz * dz;
      const around = crossX * this.ux + crossY * this.uy + crossZ * this.uz;
      this.gateDelta = clamp(-1, 1, Math.atan2(around, dot) / Math.PI);
    } else {
      this.gateDelta = 0;
    }
  }

  /** the speed cap right now: a running boost lifts it above the normal
   *  top speed, fading back down as the boost timer runs out */
  effectiveMaxSpeed(): number {
    if (this.boostFrames <= 0) return this.maxSpeed;
    return (
      this.maxSpeed +
      config.BOOST_SPEED_BONUS * (this.boostFrames / config.BOOST_DURATION)
    );
  }

  /** signed angle between the velocity and the front, in [-1, 1] */
  #velocityDelta() {
    const dot = this.vx * this.fx + this.vy * this.fy + this.vz * this.fz;
    const crossX = this.vy * this.fz - this.vz * this.fy;
    const crossY = this.vz * this.fx - this.vx * this.fz;
    const crossZ = this.vx * this.fy - this.vy * this.fx;
    const around = crossX * this.ux + crossY * this.uy + crossZ * this.uz;
    if (around === 0 && dot === 0) return 0;
    return clamp(-1, 1, Math.atan2(around, dot) / Math.PI);
  }

  /** rotate a body-local vector into world space with the current quaternion,
   *  written into out. The quaternion components are read once, no objects. */
  #toWorld(
    lx: number,
    ly: number,
    lz: number,
    out: { x: number; y: number; z: number },
  ) {
    const qx = this.quat.x;
    const qy = this.quat.y;
    const qz = this.quat.z;
    const qw = this.quat.w;
    out.x =
      (1 - 2 * (qy * qy + qz * qz)) * lx +
      2 * (qx * qy - qz * qw) * ly +
      2 * (qx * qz + qy * qw) * lz;
    out.y =
      2 * (qx * qy + qz * qw) * lx +
      (1 - 2 * (qx * qx + qz * qz)) * ly +
      2 * (qy * qz - qx * qw) * lz;
    out.z =
      2 * (qx * qz - qy * qw) * lx +
      2 * (qy * qz + qx * qw) * ly +
      (1 - 2 * (qx * qx + qy * qy)) * lz;
    return out;
  }

  public steeringAngle = 0;
  public wheelLengths = [
    config.SUSP_REST,
    config.SUSP_REST,
    config.SUSP_REST,
    config.SUSP_REST,
  ];
  public wheelSpin = [0, 0, 0, 0];
  #vector = new THREE.Vector3();
  #force = new THREE.Vector3();
  #torque = new THREE.Vector3();
  #angular = new THREE.Vector3();
  #anchor = new THREE.Vector3();
  #forward = new THREE.Vector3();
  #side = new THREE.Vector3();
  #normal = new THREE.Vector3();
  #velocity = new THREE.Vector3();
  #inverse = new THREE.Quaternion();

  #refreshFrame() {
    this.#toWorld(0, 0, -1, this.#vector);
    this.fx = this.#vector.x;
    this.fy = this.#vector.y;
    this.fz = this.#vector.z;
    this.#toWorld(1, 0, 0, this.#vector);
    this.rx = this.#vector.x;
    this.ry = this.#vector.y;
    this.rz = this.#vector.z;
    this.#toWorld(0, 1, 0, this.#vector);
    this.ux = this.#vector.x;
    this.uy = this.#vector.y;
    this.uz = this.#vector.z;
  }

  // Unit chassis mass, with the box's inertia tensor in its own frame.
  #inverseInertia(v: THREE.Vector3) {
    this.#inverse.copy(this.quat).conjugate();
    v.applyQuaternion(this.#inverse);
    v.x *= 12 / (this.height ** 2 + this.length ** 2);
    v.y *= 12 / (this.width ** 2 + this.length ** 2);
    v.z *= 12 / (this.width ** 2 + this.height ** 2);
    return v.applyQuaternion(this.quat);
  }

  #applyForce(x: number, y: number, z: number) {
    this.#force.x += x;
    this.#force.y += y;
    this.#force.z += z;
    this.#torque.x += this.#anchor.y * z - this.#anchor.z * y;
    this.#torque.y += this.#anchor.z * x - this.#anchor.x * z;
    this.#torque.z += this.#anchor.x * y - this.#anchor.y * x;
  }

  #move(cave: Cave) {
    const dt = 1 / config.PHYSICS_SUBSTEPS;
    const throttle = clamp(-1, 1, this.controls.throttle);
    this.engineBuild =
      throttle > 0 && this.uy > 0
        ? Math.min(
            1,
            this.engineBuild + throttle / config.CAR_ENGINE_BUILD_FRAMES,
          )
        : 0;
    const engine = lerp(
      config.CAR_ENGINE_START,
      config.CAR_ENGINE,
      this.engineBuild,
    );
    const targetSteer =
      (clamp(-1, 1, this.controls.left - this.controls.right) *
        config.CAR_STEER_MAX) /
      (1 + this.speed * 0.12);
    this.steeringAngle += (targetSteer - this.steeringAngle) * 0.2;
    // Airborne timing: a frame with no grounded wheel counts toward air time,
    // and the first frame back on the ground opens a short, strong pitch/roll
    // damping window so a one-wheel touchdown cannot cartwheel the car.
    const groundedLast =
      this.grounded[0] ||
      this.grounded[1] ||
      this.grounded[2] ||
      this.grounded[3];
    if (this.landingDamp > 0)
      this.landingDamp = Math.max(
        0,
        this.landingDamp - 1 / config.CAR_LANDING_DAMP_FRAMES,
      );
    if (!groundedLast) {
      this.airFrames++;
      this.landingAbsorbed = false;
    } else if (this.airFrames > 0) {
      this.landingDamp = Math.min(
        1,
        this.airFrames / config.CAR_LANDING_DAMP_FRAMES,
      );
      this.airFrames = 0;
    }
    for (let step = 0; step < config.PHYSICS_SUBSTEPS; step++) {
      this.#refreshFrame();
      // Tires cannot propel the car once its body-up points against gravity.
      const uprightTraction = Math.max(0, this.uy);
      cave.tangent(this.s, this.#vector);
      this.cx = this.#vector.x;
      this.cy = this.#vector.y;
      this.cz = this.#vector.z;
      this.#force.set(0, -config.CAR_GRAVITY, 0);
      this.#torque.set(0, 0, 0);
      // Boost: a pad on the ground pushes the car along the cave tangent
      // up to the lifted speed cap, which fades back over the timer. The
      // push is capped like the drive force, so a pad is a burst to the
      // boosted top speed, not a rocket.
      if (this.boostFrames > 0) {
        const alongSpeed =
          this.vx * this.cx + this.vy * this.cy + this.vz * this.cz;
        if (alongSpeed < this.effectiveMaxSpeed()) {
          this.#force.x += this.cx * config.BOOST_ACCEL;
          this.#force.y += this.cy * config.BOOST_ACCEL;
          this.#force.z += this.cz * config.BOOST_ACCEL;
        }
      }
      this.#angular.set(this.avx, this.avy, this.avz);
      // Anti-roll / anti-pitch bars: transfer suspension load toward the
      // compressed wheel of an axle (and the compressed axle). The paired
      // forces cancel, leaving a restoring roll/pitch torque that settles the
      // car. Gated on both wheels of the pair touching down, so it can never
      // add a spurious force during a one-wheel touchdown.
      const barSpring = config.SUSP_SPRING * config.CAR_ANTI_ROLL;
      const frontPair = this.grounded[0] && this.grounded[1];
      const rearPair = this.grounded[2] && this.grounded[3];
      const axlesDown =
        (this.grounded[0] || this.grounded[1]) &&
        (this.grounded[2] || this.grounded[3]);
      const rollFront = frontPair
        ? (this.compression[0] - this.compression[1]) * barSpring
        : 0;
      const rollRear = rearPair
        ? (this.compression[2] - this.compression[3]) * barSpring
        : 0;
      const pitchBar = axlesDown
        ? (this.compression[0] +
            this.compression[1] -
            this.compression[2] -
            this.compression[3]) *
          0.5 *
          config.SUSP_SPRING *
          config.CAR_ANTI_PITCH
        : 0;
      this.stab[0] = rollFront + pitchBar;
      this.stab[1] = -rollFront + pitchBar;
      this.stab[2] = rollRear - pitchBar;
      this.stab[3] = -rollRear - pitchBar;
      for (let w = 0; w < 4; w++) {
        const off = config.WHEEL_OFFSETS[w];
        this.#toWorld(off[0], off[1], off[2], this.#anchor);
        const distance = cave.castWheelRay(
          this.x + this.#anchor.x,
          this.y + this.#anchor.y,
          this.z + this.#anchor.z,
          -this.ux,
          -this.uy,
          -this.uz,
          config.SUSP_REST + config.CAR_WHEEL_RADIUS,
          this.s,
          this.wheelHit,
        );
        this.grounded[w] = distance >= 0;
        this.wheelLengths[w] =
          distance < 0
            ? config.SUSP_REST
            : clamp(
                config.SUSP_REST - config.SUSP_TRAVEL,
                config.SUSP_REST,
                distance - config.CAR_WHEEL_RADIUS,
              );
        this.compression[w] = config.SUSP_REST - this.wheelLengths[w];
        if (distance < 0) continue;
        this.#normal.set(
          -this.wheelHit.nx,
          -this.wheelHit.ny,
          -this.wheelHit.nz,
        );
        // First contact of a landing: absorb most of the impact velocity
        // along the wheel normal. The car squats into the spring instead of
        // rebounding; the landing spin-damp window settles the rotation.
        if (
          this.grounded[w] &&
          !this.wasGrounded[w] &&
          !this.landingAbsorbed
        ) {
          const impact =
            this.vx * this.#normal.x +
            this.vy * this.#normal.y +
            this.vz * this.#normal.z;
          if (impact < 0) {
            this.landingAbsorbed = true;
            this.vx -=
              this.#normal.x * impact * config.CAR_LANDING_VEL_ABSORB;
            this.vy -=
              this.#normal.y * impact * config.CAR_LANDING_VEL_ABSORB;
            this.vz -=
              this.#normal.z * impact * config.CAR_LANDING_VEL_ABSORB;
          }
        }
        // Apply suspension and tire forces at the contact patch. This gives
        // one chassis real pitch, roll and yaw from four independent wheels.
        this.#anchor.addScaledVector(
          this.#vector.set(this.ux, this.uy, this.uz),
          -distance,
        );
        this.#velocity.crossVectors(this.#angular, this.#anchor);
        this.#velocity.add(this.#vector.set(this.vx, this.vy, this.vz));
        const load = Math.max(
          0,
          config.SUSP_SPRING * this.compression[w] -
            config.SUSP_DAMP * this.#velocity.dot(this.#normal) +
            this.stab[w],
        );
        const angle = w < 2 ? this.steeringAngle : 0;
        this.#forward.set(
          this.fx * Math.cos(angle) - this.rx * Math.sin(angle),
          this.fy * Math.cos(angle) - this.ry * Math.sin(angle),
          this.fz * Math.cos(angle) - this.rz * Math.sin(angle),
        );
        this.#forward
          .addScaledVector(this.#normal, -this.#forward.dot(this.#normal))
          .normalize();
        this.#side.crossVectors(this.#forward, this.#normal).normalize();
        const longitudinal = this.#velocity.dot(this.#forward);
        const lateral = this.#velocity.dot(this.#side);
        let drive = 0;
        if (
          throttle > 0 &&
          uprightTraction > 0 &&
          longitudinal < this.effectiveMaxSpeed()
        ) {
          // Compensate uphill gravity at the driven tires, so a gentle
          // throttle launch can climb instead of spending all torque on weight.
          // This stays inside the contact's friction circle and never acts in air.
          const uphillAssist = Math.max(
            0,
            config.CAR_GRAVITY * this.#forward.y,
          );
          drive = ((engine + uphillAssist) * throttle * uprightTraction) / 4;
        }
        if (throttle < 0) {
          if (longitudinal > 0.15) {
            drive = -Math.min(
              (config.CAR_BRAKE_DECEL * -throttle) / 4,
              longitudinal / (4 * dt),
            );
          } else if (
            uprightTraction > 0 &&
            longitudinal > -this.effectiveMaxSpeed() / 2
          ) {
            drive =
              (config.CAR_REVERSE_ACCEL * throttle * uprightTraction) / 4;
          }
        }
        // Grounded tires lose momentum even at low speed. Bound resistance
        // by the wheel's stopping impulse so friction cannot reverse the car.
        const rollingResistance = Math.min(
          load * config.WHEEL_ROLLING_RESISTANCE +
            Math.abs(longitudinal) * 0.002,
          Math.abs(longitudinal) / (4 * dt),
        );
        drive -= Math.sign(longitudinal) * rollingResistance;
        // Lateral grip relaxes toward top speed: grippy in the corners,
        // straight-line stable at speed.
        const grip = lerp(
          config.CAR_GRIP,
          config.CAR_GRIP_AT_TOP,
          clamp(0, 1, this.speed / this.maxSpeed),
        );
        let side = (-lateral * grip) / 4;
        // Arcade rollover guard: the lateral force per wheel is capped below
        // the friction circle, so a too-tight turn understeers instead of
        // lifting the inner wheels and rolling the car over.
        const sideCap = load * config.CAR_LATERAL_FRICTION;
        if (side > sideCap) side = sideCap;
        else if (side < -sideCap) side = -sideCap;
        // Friction circle: airborne/unloaded wheels cannot propel the car,
        // and braking/acceleration share the available grip with cornering.
        const limit = load * config.TIRE_FRICTION;
        const scale = Math.min(1, limit / (Math.hypot(drive, side) || 1));
        drive *= scale;
        side *= scale;
        this.#applyForce(
          this.#normal.x * load,
          this.#normal.y * load,
          this.#normal.z * load,
        );
        // Arcade roll-center assist: suspension keeps its full lever arm,
        // while tire forces act nearer the center of mass. This preserves
        // yaw and weight transfer without rolling over on ordinary turns.
        const contactHeight =
          this.#anchor.x * this.ux +
          this.#anchor.y * this.uy +
          this.#anchor.z * this.uz;
        this.#anchor.addScaledVector(
          this.#vector.set(this.ux, this.uy, this.uz),
          -config.TIRE_ROLL_CENTER - contactHeight,
        );
        this.#applyForce(
          this.#forward.x * drive + this.#side.x * side,
          this.#forward.y * drive + this.#side.y * side,
          this.#forward.z * drive + this.#side.z * side,
        );
        this.wheelSpin[w] += (longitudinal * dt) / config.CAR_WHEEL_RADIUS;
      }
      for (let w = 0; w < 4; w++) this.wasGrounded[w] = this.grounded[w];
      // Airborne attitude assist: gravity acts at the center of mass, so in the
      // air the whole take-off pitch carries straight into the landing. Build a
      // world-frame angular velocity that rotates the forward toward the road
      // tangent and the body up toward that tangent's up. Targeting the slope
      // instead of the world horizon keeps hill climbs gripping while still
      // flattening a jump. The rate is proportional to the error, so it settles
      // without overshoot; the cap keeps a real jump arcing.
      if (
        this.airFrames >= config.CAR_AIR_LEVEL_DELAY &&
        this.uy > config.CAR_INVERT_THRESHOLD &&
        !this.grounded[0] &&
        !this.grounded[1] &&
        !this.grounded[2] &&
        !this.grounded[3]
      ) {
        const tx = this.cx;
        const ty = this.cy;
        const tz = this.cz;
        // target right = tangent x worldUp, target up = right x tangent
        const trx = -tz;
        const trz = tx;
        const trl = Math.hypot(trx, trz) || 1;
        const rnx = trx / trl;
        const rnz = trz / trl;
        const tux = -rnz * ty;
        const tuy = rnz * tx - rnx * tz;
        const tuz = rnx * ty;
        // f x target-forward and u x target-up: the shortest arcs to align
        let wx = this.fy * tz - this.fz * ty + (this.uy * tuz - this.uz * tuy);
        let wz = this.fx * ty - this.fy * tx + (this.ux * tuy - this.uy * tux);
        wx *= config.CAR_AIR_LEVEL_GAIN;
        wz *= config.CAR_AIR_LEVEL_GAIN;
        const rate = Math.hypot(wx, wz);
        if (rate > config.CAR_AIR_LEVEL_RATE) {
          const scale = config.CAR_AIR_LEVEL_RATE / rate;
          wx *= scale;
          wz *= scale;
        }
        const airResponse = config.CAR_AIR_LEVEL_RESPONSE * dt;
        this.avx += (wx - this.avx) * airResponse;
        this.avz += (wz - this.avz) * airResponse;
        // Steering keeps working in the air with reduced authority, so a
        // jump can be aimed.
        const steer = clamp(-1, 1, this.controls.left - this.controls.right);
        this.avy +=
          (steer * config.CAR_AIR_STEER_TORQUE - this.avy) * airResponse;
      }
      // Upside-down handling: past the flip point the wheels are in the sky
      // and the chassis meets the ground. The roof is grippier than the
      // wheels (it bleeds speed and spin instead of skidding). A car that
      // flipped while moving fast performs a scripted flip back onto its
      // wheels; a slow one rests on its roof and is left to drag, stall or
      // be pushed off. A tilted car above the threshold is still in control
      // and gets none of this.
      if (this.selfRightFrames > 0) {
        // The rotation is imposed (an arcade moment): the roof drag, the
        // corner collisions and the landing settle keep running underneath.
        this.selfRightFrames--;
        const t = 1 - this.selfRightFrames / config.CAR_SELF_RIGHT_SUBSTEPS;
        const e = t * t * (3 - 2 * t);
        const theta = this.flipAngle * e;
        const sh = Math.sin(theta / 2);
        const ch = Math.cos(theta / 2);
        const { x: px, y: py, z: pz, w: pw } = this.quat;
        this.quat.x =
          ch * px +
          this.flipAxisX * sh * pw +
          this.flipAxisY * sh * pz -
          this.flipAxisZ * sh * py;
        this.quat.y =
          ch * py +
          this.flipAxisY * sh * pw +
          this.flipAxisZ * sh * px -
          this.flipAxisX * sh * pz;
        this.quat.z =
          ch * pz +
          this.flipAxisZ * sh * pw +
          this.flipAxisX * sh * py -
          this.flipAxisY * sh * px;
        this.quat.w =
          ch * pw -
          this.flipAxisX * sh * px -
          this.flipAxisY * sh * py -
          this.flipAxisZ * sh * pz;
        this.quat.normalize();
        // the angular velocity tracks the scripted rate, so the landing
        // momentum and the spin damping stay continuous
        const rate =
          (this.flipAngle * 6 * t * (1 - t)) / config.CAR_SELF_RIGHT_SUBSTEPS;
        this.avx = this.flipAxisX * rate;
        this.avy = this.flipAxisY * rate;
        this.avz = this.flipAxisZ * rate;
      }
      if (this.uy < 0) {
        const roofDist = cave.castWheelRay(
          this.x,
          this.y,
          this.z,
          this.ux,
          this.uy,
          this.uz,
          config.CAR_HEIGHT / 2 + 1.5,
          this.s,
          this.wheelHit,
        );
        if (roofDist >= 0) {
          this.#force.x -= this.vx * config.ROOF_FRICTION;
          this.#force.y -= this.vy * config.ROOF_FRICTION;
          this.#force.z -= this.vz * config.ROOF_FRICTION;
          this.avx *= config.ROOF_SPIN_DAMP;
          this.avz *= config.ROOF_SPIN_DAMP;
        }
      }
      if (
        this.uy < config.CAR_INVERT_THRESHOLD &&
        this.selfRightFrames === 0 &&
        this.speed > config.CAR_SELF_RIGHT_SPEED
      ) {
        // start the flip about the body lateral axis, as oriented now: the
        // rotation carries the car nose-first back onto its wheels
        this.selfRightFrames = config.CAR_SELF_RIGHT_SUBSTEPS;
        this.flipAxisX = this.rx;
        this.flipAxisY = this.ry;
        this.flipAxisZ = this.rz;
        this.flipAngle = Math.acos(clamp(-1, 1, this.uy));
      }
      this.vx += this.#force.x * dt;
      this.vy += this.#force.y * dt;
      this.vz += this.#force.z * dt;
      const drag = Math.pow(0.999, dt);
      this.vx *= drag;
      this.vy *= drag;
      this.vz *= drag;
      this.#inverseInertia(this.#torque);
      // Mild angular damping is the arcade assist; never snap orientation or
      // pull an airborne wheel toward the floor. Pitch and roll get extra
      // damping for a short window after touchdown, while yaw keeps the normal
      // rate so a landing never blunts the steering.
      const spinDamp =
        this.landingDamp > 0
          ? lerp(
              config.CAR_SPIN_DAMP,
              config.CAR_LANDING_SPIN_DAMP,
              this.landingDamp,
            )
          : config.CAR_SPIN_DAMP;
      const angularDrag = Math.pow(config.CAR_SPIN_DAMP, dt);
      const tippingDrag = Math.pow(spinDamp, dt);
      this.avx = (this.avx + this.#torque.x * dt) * tippingDrag;
      this.avy = (this.avy + this.#torque.y * dt) * angularDrag;
      this.avz = (this.avz + this.#torque.z * dt) * tippingDrag;
      const { x: qx, y: qy, z: qz, w: qw } = this.quat;
      this.quat.x += 0.5 * dt * (this.avx * qw + this.avy * qz - this.avz * qy);
      this.quat.y += 0.5 * dt * (this.avy * qw + this.avz * qx - this.avx * qz);
      this.quat.z += 0.5 * dt * (this.avz * qw + this.avx * qy - this.avy * qx);
      this.quat.w -= 0.5 * dt * (this.avx * qx + this.avy * qy + this.avz * qz);
      this.quat.normalize();
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.z += this.vz * dt;
      this.s = Math.max(
        0,
        this.s +
          dt * (this.vx * this.cx + this.vy * this.cy + this.vz * this.cz),
      );
      // The chassis is a box, not the oversized sphere that used to float
      // above the wheels. Resolve corner penetration with contact impulses.
      for (let corner = 0; corner < 8; corner++) {
        this.#toWorld(
          ((corner & 1 ? 1 : -1) * this.width) / 2,
          ((corner & 2 ? 1 : -1) * this.height) / 2,
          ((corner & 4 ? 1 : -1) * this.length) / 2,
          this.#anchor,
        );
        cave.nearestRadial(
          this.x + this.#anchor.x,
          this.y + this.#anchor.y,
          this.z + this.#anchor.z,
          this.s,
          this.hit,
        );
        if (this.hit.dist <= 0) continue;
        this.#normal.set(this.hit.nx, this.hit.ny, this.hit.nz);
        this.x -= this.hit.nx * this.hit.dist;
        this.y -= this.hit.ny * this.hit.dist;
        this.z -= this.hit.nz * this.hit.dist;
        this.#angular.set(this.avx, this.avy, this.avz);
        this.#velocity
          .crossVectors(this.#angular, this.#anchor)
          .add(this.#vector.set(this.vx, this.vy, this.vz));
        const impact = this.#velocity.dot(this.#normal);
        if (impact <= 0) continue;
        this.#vector.crossVectors(this.#anchor, this.#normal);
        this.#inverseInertia(this.#vector);
        const effectiveMass =
          1 +
          this.#torque
            .crossVectors(this.#vector, this.#anchor)
            .dot(this.#normal);
        const impulse = (impact * (1 + config.CAR_RESTITUTION)) / effectiveMass;
        this.vx -= this.hit.nx * impulse;
        this.vy -= this.hit.ny * impulse;
        this.vz -= this.hit.nz * impulse;
        this.avx -= this.#vector.x * impulse;
        this.avy -= this.#vector.y * impulse;
        this.avz -= this.#vector.z * impulse;
        if (impact > config.CAR_CRASH_SPEED) {
          this.deathPenalty = lerp(
            1,
            5,
            clamp(0, 1, impact / (this.speed || 1)),
          );
          this.damaged = true;
        }
      }
      if (this.damaged) break;
    }
    this.#refreshFrame();
    this.speed = Math.hypot(this.vx, this.vy, this.vz);
    // A flipped car is not killed outright: landing on its side or roof only
    // costs the car its traction, and the liveness timer (stall / section
    // budget) is what eventually retires it if it never recovers.
  }

  /** wall hits and tunneling set damaged inside #move; this only reports it.
   *  The debt is charged by update() together with the speed */
  #assessDamage() {
    return this.damaged;
  }
}
