import { Controls } from "./Controls";
import { NeuralNetwork } from "../../ai/Network";
import { Sensor } from "./Sensor";
import { ControlType } from "./types";
import carImg from "./assets/car.png";
import { polysIntersect, randInt, Vector } from "../../utilities/math";
import { getRandomColor } from "../../utilities/colors";
import { Road } from "./Road";
import { config } from "./Config";

let carCount = 0;

export class Car {
  speed: number;
  acceleration: number;
  friction: number;
  angle: number;
  damaged: boolean;
  useAI: boolean;
  sensor?: Sensor;
  neural?: NeuralNetwork;
  controls: Controls;
  img: HTMLImageElement;
  mask: HTMLCanvasElement;
  polygon: Vector[] = [];
  public distance = 0;
  public score = 0;

  constructor(
    public x = 0,
    public y = 0,
    public width = 50,
    public height = 50,
    controlType = ControlType.DUMMY,
    public maxSpeed = 2.8,
    public label = `${carCount++}`,
    color = getRandomColor(),
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.speed = 0;
    this.acceleration = 0.3;
    this.maxSpeed = maxSpeed;
    this.friction = 0.05;
    this.angle = 0;
    this.damaged = false;

    this.useAI = controlType == ControlType.AI;

    this.controls = new Controls(controlType);

    if (controlType != ControlType.DUMMY) {
      this.sensor = new Sensor(this);
      this.neural = new NeuralNetwork(
        this.sensor.rayCount,
        Object.keys(this.controls).length,
        config.NETWORK_LAYERS,
      );
    }

    this.img = new Image();
    this.img.src = carImg;

    this.mask = document.createElement("canvas");
    this.mask.width = width;
    this.mask.height = height;

    const maskCtx = this.mask.getContext("2d")!;
    this.img.onload = () => {
      maskCtx.fillStyle = color;
      maskCtx.rect(0, 0, this.width, this.height);
      maskCtx.fill();

      maskCtx.globalCompositeOperation = "destination-atop";
      maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
    };
  }

  update(roadBorders: Vector[][], traffic: Car[]) {
    if (this.damaged) return;
    this.#move();
    this.#updateScore();

    this.polygon = this.#createPolygon();
    this.damaged = this.#assessDamage(roadBorders, traffic);
    if (this.sensor) {
      this.sensor.update(roadBorders, traffic);
      const offsets = this.sensor.readings.map((s) =>
        s == null ? 0 : 1 - s.offset,
      );
      const outputs = NeuralNetwork.feedForward(offsets, this.neural!);

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
    this.score += Math.cos(this.angle) * this.speed;
    // travel distance
    this.score += this.speed;
    // no dual input
    this.score += this.controls.left && this.controls.right ? -1 : 0;
    // no reverse
    this.score += this.controls.reverse ? -1 : 0;
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
    if (this.controls.forward) this.speed += this.acceleration;
    if (this.controls.reverse) this.speed -= this.acceleration;
    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;
    if (this.speed > 0) this.speed -= this.friction;
    if (this.speed < 0) this.speed += this.friction;
    if (Math.abs(this.speed) < this.friction) this.speed = 0;

    if (this.speed != 0) {
      const flip = this.speed > 0 ? 1 : -1;
      if (this.controls.left) this.angle += 0.03 * flip;
      if (this.controls.right) this.angle -= 0.03 * flip;
    }

    this.distance += this.speed;
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
      ctx.globalCompositeOperation = "multiply";
    }
    ctx.drawImage(
      this.img,
      -this.width * 0.5,
      -this.height * 0.5,
      this.width,
      this.height,
    );
    ctx.textAlign = "center";
    ctx.font = "bold 11px serif";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0, 1)";
    ctx.fillText(`${this.label}`, 0, this.height - 22);
    ctx.restore();
  }
}
