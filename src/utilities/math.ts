export interface Vector {
  x: number;
  y: number;
}

export function rand(min = -1, max = 1): number {
  return min + Math.random() * (max - min);
}

export function randInt(min = -1, max = 1) {
  return Math.round(rand(max, min));
}

export function lerp(A: number, B: number, t: number) {
  return A + (B - A) * t;
}

export function getIntersection(A: Vector, B: Vector, C: Vector, D: Vector) {
  const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
  const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
  const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);

  if (bottom != 0) {
    const t = tTop / bottom;
    const u = uTop / bottom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: lerp(A.x, B.x, t),
        y: lerp(A.y, B.y, t),
        offset: t,
      };
    }
  }

  return null;
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

export function easeInCirc(x: number): number {
  return 1 - Math.sqrt(1 - Math.pow(x, 2));
}

export function sum(...nbs: number[]) {
  return nbs.reduce((acc, nb) => acc + nb, 0);
}

/**
 * Return between -Math.PI and Math.PI
 */
export function getAngle(x: number, y: number) {
  return Math.atan2(y, x);
}

export function angleOffset(a1: number, a2: number) {
  let diffAngle = a1 - a2;
  if (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
  if (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
  return diffAngle;
}

export function vecLength(x: number, y: number) {
  return Math.sqrt(x * x + y * y);
}

export function ratio(value, min = 0, max = 1) {
  return Math.max(min, Math.min(value, max));
}
