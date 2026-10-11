import { lerp } from '../../../utilities/math';
import type { Ball } from './Ball';
import type { Cave } from './Cave';
import { config } from './Config';

/**
 * The ball's eyes: a shotgun cone of SENSORS rays opening along the ball's
 * movement direction, plus one ray straight up and one straight down in world
 * space for the ceiling and the floor. The cone gives the brain a 3D view of
 * the tube it is about to enter; the two verticals stay anchored to the world
 * so the floor/ceiling signal does not flip when the ball reverses.
 *
 * The cone is one center ray plus concentric rings sized to their
 * circumference, so the solid angle is covered roughly evenly. Reach follows a
 * cosine bell over each ray's angle from the axis: SENSORS_MAX_LENGTH straight
 * down the axis, SENSORS_EDGE_LENGTH at the rim.
 *
 * Rays are marched against the analytic cave tube; bronze slabs use their
 * shared triangles, with bounding boxes skipping distant patches. Each reading
 * is 1 - t/reach, 0 when nothing is hit.
 */
export class Sensor {
  ball: Ball;
  /** SENSORS cone rays + up + down */
  rayCount: number;
  /** one 0..1 reading per ray, 0 when nothing is hit within reach */
  readings: number[];
  /** indices of the outermost cone ring, in angular order. `SensorViz` turns
   *  them into the cone surface; the ring closes on itself. */
  readonly surfaceIndices: number[];
  /** per-ray unit direction in the moving cone frame: components along the
   *  axis, then the two perpendicular axes, combined at update time */
  #along: number[] = [];
  #side: number[] = [];
  #lift: number[] = [];
  /** each ray's reach, a cosine bell from the center to the cone edge */
  #lengths: number[] = [];
  /** current cone frame, refreshed every update and reused by rayVector */
  #axis = { x: 0, y: 0, z: -1 };
  #basisSide = { x: 1, y: 0, z: 0 };
  #basisLift = { x: 0, y: 1, z: 0 };

