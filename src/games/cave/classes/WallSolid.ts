import * as THREE from 'three';

export interface WallContact {
  /** Positive outside the solid, negative inside it. */
  dist: number;
  nx: number;
  ny: number;
  nz: number;
}

type Face = 'front' | 'back' | 'deck' | 'base' | 'side';
interface Patch {
  bounds: THREE.Box3;
  triangles: { shape: THREE.Triangle; normal: THREE.Vector3; face: Face }[];
}

/** A closed slab whose rendering, sphere contacts and rays share vertices. */
export class WallSolid {
  public positions: Float32Array;
  public columns: number;
  public indices: number[] = [];
  private patches: Patch[] = [];
  private bounds = new THREE.Box3();
  private point = new THREE.Vector3();
  private closest = new THREE.Vector3();
  private ray = new THREE.Ray();
  private rayHit = new THREE.Vector3();
  private insideRay = new THREE.Ray();
  private insideHit = new THREE.Vector3();
  private insideDirection = new THREE.Vector3(0.423, 0.721, 0.547).normalize();

  /** A nearest face's plane cannot classify a point in a concave solid.
   * Count crossings of the complete closed mesh instead. */
  private containsPoint(point: THREE.Vector3) {
    if (!this.bounds.containsPoint(point)) return false;
    this.insideRay.set(point, this.insideDirection);
    const crossings: number[] = [];
    for (const patch of this.patches) {
      if (!this.insideRay.intersectsBox(patch.bounds)) continue;
      for (const { shape } of patch.triangles) {
        if (
          !this.insideRay.intersectTriangle(
            shape.a,
            shape.b,
            shape.c,
            false,
            this.insideHit,
          )
        )
          continue;
        const distance = point.distanceTo(this.insideHit);
        if (distance < 1e-7) return false;
        crossings.push(distance);
      }
    }
    crossings.sort((a, b) => a - b);
    let count = 0;
    let previous = -Infinity;
    for (const distance of crossings) {
      // Both triangles of a quad can report the same edge intersection.
      if (distance - previous < 1e-6) continue;
      count++;
      previous = distance;
    }
    return count % 2 === 1;
  }

  constructor(rows: Float32Array[], tangent: THREE.Vector3) {
    const columns = (this.columns = rows[0].length / 6);
    this.positions = new Float32Array(rows.length * rows[0].length);
    rows.forEach((row, i) => this.positions.set(row, i * row.length));
    const vertex = (r: number, a: number, top: number) =>
      (r * columns + a) * 2 + top;
    const get = (i: number) =>
      new THREE.Vector3().fromArray(this.positions, i * 3);
    const quad = (
      ids: number[],
      outward: THREE.Vector3,
      face: Face,
      patch: Patch,
    ) => {
      for (const corners of [
        [0, 1, 2],
        [1, 3, 2],
      ]) {
        const tri = corners.map((i) => ids[i]);
        const shape = new THREE.Triangle(
          ...(tri.map(get) as [THREE.Vector3, THREE.Vector3, THREE.Vector3]),
        );
        const normal = shape.getNormal(new THREE.Vector3());
        if (normal.dot(outward) < 0) {
          [tri[1], tri[2]] = [tri[2], tri[1]];
          [shape.b, shape.c] = [shape.c, shape.b];
          normal.negate();
        }
        this.indices.push(...tri);
        patch.triangles.push({ shape, normal, face });
        patch.bounds
          .expandByPoint(shape.a)
          .expandByPoint(shape.b)
          .expandByPoint(shape.c);
      }
    };
    for (let r = 0; r < rows.length; r++) {
      const patch: Patch = { bounds: new THREE.Box3(), triangles: [] };
      for (let a = 0; a < columns - 1; a++) {
        const b0 = vertex(r, a, 0),
          b1 = vertex(r, a + 1, 0);
        const t0 = b0 + 1,
          t1 = b1 + 1;
        if (r === 0 || r === rows.length - 1)
          quad(
            [b0, b1, t0, t1],
            tangent.clone().multiplyScalar(r === 0 ? -1 : 1),
            r === 0 ? 'front' : 'back',
            patch,
          );
        if (r === rows.length - 1) continue;
        const nb0 = vertex(r + 1, a, 0),
          nb1 = vertex(r + 1, a + 1, 0);
        const inward = get(t0).sub(get(b0));
        quad([t0, t1, nb0 + 1, nb1 + 1], inward, 'deck', patch);
        quad([b0, b1, nb0, nb1], inward.clone().negate(), 'base', patch);
      }
      if (r < rows.length - 1) {
        for (const a of [0, columns - 1]) {
          const edge = vertex(r, a, 0);
          const next = vertex(r + 1, a, 0);
          const neighbor = vertex(r, a === 0 ? 1 : a - 1, 0);
          quad(
            [edge, next, edge + 1, next + 1],
            get(edge).sub(get(neighbor)),
            'side',
            patch,
          );
        }
      }
      this.bounds.union(patch.bounds);
      this.patches.push(patch);
    }
  }

  public geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3),
    );
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  public contact(
    x: number,
    y: number,
    z: number,
    reach: number,
    face?: Face,
  ): WallContact | null {
    this.point.set(x, y, z);
    if (!face && this.bounds.distanceToPoint(this.point) > reach) return null;
    let best = Infinity;
    let result: WallContact | null = null;
    const contained = face ? undefined : this.containsPoint(this.point);
    for (const patch of this.patches) {
      if (patch.bounds.distanceToPoint(this.point) ** 2 > best) continue;
      for (const triangle of patch.triangles) {
        if (face && triangle.face !== face) continue;
        // Rock already resolves the embedded baseline. Always leave the slab
        // through one of its exposed faces, including when spawned inside it.
        if (!face && triangle.face === 'base') continue;
        triangle.shape.closestPointToPoint(this.point, this.closest);
        const distanceSquared = this.point.distanceToSquared(this.closest);
        if (distanceSquared >= best) continue;
        best = distanceSquared;
        const delta = this.point.clone().sub(this.closest);
        const inside = contained ?? delta.dot(triangle.normal) < -1e-7;
        const distance = Math.sqrt(distanceSquared);
        const normal =
          distance > 1e-7
            ? delta.multiplyScalar((inside ? -1 : 1) / distance)
            : triangle.normal;
        result = {
          dist: distance * (inside ? -1 : 1),
          nx: normal.x,
          ny: normal.y,
          nz: normal.z,
        };
      }
    }
    return result;
  }

  public rayDistance(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxLen: number,
  ) {
    this.ray.set(origin, direction);
    if (
      !this.bounds.containsPoint(origin) &&
      (!this.ray.intersectBox(this.bounds, this.rayHit) ||
        origin.distanceTo(this.rayHit) > maxLen)
    )
      return -1;
    if (this.containsPoint(origin)) return 0;
    let nearest = maxLen + 1;
    for (const patch of this.patches) {
      if (
        !patch.bounds.containsPoint(origin) &&
        (!this.ray.intersectBox(patch.bounds, this.rayHit) ||
          origin.distanceTo(this.rayHit) > nearest)
      )
        continue;
      for (const { shape } of patch.triangles) {
        if (
          this.ray.intersectTriangle(
            shape.a,
            shape.b,
            shape.c,
            false,
            this.rayHit,
          )
        )
          nearest = Math.min(nearest, origin.distanceTo(this.rayHit));
      }
    }
    return nearest <= maxLen ? nearest : -1;
  }
}
