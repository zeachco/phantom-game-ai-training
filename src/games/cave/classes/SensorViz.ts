import * as THREE from 'three';
import type { Ball } from './Ball';

/**
 * Debug/spectator aid: draws the sensors of the ball the camera is following.
 * One line per ray, shortened to the actual hit, plus a translucent cone
 * surface joining the rim ray endpoints, so the forward 3D cone the brain sees
 * is legible at a glance.
 *
 * All geometry is allocated once and rewritten in place each frame, so showing
 * the cone costs a few hundred bytes of upload and no allocations.
 */
export class SensorViz {
  public readonly group = new THREE.Group();
  /** one segment per ray: origin then endpoint */
  public readonly rays: THREE.LineSegments;
  /** cone lateral surface: the origin and two consecutive rim endpoints */
  public readonly cone: THREE.Mesh;

  #rayCount: number;
  #surface: number[];
  #rayPositions: Float32Array;
  #surfacePositions: Float32Array;
  #rayAttribute: THREE.BufferAttribute;
  #surfaceAttribute: THREE.BufferAttribute;
  /** scratch world endpoint of every ray, addressed by ray index */
  #ends: Float32Array;
  #direction = { x: 0, y: 0, z: 0 };

  constructor(rayCount: number, surfaceIndices: number[]) {
    this.#rayCount = rayCount;
    this.#surface = surfaceIndices;
    this.#rayPositions = new Float32Array(rayCount * 6);
    this.#surfacePositions = new Float32Array(surfaceIndices.length * 9);
    this.#ends = new Float32Array(rayCount * 3);

    const rayGeometry = new THREE.BufferGeometry();
    this.#rayAttribute = new THREE.BufferAttribute(this.#rayPositions, 3);
    this.#rayAttribute.setUsage(THREE.DynamicDrawUsage);
    rayGeometry.setAttribute('position', this.#rayAttribute);
    this.rays = new THREE.LineSegments(
      rayGeometry,
      new THREE.LineBasicMaterial({
        color: 0x5fe0ff,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.rays.frustumCulled = false;
    this.rays.renderOrder = 5;

    const surfaceGeometry = new THREE.BufferGeometry();
    this.#surfaceAttribute = new THREE.BufferAttribute(
      this.#surfacePositions,
      3,
    );
    this.#surfaceAttribute.setUsage(THREE.DynamicDrawUsage);
    surfaceGeometry.setAttribute('position', this.#surfaceAttribute);
    this.cone = new THREE.Mesh(
      surfaceGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x2f8fd0,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.cone.frustumCulled = false;
    this.cone.renderOrder = 4;

    this.group.add(this.cone, this.rays);
    this.group.visible = false;
  }

  /** Reposition the cone on `ball` and show or hide the whole visualization. */
  update(ball: Ball, visible: boolean) {
    const sensor = ball.sensor;
    if (!visible || !sensor) {
      this.group.visible = false;
      return;
    }
    const originX = ball.x;
    const originY = ball.y;
    const originZ = ball.z;
    const dir = this.#direction;
    for (let i = 0; i < this.#rayCount; i++) {
      const reach = sensor.rayVector(i, dir);
      // readings store 1 - t/reach, so 0 means a miss and draws the full reach
      const t = (1 - sensor.readings[i]) * reach;
      const endX = originX + dir.x * t;
      const endY = originY + dir.y * t;
      const endZ = originZ + dir.z * t;
      const o = i * 6;
      this.#rayPositions[o] = originX;
      this.#rayPositions[o + 1] = originY;
      this.#rayPositions[o + 2] = originZ;
      this.#rayPositions[o + 3] = endX;
      this.#rayPositions[o + 4] = endY;
      this.#rayPositions[o + 5] = endZ;
      this.#ends[i * 3] = endX;
      this.#ends[i * 3 + 1] = endY;
      this.#ends[i * 3 + 2] = endZ;
    }
    // cone lateral surface: origin and two consecutive rim endpoints, closing
    // the ring so the cone seals on itself
    const n = this.#surface.length;
    let f = 0;
    for (let k = 0; k < n; k++) {
      const a = this.#surface[k] * 3;
      const b = this.#surface[(k + 1) % n] * 3;
      this.#surfacePositions[f++] = originX;
      this.#surfacePositions[f++] = originY;
      this.#surfacePositions[f++] = originZ;
      this.#surfacePositions[f++] = this.#ends[a];
      this.#surfacePositions[f++] = this.#ends[a + 1];
      this.#surfacePositions[f++] = this.#ends[a + 2];
      this.#surfacePositions[f++] = this.#ends[b];
      this.#surfacePositions[f++] = this.#ends[b + 1];
      this.#surfacePositions[f++] = this.#ends[b + 2];
    }
    this.#rayAttribute.needsUpdate = true;
    this.#surfaceAttribute.needsUpdate = true;
    this.group.visible = true;
  }

  /** Release the geometry and materials when the game tears down. */
  dispose() {
    this.rays.geometry.dispose();
    (this.rays.material as THREE.Material).dispose();
    this.cone.geometry.dispose();
    (this.cone.material as THREE.Material).dispose();
  }
}
