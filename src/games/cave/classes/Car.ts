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
const EXTRA_BRAIN_INPUTS = 3;

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
 * and angular velocity) and four raycast wheel contacts that pull the body
 * back to the cave floor with a spring-damper and apply the tire forces in
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
  public width = 4.4;
  public height = 2.2;
  public length = 8.5;
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
  /** frames remaining to reach the next gate at the reference 60 FPS */
  public gateFramesRemaining = config.GATE_BUDGET_FRAMES;
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
    spawn: { x: number; y: number; z: number; tx: number; ty: number; tz: number; s: number },
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
    this.gateFramesRemaining = config.GATE_BUDGET_FRAMES;
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
    this.gateFramesRemaining = config.GATE_BUDGET_FRAMES;
    this.framesSinceLastGate = 0;
    this.totalRaceFrames = 0;
    this.stallFrames = 0;
    this.deathPenalty = 0;
    this.speed = 0;
    this.compression.fill(0);
    this.grounded.fill(false);
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
  }

  update(cave: Cave) {
    if (this.damaged) return;
    this.controls.update();
    this.gateFramesRemaining--;
    this.prevS = this.s;
    this.#move(cave);
    if (this.brain) this.#updateScore(cave);

    this.damaged =
      this.#assessDamage() ||
      this.#checkStall() ||
      this.#checkBudget();
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
          inputs.push(
            clamp(
              0,
              1,
              this.compression[i] / config.SUSP_TRAVEL,
            ),
          );
        inputs.push(Math.min(1, this.speed / this.maxSpeed));
        inputs.push(this.#velocityDelta());
        inputs.push(this.gateDelta);
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

  /** a car that misses its next gate for the frame budget dies, exactly like
   *  a collision */
  #checkBudget() {
    return this.gateFramesRemaining <= 0;
  }

  /** a car under CAR_STALL_SPEED for GATE_BUDGET_FRAMES consecutive
   *  simulation frames has stalled: it dies and its brain pays STALL_PENALTY
   *  once. Any frame at or above the speed threshold resets the streak. */
  #checkStall() {
    if (this.vx * this.vx + this.vy * this.vy + this.vz * this.vz >= STALL_SPEED_SQ) {
      this.stallFrames = 0;
      return false;
    }
    this.stallFrames++;
    if (this.stallFrames < config.GATE_BUDGET_FRAMES) return false;
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
        this.gateFramesRemaining = config.GATE_BUDGET_FRAMES;
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

  /** signed angle between the velocity and the front, in [-1, 1] */
  #velocityDelta() {
    const dot =
      this.vx * this.fx + this.vy * this.fy + this.vz * this.fz;
    const crossX = this.vy * this.fz - this.vz * this.fy;
    const crossY = this.vz * this.fx - this.vx * this.fz;
    const crossZ = this.vx * this.fy - this.vy * this.fx;
    const around =
      crossX * this.ux + crossY * this.uy + crossZ * this.uz;
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

  #fw: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  #rw: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  #uw: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  #down: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  #anchor: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  #tangent: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  #uprightMatrix = new THREE.Matrix4();
  #uprightQuaternion = new THREE.Quaternion();

  #move(cave: Cave) {
    // 1. body frame from the quaternion
    this.#toWorld(0, 0, -1, this.#fw);
    this.#toWorld(1, 0, 0, this.#rw);
    this.#toWorld(0, 1, 0, this.#uw);
    this.fx = this.#fw.x;
    this.fy = this.#fw.y;
    this.fz = this.#fw.z;
    this.rx = this.#rw.x;
    this.ry = this.#rw.y;
    this.rz = this.#rw.z;
    this.ux = this.#uw.x;
    this.uy = this.#uw.y;
    this.uz = this.#uw.z;
    this.#down.x = -this.ux;
    this.#down.y = -this.uy;
    this.#down.z = -this.uz;
    cave.tangent(this.s, this.#tangent);
    this.cx = this.#tangent.x;
    this.cy = this.#tangent.y;
    this.cz = this.#tangent.z;

    // 2. steering fades in with speed: a stationary car cannot pivot hard
    const steer = this.controls.left - this.controls.right;
    const steerEffect = lerp(0.25, 1, Math.min(1, this.speed / 3));
    const steerAngle = steer * config.CAR_STEER_MAX * steerEffect;
    const cs = Math.cos(steerAngle);
    const ss = Math.sin(steerAngle);

    // 3. the four wheels: suspension ray, tire forces in the wheel frame
    let accX = 0;
    let accY = -config.CAR_GRAVITY;
    let accZ = 0;
    let tqX = 0;
    let tqY = 0;
    let tqZ = 0;
    let groundedCount = 0;
    const speedRatio = Math.min(1, this.speed / this.maxSpeed);
    const grip = config.CAR_GRIP * (1 - 0.45 * speedRatio);
    for (let w = 0; w < 4; w++) {
      const off = config.WHEEL_OFFSETS[w];
      // wheel anchor in world space
      this.#toWorld(off[0], off[1], off[2], this.#anchor);
      this.#anchor.x += this.x;
      this.#anchor.y += this.y;
      this.#anchor.z += this.z;

      // Query the wheel point directly against the analytic surface. A
      // downward ray can miss a steep/bumpy wall between frames; the radial
      // point query cannot tunnel and still represents a four-point vehicle.
      cave.nearestRadial(
        this.#anchor.x,
        this.#anchor.y,
        this.#anchor.z,
        this.s,
        this.wheelHit,
      );
      // dist is negative inside the cave. Suspension travel begins when the
      // wheel is within (radius + travel) of the wall and reaches full
      // compression at actual wheel-surface contact.
      const compression = clamp(
        0,
        config.SUSP_TRAVEL,
        this.wheelHit.dist + config.CAR_WHEEL_RADIUS + config.SUSP_TRAVEL,
      );
      const grounded = compression > 0;
      this.grounded[w] = grounded;
      if (!grounded) {
        this.compression[w] = 0;
        continue;
      }
      groundedCount++;
      this.compression[w] = compression;
      const nx = this.wheelHit.nx;
      const ny = this.wheelHit.ny;
      const nz = this.wheelHit.nz;

      // wheel velocity = body velocity + angular velocity x radius
      const rlx = this.#anchor.x - this.x;
      const rly = this.#anchor.y - this.y;
      const rlz = this.#anchor.z - this.z;
      const wvx = this.vx + (this.avy * rlz - this.avz * rly);
      const wvy = this.vy + (this.avz * rlx - this.avx * rlz);
      const wvz = this.vz + (this.avx * rly - this.avy * rlx);

      // wheel frame: the front wheels steer around the body up axis
      let fwX: number;
      let fwY: number;
      let fwZ: number;
      let flX: number;
      let flY: number;
      let flZ: number;
      if (w < 2) {
        // forward = -ss*right - cs*forward, right = cs*right - ss*forward
        fwX = -ss * this.rx - cs * this.fx;
        fwY = -ss * this.ry - cs * this.fy;
        fwZ = -ss * this.rz - cs * this.fz;
        flX = cs * this.rx - ss * this.fx;
        flY = cs * this.ry - ss * this.fy;
        flZ = cs * this.rz - ss * this.fz;
      } else {
        fwX = this.fx;
        fwY = this.fy;
        fwZ = this.fz;
        flX = this.rx;
        flY = this.ry;
        flZ = this.rz;
      }
      const oldVL = wvx * fwX + wvy * fwY + wvz * fwZ;
      const oldVLat = wvx * flX + wvy * flY + wvz * flZ;
      let vL = oldVL;
      // engine: positive drives, negative brakes then reverses
      if (this.controls.throttle > 0)
        vL += config.CAR_ENGINE * this.controls.throttle;
      else if (this.controls.throttle < 0) {
        const t = -this.controls.throttle;
        if (vL > 0.3) vL -= config.CAR_BRAKE_DECEL * t;
        else vL -= config.CAR_REVERSE_ACCEL * t;
      }
      vL *= 0.999;
      const dvL = vL - oldVL;
      // tire grip: cancel the lateral slip, shared over the grounded wheels
      const dvLat = -oldVLat * grip * (groundedCount / 4);
      // The radial normal points from the cave axis into its wall. Springs
      // push the car in the opposite direction, back into the cave. The old
      // sign pushed the wheels through the floor and then flipped the body.
      const vn = wvx * nx + wvy * ny + wvz * nz;
      const damp = vn > 0 ? config.SUSP_DAMP * vn : 0;
      const suspension = -(config.SUSP_SPRING * compression + damp);
      const aX = fwX * dvL + flX * dvLat + nx * suspension;
      const aY = fwY * dvL + flY * dvLat + ny * suspension;
      const aZ = fwZ * dvL + flZ * dvLat + nz * suspension;

      accX += aX / 4;
      accY += aY / 4;
      accZ += aZ / 4;
      tqX += (rly * aZ - rlz * aY) / config.CAR_INERTIA;
      tqY += (rlz * aX - rlx * aZ) / config.CAR_INERTIA;
      tqZ += (rlx * aY - rly * aX) / config.CAR_INERTIA;
    }

    // 4. integrate the body
    this.vx += accX;
    this.vy += accY;
    this.vz += accZ;
    this.vx *= 0.999;
    this.vy *= 0.999;
    this.vz *= 0.999;
    // caps: forward <= maxSpeed, reverse >= -maxSpeed/2
    const fSpeed = this.vx * this.fx + this.vy * this.fy + this.vz * this.fz;
    if (fSpeed > this.maxSpeed) {
      const over = fSpeed - this.maxSpeed;
      this.vx -= this.fx * over;
      this.vy -= this.fy * over;
      this.vz -= this.fz * over;
    } else if (fSpeed < -this.maxSpeed / 2) {
      const under = fSpeed + this.maxSpeed / 2;
      this.vx -= this.fx * under;
      this.vy -= this.fy * under;
      this.vz -= this.fz * under;
    }
    this.avx += tqX;
    this.avy += tqY;
    this.avz += tqZ;
    // A simple anti-roll damper keeps a single wheel hitting a bump from
    // tumbling the lightweight body. Yaw remains responsive; pitch and roll
    // settle quickly toward the cave surface.
    this.avx *= 0.82;
    this.avy *= 0.97;
    this.avz *= 0.82;
    // integrate the orientation: dq = 0.5 * (w quat) x q
    const qx = this.quat.x;
    const qy = this.quat.y;
    const qz = this.quat.z;
    const qw = this.quat.w;
    this.quat.x += 0.5 * (this.avx * qw + this.avy * qz - this.avz * qy);
    this.quat.y += 0.5 * (this.avy * qw + this.avz * qx - this.avx * qz);
    this.quat.z += 0.5 * (this.avz * qw + this.avx * qy - this.avy * qx);
    this.quat.w += -0.5 * (this.avx * qx + this.avy * qy + this.avz * qz);
    this.quat.normalize();
    this.#stabilizeUpright();
    this.x += this.vx;
    this.y += this.vy;
    this.z += this.vz;
    this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy + this.vz * this.vz);

    // 5. progress along the cave axis
    this.s = Math.max(0, this.s + this.vx * this.cx + this.vy * this.cy + this.vz * this.cz);

    // 6. the body is a sphere against the cave walls: push out, bounce, and
    //  kill the car on a hard enough hit
    const body = this.hit;
    cave.nearestRadial(this.x, this.y, this.z, this.s, body);
    // body.dist is negative while inside the tube. The sphere touches a wall
    // when its radial clearance is smaller than its radius, i.e. dist > -R.
    // Push inward (toward the cave axis), not outward into the wall.
    if (body.dist > -config.CAR_BODY_RADIUS) {
      const pen = body.dist + config.CAR_BODY_RADIUS;
      this.x -= body.nx * pen;
      this.y -= body.ny * pen;
      this.z -= body.nz * pen;
      const vn = this.vx * body.nx + this.vy * body.ny + this.vz * body.nz;
      if (vn > 0) {
        const j = vn * (1 + config.CAR_RESTITUTION);
        this.vx -= body.nx * j;
        this.vy -= body.ny * j;
        this.vz -= body.nz * j;
        if (vn > config.CAR_CRASH_SPEED) {
          // head-on hits cost the most, a sideways brush the least
          const directness = clamp(0, 1, vn / (this.speed || 1));
          this.deathPenalty = lerp(
            1,
            5,
            directness,
          );
          this.damaged = true;
        }
      }
    }
    // Resolve each wheel sphere again after integration. This is the hard
    // non-penetration pass: suspension is soft, but the wheel itself never
    // ends a frame on the far side of the cave mesh.
    for (let w = 0; w < 4; w++) {
      const off = config.WHEEL_OFFSETS[w];
      this.#toWorld(off[0], off[1], off[2], this.#anchor);
      this.#anchor.x += this.x;
      this.#anchor.y += this.y;
      this.#anchor.z += this.z;
      cave.nearestRadial(
        this.#anchor.x,
        this.#anchor.y,
        this.#anchor.z,
        this.s,
        this.wheelHit,
      );
      const embed = this.wheelHit.dist + config.CAR_WHEEL_RADIUS;
      if (embed <= 0) continue;
      const nx = this.wheelHit.nx;
      const ny = this.wheelHit.ny;
      const nz = this.wheelHit.nz;
      this.x -= nx * embed;
      this.y -= ny * embed;
      this.z -= nz * embed;
      const vn = this.vx * nx + this.vy * ny + this.vz * nz;
      if (vn > 0) {
        this.vx -= nx * vn * (1 + config.CAR_RESTITUTION) * 0.5;
        this.vy -= ny * vn * (1 + config.CAR_RESTITUTION) * 0.5;
        this.vz -= nz * vn * (1 + config.CAR_RESTITUTION) * 0.5;
      }
    }
    // a car that ends up outside the cave has tunneled: it is dead
    if (body.dist > 50) this.damaged = true;
    // upside down is not a driving position
    if (this.uy < config.UPSIDE_DOWN_LIMIT) this.damaged = true;
  }

  /** Keep the car's visual/physical up direction close to world up. The
   *  wheel springs still supply the actual contact forces, but this bounded
   *  assist prevents one uneven wheel from flipping the simple rigid body and
   *  sending it through the cave. Yaw is preserved. */
  #stabilizeUpright() {
    let fx = this.#fw.x;
    let fz = this.#fw.z;
    const horizontal = Math.hypot(fx, fz);
    if (horizontal < 1e-4) {
      fx = this.#tangent.x;
      fz = this.#tangent.z;
    }
    const length = Math.hypot(fx, fz) || 1;
    fx /= length;
    fz /= length;
    const rx = -fz;
    const rz = fx;
    this.#uprightMatrix.makeBasis(
      new THREE.Vector3(rx, 0, rz),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-fx, 0, -fz),
    );
    this.#uprightQuaternion.setFromRotationMatrix(this.#uprightMatrix);
    this.quat.slerp(this.#uprightQuaternion, config.CAR_UPRIGHT_RESPONSE);
    this.avx *= 0.25;
    this.avz *= 0.25;
  }

  /** wall hits, tunneling and flips set damaged inside #move; this only
   *  reports it. The debt is charged by update() together with the speed */
  #assessDamage() {
    return this.damaged;
  }
}
