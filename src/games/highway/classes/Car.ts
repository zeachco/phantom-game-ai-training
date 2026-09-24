import { NeuralNetwork } from '../../../ai/Network';
import { getRandomColor } from '../../../utilities/colors';
import {
  type AABB,
  polysIntersect,
  type Vector,
} from '../../../utilities/math';
import carImg from '../assets/car.png';
import { ControlType } from '../types';
import { config } from './Config';
import { Controls } from './Controls';
import type { DeathRay } from './DeathRay';
import { Sensor } from './Sensor';

export class Car {
  public speed: number;
  public acceleration: number;
  public friction: number;
  public angle: number;
  public damaged: boolean;
  public useAI: boolean;
  public bornAt: number;
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
    this.bornAt = performance.now();

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

  update(roadBorders: Vector[][], traffic: Car[], deathRays: DeathRay[]) {
    if (this.damaged) return;
    this.#move();
    if (this.brain) this.#updateScore();

    this.#createPolygon();
    this.damaged = this.#assessDamage(roadBorders, traffic);
    if (this.sensor) {
      this.sensor.update(roadBorders, traffic, deathRays);
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

  #updateScore() {
    // vertical distance
    this.brain.score += Math.cos(this.angle) * this.speed;
    // travel distance
    this.brain.score += this.speed / 10;
  }

  #assessDamage(roadBorders: Vector[][], traffic: Car[]) {
    const box = this.aabb;
    for (let i = 0; i < roadBorders.length; i++) {
      const border = roadBorders[i];
      // the road edges span the whole world vertically, straddling the line
      // is the same as the convex polygon intersecting it
      if (border[0].x === border[1].x) {
        if (box.minX < border[0].x && box.maxX > border[0].x) return true;
      } else if (polysIntersect(this.polygon, border)) {
        return true;
      }
    }
    for (let i = 0; i < traffic.length; i++) {
      const other = traffic[i].aabb;
      if (
        box.maxX < other.minX ||
        box.minX > other.maxX ||
        box.maxY < other.minY ||
        box.minY > other.maxY
      ) {
        continue;
      }
      if (polysIntersect(this.polygon, traffic[i].polygon)) {
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
