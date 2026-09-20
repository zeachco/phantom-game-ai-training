import { Controls } from './Controls';
import { NeuralNetwork } from '../../../ai/Network';
import { Sensor } from './Sensor';
import { ControlType } from '../types';
import carImg from '../assets/car.png';
import { AABB, lerp, polysIntersect, Vector } from '../../../utilities/math';
import { getRandomColor } from '../../../utilities/colors';
import { config } from './Config';
import { Circuit } from './Circuit';
import { Obstacle } from './Obstacle';

/** the gate line shades by misalignment, quantized so no string is built per frame */
const GATE_COLORS = new Array(21).fill(0).map((_s, i) => {
  const v = Math.round(255 * (1 - i / 20));
  return `rgb(255, ${v}, ${v})`;
});

/** Inputs appended after the sensor rays: speed, velocity delta, gate delta. */
const EXTRA_BRAIN_INPUTS = 3;

/** The dimensions used by both regular and mixed circuit brains. */
export function getCircuitBrainDimensions(rayCount = config.SENSORS) {
  // AI controls have no event handlers, so their enumerable fields are the
  // actual output channels consumed by Car.update().
  const controls = new Controls(ControlType.AI);
  return {
    inputCount: rayCount + EXTRA_BRAIN_INPUTS,
    outputCount: Object.keys(controls).length,
  };
}

export class Car {
  public speed: number;
  public vx: number;
  public vy: number;
  public drifting: boolean;
  public acceleration: number;
  public friction: number;
  public damaged: boolean;
  public useAI: boolean;
  public sensor?: Sensor;
  public brain: NeuralNetwork;
  public controls: Controls;
  /** corners are reused every frame, only their coordinates move */
  public polygon: Vector[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  /** bounding box of the polygon, refreshed with it */
  public aabb: AABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  public width = 30;
  public height = 50;
  /** index of the next checkpoint to claim, the gates go around in order */
  public nextCheckpoint = 0;
  /** set for one frame when the car claims the last gate and wraps to the start */
  public completedLap = false;
  /** full laps on the current map, the map advances at LAPS_PER_SEED */
  public laps = 0;
  /** completed cars keep their finishing brain fixed until the next spawn */
  public finished = false;
  /** set for one frame when the car claims an in-order checkpoint */
  public passedCheckpoint = false;
  /** gate the car is currently inside, -1 in none, charges out-of-order entries */
  public insideGate = -1;
  /** position of the next gate and the signed delta, refreshed for the viz */
  public gateX = 0;
  public gateY = 0;
  public gateDelta = 0;
  /** performance.now() of the crash: the corpse fades over DEAD_LIFETIME and
   *  the car's slot respawns once the corpse expires */
  public deathTime = 0;
  /** performance.now() of the last claimed gate: the next gate has to be
   *  reached within CHECKPOINT_TIMEOUT of it, or the car dies like a crash */
  public checkpointSince = 0;
  /** simulation frames since the last checkpoint was claimed */
  public framesSinceLastCheckpoint = 0;
  /** performance.now() when the current lap started, zero while moving */
  public lapStartedAt = 0;
  /** performance.now() when the last completed lap finished */
  public completedLapAt = 0;
  /** performance.now() when the current stall began, 0 while moving */
  private stallSince = 0;
  private img: HTMLImageElement;
  private mask: HTMLCanvasElement;
  /** color the mask currently holds, it is only repainted when that moves */
  private maskColor = '';
  private va = 0;
  /** half diagonal and corner angle, both derived from the fixed size */
  private rad = Math.hypot(this.width, this.height) / 2;
  private alpha = Math.atan2(this.width, this.height);

  constructor(
    public x = 0,
    public y = 0,
    public angle = 0,
    controlType = ControlType.DUMMY,
    public maxSpeed = config.CAR_MAX_SPEED,
    public label = '',
    public color = getRandomColor(),
    public brainLayers = 1,
    /** lets the caller swap in another kind of brain, like a mixed brain */
    public brainBuilder?: (
      inputCount: number,
      outputCount: number,
    ) => NeuralNetwork,
  ) {
    this.x = x;
    this.y = y;

    this.speed = 0;
    this.vx = 0;
    this.vy = 0;
    this.drifting = false;
    this.acceleration = config.CAR_ACCELERATION;
    this.maxSpeed = maxSpeed;
    this.friction = config.CAR_FRICTION;
    this.angle = angle;
    this.damaged = false;
    this.checkpointSince = performance.now();
    this.lapStartedAt = performance.now();

    this.useAI = controlType == ControlType.AI;

    this.controls = new Controls(controlType);

    if (controlType !== ControlType.DUMMY) {
      this.sensor = new Sensor(this);
      const { inputCount, outputCount } = getCircuitBrainDimensions(
        this.sensor.rayCount,
      );
      this.brain = brainBuilder
        ? brainBuilder(inputCount, outputCount)
        : new NeuralNetwork(inputCount, outputCount, brainLayers);
    }

    this.img = new Image();
    this.img.src = carImg;

    this.mask = document.createElement('canvas');
    this.mask.width = this.width;
    this.mask.height = this.height;

    this.img.onload = () => this.#paintMask();
  }

  /** the accent can move at runtime, a mixed brain blends the brains it uses */
  setColor(color: string) {
    if (color === this.color) return;
    this.color = color;
    this.#paintMask();
  }

  #paintMask() {
    if (!this.img.complete || this.maskColor === this.color) return;
    this.maskColor = this.color;

    const maskCtx = this.mask.getContext('2d')!;
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.clearRect(0, 0, this.width, this.height);
    maskCtx.fillStyle = this.color;
    maskCtx.fillRect(0, 0, this.width, this.height);

    maskCtx.globalCompositeOperation = 'destination-atop';
    maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
  }

