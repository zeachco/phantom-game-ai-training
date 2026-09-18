import { Controls } from './Controls';
import { NeuralNetwork } from '../../../ai/Network';
import { Sensor } from './Sensor';
import { ControlType } from '../types';
import carImg from '../assets/car.png';
import { AABB, polysIntersect, Vector } from '../../../utilities/math';
import { getRandomColor } from '../../../utilities/colors';
import { config } from './Config';
import { Circuit } from './Circuit';
import { Obstacle } from './Obstacle';

export class Car {
  public speed: number;
  public acceleration: number;
  public friction: number;
  public angle: number;
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
  /** gate the car is currently inside, -1 in none, charges out-of-order entries */
  public insideGate = -1;
  /** performance.now() of the crash, corpses are deleted after DEAD_LIFETIME */
  public deathTime = 0;
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
    this.acceleration = config.CAR_ACCELERATION;
    this.maxSpeed = maxSpeed;
    this.friction = config.CAR_FRICTION;
    this.angle = 0;
    this.damaged = false;

    this.useAI = controlType == ControlType.AI;

    this.controls = new Controls(controlType);

    if (controlType !== ControlType.DUMMY) {
      this.sensor = new Sensor(this);
      const inputCount = this.sensor.rayCount + 1;
      const outputCount = Object.keys(this.controls).length;
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
    this.damaged = this.#assessDamage(obstacles, circuit);
    if (this.sensor) {
      this.sensor.update(obstacles, circuit.segments);
      const offsets = this.sensor.readings.map((s) =>
        s == null ? 0 : 1 - s.offset,
      );
      offsets.push(this.speed / this.maxSpeed);
      const outputs = this.brain.process(offsets);

      if (this.useAI) {
        const [forward, left, right, reverse] = outputs;
        this.controls.forward = forward;
        this.controls.left = left;
        this.controls.right = right;
        this.controls.reverse = reverse;
      }
    }
  }

  /** the trickle keeps a car moving, the gates in order carry the score,
   *  a gate touched out of order is a debt charged once per entry */
  #updateScore(circuit: Circuit) {
    this.brain.score += this.speed * config.DISTANCE_SCORE_RATE;
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

    if (gate === -1) {
      this.insideGate = -1;
      return;
    }
    if (gate === this.nextCheckpoint) {
      this.brain.score += config.CHECKPOINT_SCORE;
      this.nextCheckpoint = (this.nextCheckpoint + 1) % n;
    } else if (gate !== this.insideGate) {
      this.brain.score -= config.CHECKPOINT_SCORE;
    }
    this.insideGate = gate;
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
    const { forward, reverse, left, right } = this.controls;
    if (forward > 0) this.speed += this.acceleration * forward;
    if (reverse > 0) this.speed -= this.acceleration * reverse;
    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;
    if (this.speed > 0) this.speed -= this.friction;
    if (this.speed < 0) this.speed += this.friction;
    if (Math.abs(this.speed) < this.friction) this.speed = 0;

    if (left > 0) this.va += (this.speed / 300) * left;
    if (right > 0) this.va -= (this.speed / 300) * right;

    this.va *= 0.6;
    this.angle += this.va;

    this.x -= Math.sin(this.angle) * this.speed;
    this.y -= Math.cos(this.angle) * this.speed;
  }

  draw(ctx: CanvasRenderingContext2D, drawSensor = false) {
    if (this.sensor && drawSensor) {
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
