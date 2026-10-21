import * as THREE from 'three';
import { type OutputRanges, clampToRange, NeuralNetwork } from '../../../ai/Network';
import { DistillDriver, type Distiller } from '../../../ai/distill';
import { CTRL_COLORS } from '../../../ai/utils';
import { getRandomColor } from '../../../utilities/colors';
import { clamp, lerp } from '../../../utilities/math';
import { ControlType } from '../types';
import type { Cave, RadialHit } from './Cave';
import { config } from './Config';
import { Controls } from './Controls';
import { Sensor } from './Sensor';

/** Inputs appended after the ray history and its class block: normalized
 *  speed, forward and lateral components of the velocity, then grounded. */
const BALL_INPUTS = 4;
/** Feature block: airborne, on-platform, on-coin, platform-ahead,
 *  coin-ahead, column-proximity, column-side, gate-delta, gate-heading,
 *  gate-pitch */
const EXTRA_BRAIN_INPUTS = 10;

export function getCaveBrainDimensions(rayCount = config.SENSORS + 2) {
  // AI controls have no event handlers, so their enumerable fields are the
  // actual output channels consumed by Ball.update().
  const controls = new Controls(ControlType.AI);
  // rayCount current readings + rayCount for the class of each hit, then the
  // ball and feature blocks.
  return {
    inputCount: rayCount * 2 + BALL_INPUTS + EXTRA_BRAIN_INPUTS,
    outputCount: Object.keys(controls).length,
  };
}

/**
 * The range the physics applies to each control, indexed like the brain's
 * outputs: moveX / moveY clamp to [-1, 1], jump is read continuously (a
 * positive value above 0.5 jumps). Distillation trains toward this applied
 * signal, see NeuralNetwork.train.
 */
export const CAVE_OUTPUT_RANGES: OutputRanges = [
  [-1, 1], // moveX
  [-1, 1], // moveY
  [-1, 1], // jump
];

/** squared stall threshold, the per-frame stall check needs no sqrt */
const STALL_SPEED_SQ = config.BALL_STALL_SPEED * config.BALL_STALL_SPEED;
const WALL_CONTACT_SKIN = 0.02;

