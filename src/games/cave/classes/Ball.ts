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

/** Inputs appended after the ray history: normalized speed, forward and
 *  lateral components of the velocity, then grounded. */
const BALL_INPUTS = 4;
/** Feature block: airborne, on-platform, on-boost, platform-ahead,
 *  boost-ahead, column-proximity, column-side, gate-delta */
const EXTRA_BRAIN_INPUTS = 8;

export function getCaveBrainDimensions(rayCount = config.SENSORS + 2) {
  // AI controls have no event handlers, so their enumerable fields are the
  // actual output channels consumed by Ball.update().
  const controls = new Controls(ControlType.AI);
  return {
    inputCount: rayCount * 2 + BALL_INPUTS + EXTRA_BRAIN_INPUTS,
    outputCount: Object.keys(controls).length,
  };
}

/** squared stall threshold, the per-frame stall check needs no sqrt */
const STALL_SPEED_SQ = config.BALL_STALL_SPEED * config.BALL_STALL_SPEED;
const WALL_CONTACT_SKIN = 0.02;

/**
 * Monkey Ball physics: one sphere that rolls through the analytic cave tube.
 * The stick accelerates it in the horizontal track plane, gravity pulls it
 * down the slopes. Rock uses the analytic tube; bronze obstacles use the
 * same triangles as their meshes. Orientation is purely visual: the ball
 * spins so it reads as rolling, but the simulation is a point with radius.
 */
export class Ball {
  public x: number;
  public y: number;
  public z: number;
  public vx: number;
  public vy: number;
  public vz: number;
  /** visual rolling orientation */
  public quat: THREE.Quaternion;
  /** arc position along the cave axis, the ball's progress */
  public s: number;
  /** body frame in world space, refreshed every frame from the cave frame:
   *  forward is the tangent, up the tube normal (world-up anchored), right
   *  the binormal. The sensor fan lives in this plane. */
  public fx = 0;
  public fy = 0;
  public fz = 1;
  public rx = 1;
  public ry = 0;
  public rz = 0;
  public ux = 0;
  public uy = 1;
  public uz = 0;
  /** cave tangent at the ball's arc position, the hint for the ray marches */
  public cx = 0;
  public cy = 0;
  public cz = -1;
  /** current speed magnitude, refreshed every frame */
  public speed = 0;
  /** radius of the ball, collision and camera framing read it */
  public radius = config.BALL_RADIUS;
  /** angle around the tube under the ball, refreshed by the collision query */
  public a = Math.PI;
  /** true while a wall is in contact, the brain reads it as an input */
  public grounded = false;
  /** inward unit normal of the last contact, used for the visual roll */
  public contactNormal = new THREE.Vector3(0, 1, 0);
  public damaged: boolean;
  public useAI: boolean;
  public sensor?: Sensor;
  public brain: NeuralNetwork;
  public controls: Controls;
  /** render accent, and the brain category it belongs to */
  public color: string;
  public label: string;
  public brainLayers: number;
  public maxSpeed: number;
  /** index of the next gate to claim, the gates go forward in order */
  public nextGate = 0;
  /** set for one frame when the ball claims a gate in order */
  public passedGate = false;
  /** gate event consumed by CaveRace to build split deltas */
  public completedGateIndex = -1;
  public completedGateFrames = 0;
  /** most recently completed gate split and its current-cave delta */
  public lastGateIndex = -1;
  public lastGateFrames = 0;
  public lastGateDelta: number | null = null;
  /** gate the ball is currently inside, -1 in none, charges out-of-order entries */
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
  /** furthest cave section reached; unlike gates, sections keep the ball alive
   *  while it makes forward progress even if it misses a ring */
  private furthestSection = 0;
  /** simulation frames since the last gate was claimed */
  public framesSinceLastGate = 0;
  /** simulation frames spent on this cave run */
  public totalRaceFrames = 0;
  /** final total and delta when this ball claims the last gate */
  public lastFinishFrames = 0;
  public lastFinishDelta: number | null = null;
  /** finished balls keep their finishing brain fixed until the next spawn */
  public finished = false;

