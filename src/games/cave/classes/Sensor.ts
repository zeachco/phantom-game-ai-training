import { lerp } from '../../../utilities/math';
import type { Ball } from './Ball';
import type { Cave } from './Cave';
import { config } from './Config';

/**
 * The ball's eyes: a fan of SENSORS rays in the track plane (longest straight
 * ahead, tapering to the edges) plus one ray straight up and one straight down
 * for the ceiling and the floor. The rays are marched against the analytic
 * cave tube, not the mesh, so a reading costs a handful of trig calls instead
 * of thousands of triangles.
 */
export class Sensor {
  ball: Ball;
  /** SENSORS fan rays + up + down */
  rayCount: number;
  /** one 0..1 reading per ray, 0 when nothing is hit within reach */
  readings: number[];
  /** each fan ray's fixed offset from the heading, sin/cos precomputed */
  #cosOff: number[] = [];
  #sinOff: number[] = [];
  /** each fan ray's reach, a smooth profile over the fan angle */
  #lengths: number[] = [];

  constructor(ball: Ball) {
    this.ball = ball;
    this.rayCount = config.SENSORS + 2;
    this.readings = new Array(this.rayCount);
    const halfAngle = config.SENSOR_ANGLE / 2;
    for (let i = 0; i < config.SENSORS; i++) {
      // u runs -1 (left edge) .. 1 (right edge); the power warp keeps the
      // edges in place and packs the rays in between toward the heading
      const u = config.SENSORS === 1 ? 0 : (2 * i) / (config.SENSORS - 1) - 1;
      const warped = Math.sign(u) * Math.abs(u) ** config.SENSOR_FORWARD_BIAS;
      const offset = -warped * halfAngle;
      this.#cosOff.push(Math.cos(offset));
      this.#sinOff.push(Math.sin(offset));
      // cosine bell over the real angle: 1 straight ahead, 0 at the edges
      this.#lengths.push(
        lerp(
          config.SENSORS_EDGE_LENGTH,
          config.SENSORS_MAX_LENGTH,
          Math.cos((offset / halfAngle) * (Math.PI / 2)),
        ),
      );
    }
  }

  update(cave: Cave) {
    const car = this.ball;
    // fan ray direction: forward cos(off) + right sin(off), in the car's plane
    for (let i = 0; i < config.SENSORS; i++) {
      const dx = car.fx * this.#cosOff[i] + car.rx * this.#sinOff[i];
      const dy = car.fy * this.#cosOff[i] + car.ry * this.#sinOff[i];
      const dz = car.fz * this.#cosOff[i] + car.rz * this.#sinOff[i];
      this.readings[i] = this.#read(
        cave,
        car.x,
        car.y,
        car.z,
        dx,
        dy,
        dz,
        this.#lengths[i],
      );
    }
    this.readings[config.SENSORS] = this.#read(
      cave,
      car.x,
      car.y,
      car.z,
      car.ux,
      car.uy,
      car.uz,
      config.VERTICAL_RAY_LENGTH,
    );
    this.readings[config.SENSORS + 1] = this.#read(
      cave,
      car.x,
      car.y,
      car.z,
      -car.ux,
      -car.uy,
      -car.uz,
      config.VERTICAL_RAY_LENGTH,
    );
  }

  /** march one ray, encode the hit as 1 - t/reach, 0 when nothing is hit */
  #read(
    cave: Cave,
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    length: number,
  ) {
    const car = this.ball;
    const t = cave.castRay(
      ox,
      oy,
      oz,
      dx,
      dy,
      dz,
      length,
      car.s,
      car.cx,
      car.cy,
      car.cz,
    );
    return t < 0 ? 0 : Math.max(0, 1 - t / length);
  }
}
