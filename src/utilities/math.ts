export interface Vector {
  x: number;
  y: number;
}

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function rand(min = -1, max = 1): number {
  return min + Math.random() * (max - min);
}

export function lerp(A: number, B: number, t: number) {
  return A + (B - A) * t;
}

export function getIntersection(A: Vector, B: Vector, C: Vector, D: Vector) {
  const t = segmentIntersectionOffset(A.x, A.y, B.x, B.y, C.x, C.y, D.x, D.y);
  if (t === -1) return null;
  return {
    x: lerp(A.x, B.x, t),
    y: lerp(A.y, B.y, t),
    offset: t,
  };
}

/** The running [tmin, tmax] of one slab test, reused between the two axis
 *  calls; the calls never nest, so one shared scratch is safe. */
const slabT = { tmin: 0, tmax: 0 };

/**
 * One axis of the slab test: folds the segment's crossing of the two faces
 * faceMin..faceMax into the running [tmin, tmax] interval, written into
 * out. False when the segment is parallel to the faces and misses them, or
 * when the fold empties the interval.
 */
function slabAxis(
  delta: number,
  origin: number,
  faceMin: number,
  faceMax: number,
  out: { tmin: number; tmax: number },
): boolean {
  if (delta === 0) {
    if (origin < faceMin || origin > faceMax) return false;
    return true;
  }
  const inv = 1 / delta;
  let t1 = (faceMin - origin) * inv;
  let t2 = (faceMax - origin) * inv;
  if (t1 > t2) {
    const t = t1;
    t1 = t2;
    t2 = t;
  }
  if (t1 > out.tmin) out.tmin = t1;
  if (t2 < out.tmax) out.tmax = t2;
  return out.tmin <= out.tmax;
}

/**
 * Slab test of a segment against an axis-aligned box. A few comparisons,
 * used to reject most ray/box pairs before any edge intersection is tried.
 */
export function segmentHitsAABB(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  box: AABB,
) {
  slabT.tmin = 0;
  slabT.tmax = 1;
  const dx = bx - ax;
  const dy = by - ay;
  if (!slabAxis(dx, ax, box.minX, box.maxX, slabT)) return false;
  if (!slabAxis(dy, ay, box.minY, box.maxY, slabT)) return false;
  return true;
}

export function polysIntersect(poly1: Vector[], poly2: Vector[]) {
  for (let i = 0; i < poly1.length; i++) {
    for (let j = 0; j < poly2.length; j++) {
      const touch = getIntersection(
        poly1[i],
        poly1[(i + 1) % poly1.length],
        poly2[j],
        poly2[(j + 1) % poly2.length],
      );
      if (touch) {
        return true;
      }
    }
  }
  return false;
}

/** closest point of a closed polygon's outline to a point, written into `out` */
export function closestPointOnPolygon(
  point: Vector,
  poly: Vector[],
  out: Vector = { x: 0, y: 0 },
) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    const t =
      len2 === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((point.x - a.x) * abx + (point.y - a.y) * aby) / len2),
          );
    const cx = a.x + abx * t;
    const cy = a.y + aby * t;
    const d2 = (cx - point.x) ** 2 + (cy - point.y) ** 2;
    if (d2 < best) {
      best = d2;
      out.x = cx;
      out.y = cy;
    }
  }
  return out;
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * The offset of the crossing of segment AB over segment CD: the parameter t
 * on AB where they meet, or -1 when the segments do not cross.
 */
export function segmentIntersectionOffset(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  const tTop = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const uTop = (cy - ay) * (ax - bx) - (cx - ax) * (ay - by);
  const bottom = (dy - cy) * (bx - ax) - (dx - cx) * (by - ay);

  if (bottom === 0) return -1;
  const t = tTop / bottom;
  const u = uTop / bottom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}

/**
 * The offset of the first touch of segment AB with the circle (cx, cy) of
 * the given radius: the parameter t on AB, or -1 when the segment misses the
 * circle entirely.
 */
export function circleIntersectionOffset(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  radius: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const fx = ax - cx;
  const fy = ay - cy;
  const a = dx * dx + dy * dy;
  if (a === 0) return -1;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return -1;
  const root = Math.sqrt(discriminant);
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  if (first >= 0 && first <= 1) return first;
  return second >= 0 && second <= 1 ? second : -1;
}

/** true when two axis-aligned boxes overlap, touching edges included */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return !(
    a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY
  );
}

/**
 * The four corners of the oriented rectangle around (x, y): a vehicle box of
 * radius `rad` and half-width angle `alpha`, `angle` measured from north. The
 * points are written in place and reused every frame, only their coordinates
 * move.
 */
export function orientedRectPolygon(
  x: number,
  y: number,
  angle: number,
  rad: number,
  alpha: number,
  points: Vector[],
): void {
  const a0 = angle - alpha;
  points[0].x = x - Math.sin(a0) * rad;
  points[0].y = y - Math.cos(a0) * rad;
  const a1 = angle + alpha;
  points[1].x = x - Math.sin(a1) * rad;
  points[1].y = y - Math.cos(a1) * rad;
  const a2 = Math.PI + angle - alpha;
  points[2].x = x - Math.sin(a2) * rad;
  points[2].y = y - Math.cos(a2) * rad;
  const a3 = Math.PI + angle + alpha;
  points[3].x = x - Math.sin(a3) * rad;
  points[3].y = y - Math.cos(a3) * rad;
}

/** tighten `box` to the bounds of `points`, written in place */
export function updateAABB(points: Vector[], box: AABB): void {
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;
  for (let i = 1; i < points.length; i++) {
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

/** deterministic 32-bit PRNG, same seed → same sequence, for seeded maps */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Center a gamepad axis or stick around zero: values inside the deadzone
 *  read as 0, and the rest is rescaled so full travel is kept at the edges. */
export function applyDeadzone(value: number, deadzone = 0.12): number {
  const magnitude = Math.abs(value);
  if (magnitude <= deadzone) return 0;
  return (Math.sign(value) * (magnitude - deadzone)) / (1 - deadzone);
}

