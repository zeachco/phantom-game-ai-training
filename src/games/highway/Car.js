import { Controls } from "./Controls";
import { NeuralNetwork } from "../../ai/Network";
import { Sensor } from "./Sensor";
import { ControlType } from "./types";
import carImg from "./assets/car.png";
import { polysIntersect } from "../../utilities/math";
import { getRandomColor } from "../../utilities/colors";
export class Car {
    x;
    y;
    width;
    height;
    maxSpeed;
    speed;
    acceleration;
    friction;
    angle;
    damaged;
    useBrain;
    sensor;
    brain;
    controls;
    img;
    mask;
    polygon = [];
    distance = 0;
    constructor(x = 0, y = 0, width = 50, height = 50, controlType = ControlType.DUMMY, maxSpeed = 2.8, color = getRandomColor()) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxSpeed = maxSpeed;
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
        this.useBrain = controlType == ControlType.AI;
        const levels = [];
        if (controlType != ControlType.DUMMY) {
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork(this.sensor.rayCount, 4);
        }
        this.controls = new Controls(controlType);
        this.img = new Image();
        this.img.src = carImg;
        this.mask = document.createElement("canvas");
        this.mask.width = width;
        this.mask.height = height;
        const maskCtx = this.mask.getContext("2d");
        this.img.onload = () => {
            maskCtx.fillStyle = color;
            maskCtx.rect(0, 0, this.width, this.height);
            maskCtx.fill();
            maskCtx.globalCompositeOperation = "destination-atop";
            maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
        };
    }
    update(roadBorders, traffic) {
        if (this.damaged)
            return;
        // if (!this.damaged) {
        this.#move();
        this.polygon = this.#createPolygon();
        this.damaged = this.#assessDamage(roadBorders, traffic);
        // }
        if (this.sensor) {
            this.sensor.update(roadBorders, traffic);
            const offsets = this.sensor.readings.map((s) => s == null ? 0 : 1 - s.offset);
            const outputs = NeuralNetwork.feedForward(offsets, this.brain);
            if (this.useBrain) {
                this.controls.forward = outputs[0];
                this.controls.left = outputs[1];
                this.controls.right = outputs[2];
                this.controls.reverse = outputs[3];
            }
        }
    }
    #assessDamage(roadBorders, traffic) {
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
        const points = [];
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
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration;
        }
        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if (this.speed < -this.maxSpeed / 2) {
            this.speed = -this.maxSpeed / 2;
        }
        if (this.speed > 0) {
            this.speed -= this.friction;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
        }
        if (Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }
        if (this.speed != 0) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) {
                this.angle += 0.03 * flip;
            }
            if (this.controls.right) {
                this.angle -= 0.03 * flip;
            }
        }
        this.distance += this.speed;
        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }
    draw(ctx, drawSensor = false, index = 0) {
        if (this.sensor && drawSensor) {
            this.sensor.draw(ctx);
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.angle);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255, 1)";
        ctx.strokeStyle = "rgba(0,0,0, .5)";
        ctx.fillText(`${index}`, 0, this.height * -0.5 + 9);
        ctx.strokeText(`${index}`, 0, this.height * -0.5 + 9);
        if (!this.damaged) {
            ctx.drawImage(this.mask, -this.width * 0.5, -this.height * 0.5, this.width, this.height);
            ctx.globalCompositeOperation = "multiply";
        }
        ctx.drawImage(this.img, -this.width * 0.5, -this.height * 0.5, this.width, this.height);
        ctx.restore();
    }
}