  private stallFrames = 0;
  /** frames of boost remaining: collecting a boost item pushes the ball and
   *  lifts its speed cap while this runs; items refresh it */
  private boostFrames = 0;
  /** penalty for the death that just happened, charged with the crash speed */
  private deathPenalty = 0;
  private prevS = 0;
  private brainInputs: number[] = [];
  /** previous frame's ray values, the one-frame sensor history block */
  private prevSensorInputs: number[] = [];
  /** set after the first AI decision, until then the history is flat */
  private hasPrevSensors = false;
  /** visual rolling angular velocity */
  private avx = 0;
  private avy = 0;
  private avz = 0;
  /** Briefly retain impact spin instead of overwriting it with ground roll. */
  private spinBounceFrames = 0;
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
  private frameT: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private frameN: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private frameB: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

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
    maxSpeed = config.BALL_MAX_SPEED,
    label = '',
    color = 'white',
    brainLayers = 1,
    /** lets the caller swap in another kind of brain, like a mixed brain */
    public brainBuilder?: (
      inputCount: number,
      outputCount: number,
    ) => NeuralNetwork,
    /** lateral offset in cave radii so a pack of balls never spawns on one spot */
    public laneOffset = 0,
    public cave?: Cave,
  ) {
    this.color =
      !color || color === 'white'
        ? CTRL_COLORS[brainLayers] || getRandomColor()
        : color;
    this.label = label;
    this.brainLayers = brainLayers;
    this.maxSpeed = maxSpeed;
    this.x = spawn.x;
    this.y = spawn.y;
    this.z = spawn.z;
    this.s = spawn.s;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.damaged = false;
    this.sectionFramesRemaining = config.SECTION_BUDGET_FRAMES;
    this.furthestSection = Math.floor(spawn.s / config.CAVE_SEGMENT_LENGTH);
    this.stallFrames = 0;

    this.quat = new THREE.Quaternion();

    // a lateral offset slides the ball along the cave frame at the spawn arc
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

  /** Return a crashed ball to a fresh spawn while preserving its controls and
   *  brain. */
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
    this.quat.identity();
    this.avx = 0;
    this.avy = 0;
    this.avz = 0;
    this.spinBounceFrames = 0;
    this.controls.consumeJump();
    this.contactNormal.set(0, 1, 0);
    this.grounded = false;
    this.a = Math.PI;
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
    this.boostFrames = 0;
    this.hit.dist = -config.BALL_RADIUS;
    this.hasPrevSensors = false;
    this.prevSensorInputs.fill(0);
  }

  update(cave: Cave) {
    if (this.damaged) return;
    this.controls.update();
    if (this.controls.consumeJump() && this.grounded) {
      this.vy = Math.max(0, this.vy) + config.BALL_JUMP_SPEED;
      this.grounded = false;
    }
    this.prevS = this.s;
    this.#move(cave);
    if (this.spinBounceFrames > 0) this.spinBounceFrames--;
    if (this.boostFrames > 0) this.boostFrames--;
    if (cave.boostAt(this.s, this.a) > 0.2) {
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
        const invMax = 1 / this.maxSpeed;
        inputs.push(Math.min(1, this.speed * invMax));
        inputs.push(
          clamp(
            -1,
            1,
            (this.vx * this.fx + this.vy * this.fy + this.vz * this.fz) *
              invMax,
          ),
        );
        inputs.push(
          clamp(
            -1,
            1,
            (this.vx * this.rx + this.vy * this.ry + this.vz * this.rz) *
              invMax,
          ),
        );
        inputs.push(this.grounded ? 1 : 0);
        // Feature block: what the rays cannot say - the surface under the
        // ball, what sits ahead on the line, and the ball's own motion.
        const surfaceA = this.a;
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
            const d =
              (cell.boost.centerS - cell.boost.halfLen - this.s) / reach;
            if (d >= 0) boostAhead = Math.max(boostAhead, 1 - Math.min(1, d));
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
        inputs.push(this.grounded ? 0 : 1);
        inputs.push(clamp(0, 1, cave.platformAt(this.s, surfaceA)));
        inputs.push(clamp(0, 1, cave.boostAt(this.s, surfaceA)));
        inputs.push(platformAhead);
        inputs.push(boostAhead);
        inputs.push(columnProximity);
        inputs.push(columnSide);
        inputs.push(this.gateDelta);
        // refresh the history after the brain has read it
        for (let i = 0; i < prev.length; i++) prev[i] = inputs[i];
        const outputs = this.brain.process(inputs);
        const [moveX, moveY] = outputs;
        this.controls.moveX = clamp(-1, 1, moveX);
        this.controls.moveY = clamp(-1, 1, moveY);
      }
    }
  }

  /** Forward progress into a new cave section is enough to reset the
   *  liveness budget. Reaching a scoring gate is not required: rings are
   *  sparse and can be missed while the ball is still rolling the cave. */
  #updateSectionProgress() {
    const section = Math.floor(this.s / config.CAVE_SEGMENT_LENGTH);
    if (section > this.furthestSection) {
      this.furthestSection = section;
      this.sectionFramesRemaining = config.SECTION_BUDGET_FRAMES;
    }
  }

  /** a ball that makes no section progress for the frame budget dies, exactly
   *  like a collision */
  #checkSectionBudget() {
    return this.sectionFramesRemaining <= 0;
  }

  /** a ball under BALL_STALL_SPEED for SECTION_BUDGET_FRAMES consecutive
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

    // the gate cell the ball sits in: -1 before the first gate, capped at the
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
        // Gates still award score, but do not control ball lifetime. The
        // section-progress budget is reset only by actual forward progress.
        if (isFinish) {
          // completing the cave is the biggest reward in the game
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
      // signed angle from the forward to the gate, around the ball's up axis
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

  /** refresh the cave frame at the ball's arc position: tangent as forward,
   *  tube normal as up, binormal as right */
  #refreshFrame(cave: Cave) {
    cave.frame(this.s, this.frameT, this.frameN, this.frameB);
    this.cx = this.fx = this.frameT.x;
    this.cy = this.fy = this.frameT.y;
    this.cz = this.fz = this.frameT.z;
    this.ux = this.frameN.x;
    this.uy = this.frameN.y;
    this.uz = this.frameN.z;
    this.rx = this.frameB.x;
    this.ry = this.frameB.y;
    this.rz = this.frameB.z;
  }

  /** one physics frame, substepped and resolved against the analytic tube */
  #move(cave: Cave) {
    const dt = 1 / config.PHYSICS_SUBSTEPS;
    // normalized stick vector: diagonals are not faster than axes
    let sx = clamp(-1, 1, this.controls.moveX);
    let sy = clamp(-1, 1, this.controls.moveY);
    const stick = Math.hypot(sx, sy);
    if (stick > 1) {
      sx /= stick;
      sy /= stick;
    }
    for (let step = 0; step < config.PHYSICS_SUBSTEPS; step++) {
      this.#refreshFrame(cave);
      // Only terrain, gravity and momentum can launch the ball. There is no
      // airtime timer or scripted jump impulse.
      // control basis: the horizontal part of the cave tangent and its right.
      // Near a vertical tangent, fall back to the current velocity direction.
      let cfx = this.cx;
      let cfz = this.cz;
      let cl = Math.hypot(cfx, cfz);
      if (cl < 0.2) {
        cfx = this.vx;
        cfz = this.vz;
        cl = Math.hypot(cfx, cfz);
      }
      if (cl < 1e-4) {
        cfx = 0;
        cfz = -1;
        cl = 1;
      }
      cfx /= cl;
      cfz /= cl;
      // right = forward x worldUp
      const crx = -cfz;
      const crz = cfx;
      // gravity
      this.vy -= config.BALL_GRAVITY * dt;
      // stick-directed acceleration
      this.vx += (cfx * sy + crx * sx) * config.BALL_ACCEL * dt;
      this.vz += (cfz * sy + crz * sx) * config.BALL_ACCEL * dt;
      // a boost item pushes along the cave tangent up to the lifted cap
      if (this.boostFrames > 0) {
        const alongSpeed =
          this.vx * this.cx + this.vy * this.cy + this.vz * this.cz;
        if (alongSpeed < this.effectiveMaxSpeed()) {
          this.vx += this.cx * config.BOOST_ACCEL * dt;
          this.vy += this.cy * config.BOOST_ACCEL * dt;
          this.vz += this.cz * config.BOOST_ACCEL * dt;
        }
      }
      // speed cap: the stick drives horizontally, so cap horizontal speed
      // only; gravity and terrain own vertical motion
      const cap = this.effectiveMaxSpeed();
      const horizontal = Math.hypot(this.vx, this.vz);
      if (horizontal > cap) {
        const scale = cap / horizontal;
        this.vx *= scale;
        this.vz *= scale;
      }
      // Integrate in substeps shorter than a sphere diameter, then resolve
      // contact against the same triangles that draw each bronze obstacle.
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.z += this.vz * dt;
      this.s = Math.max(
        0,
        this.s +
          dt * (this.vx * this.cx + this.vy * this.cy + this.vz * this.cz),
      );
      // Resolve rock contact before the separate bronze solids.
      cave.nearestRadial(this.x, this.y, this.z, this.s, this.hit);
      this.s = this.hit.s;
      this.a = this.hit.a;
      const penetration = this.radius + this.hit.dist;
      this.grounded = false;
      if (penetration > 0) {
        // inward normal points away from the wall, back into the tube
        const nx = -this.hit.nx;
        const ny = -this.hit.ny;
        const nz = -this.hit.nz;
        this.x += nx * penetration;
        this.y += ny * penetration;
        this.z += nz * penetration;
        this.grounded = true;
        this.contactNormal.set(nx, ny, nz);
        const vn = this.vx * nx + this.vy * ny + this.vz * nz;
        if (vn < 0) {
          // slow contacts settle, hard ones bounce
          const bounce =
            -vn > config.BALL_BOUNCE_SPEED ? config.BALL_RESTITUTION : 0;
          const impulse = vn * (1 + bounce);
          this.vx -= nx * impulse;
          this.vy -= ny * impulse;
          this.vz -= nz * impulse;
          if (bounce > 0) {
            if (ny < 0.5) this.#bounceSpin();
            // a real hit scrubs some tangential speed
            const vn2 = this.vx * nx + this.vy * ny + this.vz * nz;
            const tx = this.vx - nx * vn2;
            const ty = this.vy - ny * vn2;
            const tz = this.vz - nz * vn2;
            const keep = config.BALL_WALL_SCRUB;
            this.vx = nx * vn2 + tx * keep;
            this.vy = ny * vn2 + ty * keep;
            this.vz = nz * vn2 + tz * keep;
          }
          if (-vn > config.BALL_CRASH_SPEED) {
            this.deathPenalty = lerp(
              1,
              5,
              clamp(0, 1, -vn / (this.speed || 1)),
            );
            this.damaged = true;
          }
        }
      }
      const reach = this.radius + WALL_CONTACT_SKIN;
      for (let pass = 0; pass < 6; pass++) {
        const contact = cave.wallContact(this.x, this.y, this.z, reach, this.s);
        if (!contact || reach - contact.dist < 1e-6) break;
        const { nx, ny, nz } = contact;
        const penetration = reach - contact.dist;
        this.x += nx * penetration;
        this.y += ny * penetration;
        this.z += nz * penetration;
        const vn = this.vx * nx + this.vy * ny + this.vz * nz;
        if (vn < 0) {
          const bounce =
            -vn > config.BALL_BOUNCE_SPEED ? config.BALL_RESTITUTION : 0;
          this.vx -= nx * vn * (1 + bounce);
          this.vy -= ny * vn * (1 + bounce);
          this.vz -= nz * vn * (1 + bounce);
          if (bounce > 0 && ny < 0.5) this.#bounceSpin();
          if (-vn > config.BALL_CRASH_SPEED) this.damaged = true;
        }
        if (ny > 0.35) {
          this.grounded = true;
          this.contactNormal.set(nx, ny, nz);
        }
      }
      // Progress is a query hint, never an independent collision position.
      cave.nearestRadial(this.x, this.y, this.z, this.s, this.hit);
      this.s = this.hit.s;
      this.a = this.hit.a;
      // slippery ground, mild air drag
      const drag = Math.pow(
        this.grounded ? config.BALL_ROLL_DRAG : config.BALL_AIR_DRAG,
        dt,
      );
      this.vx *= drag;
      this.vy *= drag;
      this.vz *= drag;
      // visual roll: for a sphere rolling on a surface, omega = (n x v) / r
      if (this.grounded && this.spinBounceFrames === 0) {
        const n = this.contactNormal;
        this.avx = (n.y * this.vz - n.z * this.vy) / this.radius;
        this.avy = (n.z * this.vx - n.x * this.vz) / this.radius;
        this.avz = (n.x * this.vy - n.y * this.vx) / this.radius;
      } else if (!this.grounded) {
        const spin = Math.pow(config.BALL_SPIN_DAMP, dt);
        this.avx *= spin;
        this.avy *= spin;
        this.avz *= spin;
      }
      this.#integrateSpin(0.5 * dt);
      if (this.damaged) break;
    }
    this.#refreshFrame(cave);
    this.speed = Math.hypot(this.vx, this.vy, this.vz);
  }

  /** A wall impact reverses the spin and retains half its angular speed. */
  #bounceSpin() {
    this.avx *= -0.5;
    this.avy *= -0.5;
    this.avz *= -0.5;
    this.spinBounceFrames = 8;
  }

  /** integrate the visual quaternion by the current angular velocity */
  #integrateSpin(halfDt: number) {
    const { x: qx, y: qy, z: qz, w: qw } = this.quat;
    this.quat.x += halfDt * (this.avx * qw + this.avy * qz - this.avz * qy);
    this.quat.y += halfDt * (this.avy * qw + this.avz * qx - this.avx * qz);
    this.quat.z += halfDt * (this.avz * qw + this.avx * qy - this.avy * qx);
    this.quat.w -= halfDt * (this.avx * qx + this.avy * qy + this.avz * qz);
    this.quat.normalize();
  }

  /** hard impacts set damaged inside #move; this only reports it. The debt is
   *  charged by update() together with the speed */
  #assessDamage() {
    return this.damaged;
  }
}
