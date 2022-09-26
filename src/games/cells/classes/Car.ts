import { Controls } from './Controls';
import { NeuralNetwork } from '../../../ai/Network';
import { Sensor } from './Sensor';
import { ControlType } from '../types';
import carImg from '../assets/car.png';
import { polysIntersect, randInt, Vector } from '../../../utilities/math';
import { getRandomColor } from '../../../utilities/colors';
import { config } from './Config';

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
  public polygon: Vector[] = [];
  public width = 30;
  public height = 50;
  private img: HTMLImageElement;
  private mask: HTMLCanvasElement;
  private va = 0;

  constructor(
    public x = 0,
    public y = 0,
    controlType = ControlType.DUMMY,
    public maxSpeed = config.CAR_MAX_SPEED,
    public label = '',
    public color = getRandomColor(),
    public brainLayers = 1,
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
      this.brain = new NeuralNetwork(
        this.sensor.rayCount + 1,
        Object.keys(this.controls).length,
        brainLayers,
      );
    }

    this.img = new Image();
    this.img.src = carImg;

    this.mask = document.createElement('canvas');
    this.mask.width = this.width;
    this.mask.height = this.height;

    const maskCtx = this.mask.getContext('2d')!;
    this.img.onload = () => {
      maskCtx.fillStyle = this.color;
      maskCtx.rect(0, 0, this.width, this.height);
      maskCtx.fill();

      maskCtx.globalCompositeOperation = 'destination-atop';
      maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
    };
  }

  update(roadBorders: Vector[][], traffic: Car[]) {
    if (this.damaged) return;
    this.#move();
    if (this.brain) this.#updateScore();

    this.polygon = this.#createPolygon();
    this.damaged = this.#assessDamage(roadBorders, traffic);
    if (this.sensor) {
      this.sensor.update(roadBorders, traffic);
      const offsets = this.sensor.readings.map((s) =>
        s == null ? 0 : 1 - s.offset,
      );
      offsets.push(this.speed / this.maxSpeed);
      const outputs = NeuralNetwork.feedForward(offsets, this.brain);

      if (this.useAI) {
        this.controls.forward = outputs[0];
        this.controls.left = outputs[1];
        this.controls.right = outputs[2];
        this.controls.reverse = outputs[3];
      }
    }
  }

  #updateScore() {
    // vertical distance
    this.brain.score += Math.cos(this.angle) * this.speed;
    // travel distance
    this.brain.score += this.speed / 2;
  }

  #assessDamage(roadBorders: Vector[][], traffic: Car[]) {
    for (let i = 0; i < roadBorders.length; i++) {
      if (polysIntersect(this.polygon, roadBorders[i])) {
        return true;
      }
    }
    for (let i = 0; i < traffic.length; i++) {
      if (polysIntersect(this.polygon, traffic[i].polygon)) {
        return true;
      }
    }
    return false;
  }

  #createPolygon() {
    const points: Vector[] = [];
    const rad = Math.hypot(this.width, this.height) / 2;
    const alpha = Math.atan2(this.width, this.height);
    points.push({
      x: this.x - Math.sin(this.angle - alpha) * rad,
      y: this.y - Math.cos(this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(this.angle + alpha) * rad,
      y: this.y - Math.cos(this.angle + alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad,
    });
    points.push({
      x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
      y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad,
    });
    return points;
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

  draw(ctx: CanvasRenderingContext2D, drawSensor = false, index = 0) {
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