  update(obstacles: Obstacle[], circuit: Circuit) {
    if (this.damaged) return;
    this.#move();
    if (this.brain) this.#updateScore(circuit);

    this.#createPolygon();
    this.damaged =
      this.#assessDamage(obstacles, circuit) ||
      this.#checkStall() ||
      this.#checkGateTimeout();
    if (this.sensor) {
      this.sensor.update(obstacles, circuit.segments);
      if (this.useAI) {
        const offsets = this.sensor.readings.map((s) =>
          s == null ? 0 : 1 - s.offset,
        );
        offsets.push(Math.min(1, Math.hypot(this.vx, this.vy) / this.maxSpeed));
        offsets.push(this.#velocityDelta());
        offsets.push(this.gateDelta);
        const outputs = this.brain.process(offsets);
        const [throttle, left, right] = outputs;
        // one signed float: gas positive, brake / reverse negative
        this.controls.throttle = Math.max(-1, Math.min(1, throttle));
        this.controls.left = left;
        this.controls.right = right;
      }
    }
  }

  /** the gates in order carry the score; a gate touched out of order is a
   *  debt charged once per entry */
  /** a car under CAR_STALL_SPEED for CAR_STALL_TIMEOUT in a row has stalled */
  /** a car that misses its next gate for CHECKPOINT_TIMEOUT dies, exactly
   *  like a collision */
  #checkGateTimeout() {
    return performance.now() - this.checkpointSince > config.CHECKPOINT_TIMEOUT;
  }