  constructor(ball: Ball) {
    this.ball = ball;
    this.rayCount = config.SENSORS + 2;
    this.readings = new Array(this.rayCount);
    const half = config.SENSOR_ANGLE / 2;
    const rings = config.SENSOR_CONE_RINGS;
    const weightSum = (rings * (rings + 1)) / 2;
    const remaining = config.SENSORS - 1;
    const counts: number[] = [];
    let assigned = 0;
    for (let r = 0; r < rings; r++) {
      const count =
        r === rings - 1
          ? remaining - assigned
          : Math.round((remaining * (r + 1)) / weightSum);
      counts.push(count);
      assigned += count;
    }

    // the center ray runs straight down the axis at full reach
    this.#push(0, 0, 1, config.SENSORS_MAX_LENGTH);
    for (let r = 0; r < rings; r++) {
      const theta = half * Math.sqrt((r + 1) / rings);
      const count = counts[r];
      // stagger the inner ring between the outer ring's rays
      const stagger = r === 0 && count > 0 ? Math.PI / count : 0;
      for (let k = 0; k < count; k++) {
        const phi = (2 * Math.PI * k) / count + stagger;
        const sin = Math.sin(theta);
        this.#push(
          sin * Math.cos(phi),
          sin * Math.sin(phi),
          Math.cos(theta),
          lerp(
            config.SENSORS_EDGE_LENGTH,
            config.SENSORS_MAX_LENGTH,
            Math.cos((theta / half) * (Math.PI / 2)),
          ),
        );
      }
    }
    // the ring pushed last is the rim, and it is the one SensorViz surfaces
    const rimCount = counts[rings - 1];
    const rimStart = config.SENSORS - rimCount;
    this.surfaceIndices = Array.from(
      { length: rimCount },
      (_, k) => rimStart + k,
    );
  }

  #push(side: number, lift: number, along: number, length: number) {
    this.#side.push(side);
    this.#lift.push(lift);
    this.#along.push(along);
    this.#lengths.push(length);
  }

  /** Point the cone down the ball's velocity, or the cave tangent when it is
   *  nearly still. Builds an orthonormal frame so ring rays spread in 3D. */
  #updateBasis() {
    const ball = this.ball;
    let ax = ball.vx;
    let ay = ball.vy;
    let az = ball.vz;
    let length = Math.hypot(ax, ay, az);
    if (length < config.SENSOR_MIN_AXIS_SPEED) {
      ax = ball.cx;
      ay = ball.cy;
      az = ball.cz;
      length = Math.hypot(ax, ay, az);
    }
    if (length < 1e-6) {
      ax = ball.fx;
      ay = ball.fy;
      az = ball.fz;
      length = Math.hypot(ax, ay, az) || 1;
    }
    ax /= length;
    ay /= length;
    az /= length;
    // any reference not parallel to the axis works; swap near the poles
    let rx = 0;
    let ry = 1;
    let rz = 0;
    if (Math.abs(ay) > 0.98) {
      rx = 1;
      ry = 0;
      rz = 0;
    }
    let sx = ry * az - rz * ay;
    let sy = rz * ax - rx * az;
    let sz = rx * ay - ry * ax;
    const sl = Math.hypot(sx, sy, sz) || 1;
    sx /= sl;
    sy /= sl;
    sz /= sl;
    this.#axis.x = ax;
    this.#axis.y = ay;
    this.#axis.z = az;
    this.#basisSide.x = sx;
    this.#basisSide.y = sy;
    this.#basisSide.z = sz;
    // lift = axis x side, already unit because both operands are unit
    this.#basisLift.x = ay * sz - az * sy;
    this.#basisLift.y = az * sx - ax * sz;
    this.#basisLift.z = ax * sy - ay * sx;
  }

  update(cave: Cave) {
    this.#updateBasis();
    const car = this.ball;
    const axis = this.#axis;
    const side = this.#basisSide;
    const lift = this.#basisLift;
    for (let i = 0; i < config.SENSORS; i++) {
      const dx =
        axis.x * this.#along[i] +
        side.x * this.#side[i] +
        lift.x * this.#lift[i];
      const dy =
        axis.y * this.#along[i] +
        side.y * this.#side[i] +
        lift.y * this.#lift[i];
      const dz =
        axis.z * this.#along[i] +
        side.z * this.#side[i] +
        lift.z * this.#lift[i];
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

  /** World-space direction of ray `index` and that ray's reach. Callers can
   *  reconstruct the hit endpoint as origin + dir * (1 - readings[index]) *
   *  reach, which is what the debug cone draws. Ray order matches `readings`:
   *  the SENSORS cone rays, then up, then down. */
  rayVector(index: number, out: { x: number; y: number; z: number }) {
    if (index < config.SENSORS) {
      const axis = this.#axis;
      const side = this.#basisSide;
      const lift = this.#basisLift;
      out.x =
        axis.x * this.#along[index] +
        side.x * this.#side[index] +
        lift.x * this.#lift[index];
      out.y =
        axis.y * this.#along[index] +
        side.y * this.#side[index] +
        lift.y * this.#lift[index];
      out.z =
        axis.z * this.#along[index] +
        side.z * this.#side[index] +
        lift.z * this.#lift[index];
      return this.#lengths[index];
    }
    const ball = this.ball;
    const sign = index === config.SENSORS ? 1 : -1;
    out.x = ball.ux * sign;
    out.y = ball.uy * sign;
    out.z = ball.uz * sign;
    return config.VERTICAL_RAY_LENGTH;
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
    let t = cave.castRay(
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
    const wall =
      cave.wallRayDistance?.(
        ox,
        oy,
        oz,
        dx,
        dy,
        dz,
        t < 0 ? length : t,
        car.s,
      ) ?? -1;
    if (wall >= 0) t = t < 0 ? wall : Math.min(t, wall);
    return t < 0 ? 0 : Math.max(0, 1 - t / length);
  }
}