/**
 * Monkey Ball physics: one sphere that rolls through the sampled cave tube.
 * The stick accelerates it in the horizontal track plane, gravity pulls it
 * down the slopes. Rock and bronze obstacles use the
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
  /** frames since the last contact whose inward normal was within
   *  BALL_JUMP_MAX_SLOPE_COS of straight up; a jump is still granted while
   *  this is inside the grace budget. Starts out-of-budget so a fresh spawn
   *  cannot air-jump before it has touched ground. */
  private lastCollisionFrames = config.BALL_JUMP_GRACE_FRAMES + 1;
  /** inward unit normal of the last contact, used for the visual roll */
  public contactNormal = new THREE.Vector3(0, 1, 0);
  public damaged: boolean;
  /** what retired the ball: a hard hit, a stall, or the section gauge */
  public deathCause: 'none' | 'crash' | 'stall' | 'gauge' = 'none';
  public useAI: boolean;
  public sensor?: Sensor;
  public brain: NeuralNetwork;
  /** the teacher brain driving this ball while its own brain distills, null
   *  for free training; set by the race every frame */
  public teacher: NeuralNetwork | null = null;
  /** the ball belongs to a teacher-driven training run, even when the teacher
   *  is missing (no champion to copy yet): its score stays frozen too */
  public distillRun = false;
  /** the distillation state: teacher-swap reset, decayed step, probes, and
   *  the live error */
  #driver: DistillDriver | null = null;
  /** frames this ball has been distilling, the step decays over them */
  public get teacherFrames(): number {
    return this.#driver?.teacherFrames ?? 0;
  }
  /** the probe data of its training run, built on the first distilled frame */
  public get distiller(): Distiller | null {
    return this.#driver?.distiller ?? null;
  }
  /** per-output applied error of the last live sample, for the network view */
  public get distillErrors(): number[] | null {
    return this.#driver?.distillErrors ?? null;
  }
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
  /** the ball's progress toward the next gate, the brain's gate bearing input */
  public gateDelta = 0;
  /** signed angle from the velocity heading to the ball→gate vector, in
   *  [-1, 1]; 0 means the ball is driving straight at the next gate */
  public gateHeading = 0;
  /** signed elevation of the ball→gate vector off the velocity/tangent plane,
   *  in [-1, 1]; positive means the gate sits above the heading plane */
  public gatePitch = 0;
  /** gameNow() of the crash: the corpse fades from 0.5 to 0 over
   *  DEAD_LIFETIME; the whole brain group respawns when every corpse has expired */
  public deathTime = 0;
  /** frames remaining to advance into another cave section */
  public sectionFramesRemaining = config.SECTION_BUDGET_FRAMES;
  /** race position (1 = leader) of the last frame, written by the racer so a
   *  section pass can pay its position-scaled bonus */
  public racePosition = 1;
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
  /** frames of temporary coin boost remaining: collecting a coin pushes the
   *  ball and lifts its speed cap while this runs; a fresh coin refreshes it */
  private coinBoostFrames = 0;
  /** stacked permanent top-speed bonus from collected coins, 0..cap */
  public permanentBoost = 0;
  /** stable keys of the coins this ball already collected in this run */
  private collectedCoins = new Set<number>();
  /** penalty for the death that just happened, charged with the crash speed */
  private deathPenalty = 0;
  private prevS = 0;
  private brainInputs: number[] = [];
  /** visual rolling angular velocity */
  private avx = 0;
  private avy = 0;
  private avz = 0;
  /** Briefly retain impact spin instead of overwriting it with ground roll. */
  private spinBounceFrames = 0;
  /** Frames before a side impact can charge the score again, so one bounce
   *  does not bill once per collision substep. */
  private hitCooldown = 0;
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
  /** scratch out-param for the next-gate center, reused so scoring never allocates */
  private gatePt: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

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
    this.#driver = new DistillDriver(this.brain, CAVE_OUTPUT_RANGES);
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
    this.hitCooldown = 0;
    this.controls.consumeJump();
    this.contactNormal.set(0, 1, 0);
    this.grounded = false;
    this.lastCollisionFrames = config.BALL_JUMP_GRACE_FRAMES + 1;
    this.a = Math.PI;
    this.damaged = false;
    this.deathCause = 'none';
    this.finished = false;
    this.nextGate = 0;
    this.insideGate = -1;
    this.passedGate = false;
    this.completedGateIndex = -1;
    this.sectionFramesRemaining = config.SECTION_BUDGET_FRAMES;
    this.racePosition = 1;
    this.furthestSection = Math.floor(spawn.s / config.CAVE_SEGMENT_LENGTH);
    this.framesSinceLastGate = 0;
    this.totalRaceFrames = 0;
    this.stallFrames = 0;
    this.deathPenalty = 0;
    this.speed = 0;
    this.coinBoostFrames = 0;
    this.permanentBoost = 0;
    this.collectedCoins.clear();
    this.hit.dist = -config.BALL_RADIUS;
    this.gateHeading = 0;
    this.gatePitch = 0;
  }

  update(cave: Cave) {
    if (this.damaged) return;
    // a teacher-driven run is not the student's own output, so its score is
    // not updated: whatever the frame earns is written back below
    const frozenScore = this.#driver
      ? this.#driver.freezeScore(this.teacher, this.distillRun)
      : null;
    this.controls.update();
    let jumped = false;
    if (this.controls.consumeJump()) {
      // Fire on real contact, or once inside the coyote window since the last
      // jumpable contact. Consuming the window keeps it to a single air jump.
      const coyote = this.lastCollisionFrames <= config.BALL_JUMP_GRACE_FRAMES;
      if (this.grounded || coyote) {
        this.vy = Math.max(0, this.vy) + config.BALL_JUMP_SPEED;
        this.grounded = false;
        this.lastCollisionFrames = config.BALL_JUMP_GRACE_FRAMES + 1;
        jumped = true;
      }
    }
    // An AI brain that asks for a jump it cannot use pays for the wasted
    // press: every frame the jump channel is held without a jump firing
    // drains one gauge point, so a brain cannot mash jump for free.
    if (this.useAI && this.controls.jumpHeld && !jumped)
      this.sectionFramesRemaining -= config.AI_WASTED_JUMP_GAUGE;
    if (this.lastCollisionFrames <= config.BALL_JUMP_GRACE_FRAMES) {
      this.lastCollisionFrames++;
    }
    this.prevS = this.s;
    this.#move(cave);
    if (this.spinBounceFrames > 0) this.spinBounceFrames--;
    if (this.hitCooldown > 0) this.hitCooldown--;
    if (this.coinBoostFrames > 0) this.coinBoostFrames--;
    const coin = cave.coinUnder(this.s, this.a);
    if (coin && !this.collectedCoins.has(coin.key)) {
      this.collectedCoins.add(coin.key);
      this.coinBoostFrames = config.COIN_BOOST_DURATION;
      this.permanentBoost = Math.min(
        config.COIN_PERMANENT_CAP,
        this.permanentBoost + config.COIN_PERMANENT_BONUS,
      );
      if (this.useAI)
        this.brain.score += config.COIN_SCORE + config.COIN_BOOST_REWARD;
    }
    if (this.brain) this.#updateScore(cave);
    // the section gauge drains every frame and is refreshed on progress, so
    // standing still eventually retires the ball
    if (this.sectionFramesRemaining > 0)
      this.sectionFramesRemaining -= config.SECTION_GAUGE_DRAIN;
    this.#updateSectionProgress();

    const crash = this.#assessDamage();
    const stall = !crash && this.#checkStall();
    const gauge = !crash && !stall && this.#checkSectionBudget();
    this.damaged = crash || stall || gauge;
    this.deathCause = crash
      ? 'crash'
      : stall
        ? 'stall'
        : gauge
          ? 'gauge'
          : 'none';
    if (this.damaged && this.brain) {
      this.brain.score -= this.deathPenalty + this.speed;
    }
    if (this.sensor) {
      this.sensor.update(cave);
      if (this.useAI) {
        const inputs = this.brainInputs;
        const readings = this.sensor.readings;
        inputs.length = 0;
        for (let i = 0; i < readings.length; i++) inputs.push(readings[i]);
        // the surface class of each current reading: -1 obstacle, +1 coin,
        // 0 ground or miss. The reading itself gates "nothing hit".
        const kinds = this.sensor.kinds;
        for (let i = 0; i < kinds.length; i++) inputs.push(kinds[i]);
        const invMax = 1 / this.maxSpeed;
        inputs.push(Math.min(1, this.speed * invMax));
        inputs.push(
          clamp(
            (this.vx * this.fx + this.vy * this.fy + this.vz * this.fz) *
              invMax,
            -1,
            1,
          ),
        );
        inputs.push(
          clamp(
            (this.vx * this.rx + this.vy * this.ry + this.vz * this.rz) *
              invMax,
            -1,
            1,
          ),
        );
        inputs.push(this.grounded ? 1 : 0);
        // Feature block: what the rays cannot say - the surface under the
        // ball, what sits ahead on the line, and the ball's own motion.
        const surfaceA = this.a;
        const cellIndex = Math.floor(this.s / config.CAVE_FEATURE_CELL);
        const reach = config.CAVE_FEATURE_CELL * 1.5;
        let platformAhead = 0;
        let coinAhead = 0;
        let columnProximity = 0;
        let columnSide = 0;
        for (let i = cellIndex; i <= cellIndex + 2; i++) {
          const cell = cave.featureCell(i);
          if (cell.ramp) {
            const d = (cell.ramp.centerS - cell.ramp.halfLen - this.s) / reach;
            if (d >= 0)
              platformAhead = Math.max(platformAhead, 1 - Math.min(1, d));
          }
          for (const coin of cell.coins) {
            const d = (coin.centerS - coin.halfLen - this.s) / reach;
            if (d >= 0) coinAhead = Math.max(coinAhead, 1 - Math.min(1, d));
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
              columnSide = clamp(offset * 4, -1, 1);
            }
          }
        }
        inputs.push(this.grounded ? 0 : 1);
        inputs.push(clamp(cave.platformAt(this.s, surfaceA), 0, 1));
        inputs.push(clamp(cave.coinAt(this.s, surfaceA), 0, 1));
        inputs.push(platformAhead);
        inputs.push(coinAhead);
        inputs.push(columnProximity);
        inputs.push(columnSide);
        inputs.push(this.gateDelta);
        inputs.push(this.gateHeading);
        inputs.push(this.gatePitch);
        // distillation: the teacher drives the ball, the own brain
        // backpropagates toward the teacher's applied output on the same
        // inputs; without a teacher the student drives itself
        const outputs = this.#driver
          ? this.#driver.frame(this.teacher, this.distillRun, inputs)
          : this.brain.process(inputs);
        const [moveX, moveY, jump] = outputs;
        this.controls.moveX = clampToRange(moveX, CAVE_OUTPUT_RANGES[0]);
        this.controls.moveY = clampToRange(moveY, CAVE_OUTPUT_RANGES[1]);
        this.controls.writeJump(jump);
      }
    }
    if (frozenScore !== null) this.brain.score = frozenScore;
  }

  /** Forward progress into a new cave section is enough to reset the
   *  liveness budget. Reaching a scoring gate is not required: rings are
   *  sparse and can be missed while the ball is still rolling the cave. */
  #updateSectionProgress() {
    const section = Math.floor(this.s / config.CAVE_SEGMENT_LENGTH);
    if (section > this.furthestSection) {
      this.furthestSection = section;
      this.sectionFramesRemaining = config.SECTION_BUDGET_FRAMES;
      // A section pays its flat reward scaled by race position: the leader
      // banks SECTION_SCORE, 2nd half that, and so on. Forward progress is
      // scored even if the decorative gate ring itself is missed.
      if (!this.finished)
        this.brain.score +=
          config.SECTION_SCORE / Math.max(1, this.racePosition);
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
      const gp = cave.centerAt(cave.gatePositions[this.nextGate], this.gatePt);
      const dx = gp.x - this.x;
      const dy = gp.y - this.y;
      const dz = gp.z - this.z;
      // signed angle from the forward to the gate, around the ball's up axis
      const crossX = this.fy * dz - this.fz * dy;
      const crossY = this.fz * dx - this.fx * dz;
      const crossZ = this.fx * dy - this.fy * dx;
      const dot = this.fx * dx + this.fy * dy + this.fz * dz;
      const around = crossX * this.ux + crossY * this.uy + crossZ * this.uz;
      this.gateDelta = clamp(Math.atan2(around, dot) / Math.PI, -1, 1);
      // The same bearing, measured from where the ball is actually heading:
      // the velocity direction while it moves, the cave tangent while not.
      // Yaw is the turn to line up with the gate, pitch the climb to it, so
      // together they give the full 3D heading error to the next gate.
      const dist = Math.hypot(dx, dy, dz) || 1;
      let hx = this.vx;
      let hy = this.vy;
      let hz = this.vz;
      const speed = Math.hypot(hx, hy, hz);
      if (speed < config.SENSOR_MIN_AXIS_SPEED) {
        hx = this.fx;
        hy = this.fy;
        hz = this.fz;
      } else {
        hx /= speed;
        hy /= speed;
        hz /= speed;
      }
      // right = heading x up, normalized so a near-vertical heading stays sane
      let rxv = hy * this.uz - hz * this.uy;
      let ryv = hz * this.ux - hx * this.uz;
      let rzv = hx * this.uy - hy * this.ux;
      const rlen = Math.hypot(rxv, ryv, rzv) || 1;
      rxv /= rlen;
      ryv /= rlen;
      rzv /= rlen;
      const dirX = dx / dist;
      const dirY = dy / dist;
      const dirZ = dz / dist;
      this.gateHeading = clamp(
        Math.atan2(
          dirX * rxv + dirY * ryv + dirZ * rzv,
          dirX * hx + dirY * hy + dirZ * hz,
        ) / Math.PI,
        -1,
        1,
      );
      this.gatePitch = clamp(
        Math.asin(
          clamp(dirX * this.ux + dirY * this.uy + dirZ * this.uz, -1, 1),
        ) /
          (Math.PI / 2),
        -1,
        1,
      );
    } else {
      this.gateDelta = 0;
      this.gateHeading = 0;
      this.gatePitch = 0;
    }
  }

  /** the speed cap right now: collected coins raise it permanently up to
   *  COIN_PERMANENT_CAP, and a fresh coin lifts it further for a while */
  effectiveMaxSpeed(): number {
    const permanent = 1 + this.permanentBoost;
    const temp = this.coinBoostFrames > 0 ? 1 + config.COIN_SPEED_BONUS : 1;
    return this.maxSpeed * permanent * temp;
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

  /** Keep each integration step shorter than half a radius, including falls. */
  #move(cave: Cave) {
    // Bound the substep from the real integration velocity. A bounce or a
    // slope launch can exceed effectiveMaxSpeed(), so clamping the horizontal
    // component here would under-substep exactly when the ball is fastest.
    const substeps = Math.max(
      config.PHYSICS_SUBSTEPS,
      Math.ceil(
        Math.hypot(
          Math.hypot(this.vx, this.vz),
          Math.abs(this.vy) + config.BALL_GRAVITY,
        ) /
          (this.radius * 0.5),
      ),
    );
    const dt = 1 / substeps;
    // normalized stick vector: diagonals are not faster than axes
    let sx = clamp(this.controls.moveX, -1, 1);
    let sy = clamp(this.controls.moveY, -1, 1);
    const stick = Math.hypot(sx, sy);
    if (stick > 1) {
      sx /= stick;
      sy /= stick;
    }
    for (let step = 0; step < substeps; step++) {
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
      // a fresh coin pushes along the cave tangent up to the lifted cap
      if (this.coinBoostFrames > 0) {
        const alongSpeed =
          this.vx * this.cx + this.vy * this.cy + this.vz * this.cz;
        if (alongSpeed < this.effectiveMaxSpeed()) {
          this.vx += this.cx * config.COIN_BOOST_ACCEL * dt;
          this.vy += this.cy * config.COIN_BOOST_ACCEL * dt;
          this.vz += this.cz * config.COIN_BOOST_ACCEL * dt;
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
      // Resolve against the same triangles that draw the rock and slabs.
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.z += this.vz * dt;
      this.s = Math.max(
        0,
        this.s +
          dt * (this.vx * this.cx + this.vy * this.cy + this.vz * this.cz),
      );
      this.grounded = false;
      const reach = this.radius + WALL_CONTACT_SKIN;
      // Curved slabs meeting a bank can require several alternating pushes
      // before both contacts are clear. Ordinary contacts still exit early.
      for (let pass = 0; pass < 64; pass++) {
        this.#resolveRock(cave);
        const contact = cave.wallContact(this.x, this.y, this.z, reach, this.s);
        // No slab push needed. #resolveRock already placed the ball flush on
        // the exact mesh, so a second confirm scan is redundant.
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
          if (ny >= config.BALL_JUMP_MAX_SLOPE_COS)
            this.lastCollisionFrames = 0;
        }
      }
      // Progress is a query hint, never an independent collision position.
      // Only the axis coordinate is needed, so skip the exact-mesh query.
      cave.locate(this.x, this.y, this.z, this.s, this.hit);
      this.s = this.hit.s;
      this.a = this.hit.a;
      // slippery ground, mild air drag
      const drag =
        (this.grounded ? config.BALL_ROLL_DRAG : config.BALL_AIR_DRAG) ** dt;
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
        const spin = config.BALL_SPIN_DAMP ** dt;
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

  /** Resolve rock again after slab pushes, so neither contact embeds the ball. */
  #resolveRock(cave: Cave) {
    cave.nearestRadial(this.x, this.y, this.z, this.s, this.hit);
    this.s = this.hit.s;
    this.a = this.hit.a;
    const penetration = this.radius + this.hit.dist;
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
      if (ny >= config.BALL_JUMP_MAX_SLOPE_COS) this.lastCollisionFrames = 0;
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
          this.deathPenalty = lerp(1, 5, clamp(-vn / (this.speed || 1), 0, 1));
          this.damaged = true;
        }
      }
    }
    return penetration > 1e-6;
  }

  /** A hard side impact reverses the spin and retains half its angular speed,
   *  costs a point and drains part of the section gauge: the ball bounced back
   *  off an obstacle instead of clearing it. Floor and slab tops are excluded,
   *  only side contacts land here. */
  #bounceSpin() {
    this.avx *= -0.5;
    this.avy *= -0.5;
    this.avz *= -0.5;
    this.spinBounceFrames = 8;
    if (this.hitCooldown <= 0) {
      this.hitCooldown = config.BALL_HIT_COOLDOWN_FRAMES;
      this.brain.score -= config.OBSTACLE_HIT_SCORE;
      this.sectionFramesRemaining = Math.max(
        0,
        this.sectionFramesRemaining -
          config.SECTION_BUDGET_FRAMES * config.OBSTACLE_GAUGE_PENALTY,
      );
    }
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