  #checkStall() {
    const now = performance.now();
    if (Math.hypot(this.vx, this.vy) < config.CAR_STALL_SPEED) {
      if (this.stallSince === 0) {
        this.stallSince = now;
        return false;
      }
      if (now - this.stallSince > config.CAR_STALL_TIMEOUT) return true;
      return false;
    }
    this.stallSince = 0;
    return false;
  }

  #updateScore(circuit: Circuit) {
    if (this.finished) return;
    this.framesSinceLastCheckpoint++;
    const checkpoints = circuit.checkpoints;
    const n = checkpoints.length;
    const r2 = config.CHECKPOINT_CLAIM_RADIUS ** 2;

    let gate = -1;
    for (let i = 0; i < n; i++) {
      const c = checkpoints[i];
      const dx = c.x - this.x;
      const dy = c.y - this.y;
      if (dx * dx + dy * dy < r2) {
        gate = i;
        break;
      }
    }

    if (gate !== -1) {
      if (gate === this.nextCheckpoint) {
        this.brain.score +=
          config.CHECKPOINT_SCORE / this.framesSinceLastCheckpoint;
        this.framesSinceLastCheckpoint = 0;
        this.passedCheckpoint = true;
        this.checkpointSince = performance.now();
        // claiming the last gate wraps the index back to the start: a full lap
        if (this.nextCheckpoint === n - 1) {
          this.completedLap = true;
          this.laps++;
          this.completedLapAt = performance.now();
          this.lapStartedAt = this.completedLapAt;
          if (this.laps >= config.LAPS_PER_SEED) this.finished = true;
        }
        this.nextCheckpoint = (this.nextCheckpoint + 1) % n;
      } else if (gate !== this.insideGate) {
        this.brain.score -= config.WRONG_CHECKPOINT_PENALTY;
      }
      this.insideGate = gate;
    } else {
      this.insideGate = -1;
    }

    // the viz line reads these, the brain reads the same delta as an input
    const next = checkpoints[this.nextCheckpoint];
    this.gateX = next.x;
    this.gateY = next.y;
    this.gateDelta = this.#gateDelta(circuit);
  }

  /** signed angle between the velocity vector and the front, in [-1, 1] */
  #velocityDelta() {
    const velocity = Math.hypot(this.vx, this.vy);
    if (velocity === 0) return 0;
    const hx = -Math.sin(this.angle);
    const hy = -Math.cos(this.angle);
    return Math.max(
      -1,
      Math.min(
        1,
        Math.atan2(
          hx * this.vy - hy * this.vx,
          hx * this.vx + hy * this.vy,
        ) / Math.PI,
      ),
    );
  }

  /** signed angle between the heading and the next gate, in [-1, 1] */
  #gateDelta(circuit: Circuit) {
    const gate = circuit.checkpoints[this.nextCheckpoint];
    const dx = gate.x - this.x;
    const dy = gate.y - this.y;
    const hx = -Math.sin(this.angle);
    const hy = -Math.cos(this.angle);
    // cross over dot, atan2 gives the signed angle from the heading to the gate
    return Math.atan2(hx * dy - hy * dx, hx * dx + hy * dy) / Math.PI;
  }

  #assessDamage(obstacles: Obstacle[], circuit: Circuit) {
    // the road is the only safe place, the center leaving it is death
    if (!circuit.isOnRoad(this.x, this.y)) return true;
    const box = this.aabb;
    for (let i = 0; i < obstacles.length; i++) {
      const other = obstacles[i].aabb;
      if (
        box.maxX < other.minX ||
        box.minX > other.maxX ||
        box.maxY < other.minY ||
        box.minY > other.maxY
      ) {
        continue;
      }
      if (polysIntersect(this.polygon, obstacles[i].polygon)) {
        return true;
      }
    }
    return false;
  }

  #createPolygon() {
    const points = this.polygon;
    const rad = this.rad;
    const alpha = this.alpha;
    const a = this.angle;
    const x = this.x;
    const y = this.y;

    const a0 = a - alpha;
    points[0].x = x - Math.sin(a0) * rad;
    points[0].y = y - Math.cos(a0) * rad;
    const a1 = a + alpha;
    points[1].x = x - Math.sin(a1) * rad;
    points[1].y = y - Math.cos(a1) * rad;
    const a2 = Math.PI + a - alpha;
    points[2].x = x - Math.sin(a2) * rad;
    points[2].y = y - Math.cos(a2) * rad;
    const a3 = Math.PI + a + alpha;
    points[3].x = x - Math.sin(a3) * rad;
    points[3].y = y - Math.cos(a3) * rad;

    const box = this.aabb;
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    for (let i = 1; i < 4; i++) {
      const p = points[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    box.minX = minX;
    box.maxX = maxX;
    box.minY = minY;
    box.maxY = maxY;
  }

  #move() {
    // 1. decompose old velocity in heading frame
    const v = Math.hypot(this.vx, this.vy);
    const steer = this.controls.left - this.controls.right;
    const target =
      steer *
      lerp(config.CAR_YAW_SHARP, config.CAR_YAW_LAZY, Math.min(1, v / this.maxSpeed));
    this.va += (target - this.va) * config.CAR_YAW_RESPONSE;
    this.angle += this.va;

    // 2. decompose in new heading frame
    const hx = -Math.sin(this.angle), hy = -Math.cos(this.angle);
    const px = Math.cos(this.angle), py = -Math.sin(this.angle);
    let vf = this.vx * hx + this.vy * hy;
    let vl = this.vx * px + this.vy * py;

    // 3. apply the throttle: positive drives, negative brakes or reverses
    if (this.controls.throttle > 0)
      vf += config.CAR_ACCELERATION * this.controls.throttle;
    if (this.controls.throttle < 0) {
      const t = -this.controls.throttle;
      if (vf > 0) vf = Math.max(0, vf - config.CAR_BRAKE_DECEL * t);
      else vf -= config.CAR_REVERSE_ACCEL * t;
    }

    // 4. tire grip: lateral acceleration demands exceed grip limit, the lateral component persists
    const demand = v * Math.abs(this.va);
    const over = Math.min(1, demand / (this.maxSpeed * config.CAR_GRIP_LIMIT_RATIO));
    const grip = lerp(config.CAR_GRIP, config.CAR_DRIFT_GRIP, over);
    vl *= 1 - grip;

    this.drifting = Math.abs(vl) > config.CAR_DRIFT_THRESHOLD;
    if (this.drifting) vf *= 1 - config.CAR_DRIFT_SPEED_LOSS;

    // 5. friction opposing motion
    const vm = Math.hypot(vf, vl);
    if (vm > 0) {
      const f = Math.max(0, vm - config.CAR_FRICTION) / vm;
      vf *= f;
      vl *= f;
    }

    // 6. caps: forward ≤ maxSpeed, reverse ≥ -maxSpeed/2, total ≤ maxSpeed
    if (vf > this.maxSpeed) vf = this.maxSpeed;
    if (vf < -this.maxSpeed / 2) vf = -this.maxSpeed / 2;
    const vm2 = Math.hypot(vf, vl);
    if (vm2 > this.maxSpeed) {
      const s = this.maxSpeed / vm2;
      vf *= s;
      vl *= s;
    }

    // 7. recompose and store
    this.vx = hx * vf + px * vl;
    this.vy = hy * vf + py * vl;
    this.speed = vf;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D, focused = false) {
    if (!this.damaged && focused) {
      // the gate line in world space, only the focused car renders it,
      // white when aligned, red when turned away
      const dx = this.gateX - this.x;
      const dy = this.gateY - this.y;
      const d = Math.hypot(dx, dy) || 1;
      const t = Math.min(20, Math.round(Math.abs(this.gateDelta) * 20));
      ctx.strokeStyle = GATE_COLORS[t];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + (dx / d) * config.GATE_LINE_LENGTH,
        this.y + (dy / d) * config.GATE_LINE_LENGTH,
      );
      ctx.stroke();
    }

    if (this.sensor && focused) {
      this.sensor.draw(ctx);
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);
    if (!this.damaged) {
      ctx.drawImage(
        this.mask,
        -this.width * 0.5,
        -this.height * 0.5,
        this.width,
        this.height,
      );
      ctx.globalCompositeOperation = 'multiply';
    }
    ctx.drawImage(
      this.img,
      -this.width * 0.5,
      -this.height * 0.5,
      this.width,
      this.height,
    );
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0, 1)';
    ctx.fillText(`${this.label}`, 0, this.height - 22);
    ctx.restore();
  }
}
