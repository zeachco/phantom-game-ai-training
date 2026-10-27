import {
  circleIntersectionOffset,
  segmentIntersectionOffset,
  type Vector,
} from '../math';

/** one ray hit: the point where the ray first touches the world, with its
 *  parametric position on the ray */
export interface Reading {
  x: number;
  y: number;
  offset: number;
}

/**
 * The shared bookkeeping of a 2D ray fan: a fixed set of rays spread around
 * a heading, every endpoint updated in place each frame, and one reusable
 * hit reading per ray so a full update never allocates. Highway and circuit
 * extend it, supplying their own fan profile and hit targets.
 */
export class RayFan2D {
  readonly rayCount: number;
  /** one [start, end] pair per ray, the points are updated in place */
  readonly rays: Vector[][] = [];
  /** one hit per ray, null while the ray sees nothing */
  readonly readings: (Reading | null)[];
  /** each ray's fixed offset from the heading angle, sin/cos precomputed */
  #cosOff: number[] = [];
  #sinOff: number[] = [];
  #reachX: number[] = [];
  #reachY: number[] = [];
  /** one reusable hit point per ray, so endReading never allocates */
  #pool: Reading[] = [];
  /** the current ray's endpoints, read by the tests to stay argument-light */
  #ax = 0;
  #ay = 0;
  #bx = 0;
  #by = 0;
  #best = Infinity;
  #bestX = 0;
  #bestY = 0;
  #index = 0;

  constructor(
    rayCount: number,
    /** the fixed angle offset of ray i, 0 straight ahead */
    offsetOf: (i: number) => number,
    /** the reach of ray i along each axis, applied to its unit vector */
    reachOf: (i: number) => { x: number; y: number },
  ) {
    this.rayCount = rayCount;
    this.readings = new Array(this.rayCount);
    this.#pool = new Array(this.rayCount);
    for (let i = 0; i < this.rayCount; i++) {
      const offset = offsetOf(i);
      this.#cosOff.push(Math.cos(offset));
      this.#sinOff.push(Math.sin(offset));
      const reach = reachOf(i);
      this.#reachX.push(reach.x);
      this.#reachY.push(reach.y);
      this.#pool[i] = { x: 0, y: 0, offset: 0 };
      this.rays.push([
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ]);
    }
  }

  /** recompute every ray endpoint from the current position and angle */
  cast(x: number, y: number, angle: number): void {
    // two trig calls for the angle, then a sum formula per ray
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    for (let i = 0; i < this.rayCount; i++) {
      const start = this.rays[i][0];
      const end = this.rays[i][1];
      start.x = x;
      start.y = y;
      const sinR = sinA * this.#cosOff[i] - cosA * this.#sinOff[i];
      const cosR = cosA * this.#cosOff[i] + sinA * this.#sinOff[i];
      end.x = x - sinR * this.#reachX[i];
      end.y = y - cosR * this.#reachY[i];
    }
  }

  /** begin collecting the closest hit of ray i; testSegment / testCircle
   *  then feed it, endReading closes it */
  startReading(index: number): void {
    const ray = this.rays[index];
    this.#ax = ray[0].x;
    this.#ay = ray[0].y;
    this.#bx = ray[1].x;
    this.#by = ray[1].y;
    this.#best = Infinity;
    this.#index = index;
  }

  /** consider the segment (cx,cy)-(dx,dy) as a possible hit */
  testSegment(cx: number, cy: number, dx: number, dy: number): void {
    this.#consider(
      segmentIntersectionOffset(
        this.#ax,
        this.#ay,
        this.#bx,
        this.#by,
        cx,
        cy,
        dx,
        dy,
      ),
    );
  }

  /** consider the circle (cx,cy) of radius as a possible hit */
  testCircle(cx: number, cy: number, radius: number): void {
    this.#consider(
      circleIntersectionOffset(
        this.#ax,
        this.#ay,
        this.#bx,
        this.#by,
        cx,
        cy,
        radius,
      ),
    );
  }

  /** record the hit while it beats the closest one found so far */
  #consider(t: number): void {
    if (t >= 0 && t < this.#best) {
      this.#best = t;
      this.#bestX = this.#ax + (this.#bx - this.#ax) * t;
      this.#bestY = this.#ay + (this.#by - this.#ay) * t;
    }
  }

  /** the pooled hit point of the current ray, or null when it sees nothing */
  endReading(): Reading | null {
    if (this.#best === Infinity) return null;
    const reading = this.#pool[this.#index];
    reading.x = this.#bestX;
    reading.y = this.#bestY;
    reading.offset = this.#best;
    return reading;
  }

  /**
   * Trace the fan outline: the origin, then each ray's effective endpoint —
   * the hit when there is one, the full reach otherwise. The caller fills
   * and strokes with its own style.
   */
  tracePath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    const origin = this.rays[0][0];
    ctx.moveTo(origin.x, origin.y);
    for (let i = 0; i < this.rays.length; i++) {
      const end = this.readings[i] || this.rays[i][1];
      ctx.lineTo(end.x, end.y);
    }
    ctx.closePath();
  }
}
