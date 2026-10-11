import * as THREE from 'three';
import type { Ball } from './Ball';

/**
 * Debug/spectator aid: draws the sensors of the ball the camera is following.
 * One line per ray, shortened to the actual hit, plus a translucent fan surface
 * joining the horizontal ray endpoints so the coverage the brain sees is
 * legible at a glance. The vertical up/down rays are lines only.
 *
 * All geometry is allocated once and rewritten in place each frame, so showing
 * the fan costs a few hundred bytes of upload and no allocations.
 */
export class SensorViz {
  public readonly group = new THREE.Group();
  /** one segment per ray: origin then endpoint */
  public readonly rays: THREE.LineSegments;
  /** triangle fan from the ball through consecutive horizontal endpoints */
  public readonly fan: THREE.Mesh;

  #rayCount: number;
  #fanCount: number;
  #rayPositions: Float32Array;
  #fanPositions: Float32Array;
  #rayAttribute: THREE.BufferAttribute;
  #fanAttribute: THREE.BufferAttribute;
  /** scratch endpoints of the horizontal rays used to build the fan */
  #fanEnds: Float32Array;
  #direction = { x: 0, y: 0, z: 0 };

  constructor(fanCount: number, rayCount = fanCount + 2) {
    this.#fanCount = fanCount;
    this.#rayCount = rayCount;
    this.#rayPositions = new Float32Array(rayCount * 6);
    this.#fanPositions = new Float32Array((fanCount - 1) * 9);
    this.#fanEnds = new Float32Array(fanCount * 3);

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

    const fanGeometry = new THREE.BufferGeometry();
    this.#fanAttribute = new THREE.BufferAttribute(this.#fanPositions, 3);
    this.#fanAttribute.setUsage(THREE.DynamicDrawUsage);
    fanGeometry.setAttribute('position', this.#fanAttribute);
    this.fan = new THREE.Mesh(
      fanGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x2f8fd0,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.fan.frustumCulled = false;
    this.fan.renderOrder = 4;

    this.group.add(this.fan, this.rays);
    this.group.visible = false;
  }

  /** Reposition the fan on `ball` and show or hide the whole visualization. */
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
      if (i < this.#fanCount) {
        this.#fanEnds[i * 3] = endX;
        this.#fanEnds[i * 3 + 1] = endY;
        this.#fanEnds[i * 3 + 2] = endZ;
      }
    }
    let f = 0;
    for (let i = 0; i < this.#fanCount - 1; i++) {
      const a = i * 3;
      const b = (i + 1) * 3;
      this.#fanPositions[f++] = originX;
      this.#fanPositions[f++] = originY;
      this.#fanPositions[f++] = originZ;
      this.#fanPositions[f++] = this.#fanEnds[a];
      this.#fanPositions[f++] = this.#fanEnds[a + 1];
      this.#fanPositions[f++] = this.#fanEnds[a + 2];
      this.#fanPositions[f++] = this.#fanEnds[b];
      this.#fanPositions[f++] = this.#fanEnds[b + 1];
      this.#fanPositions[f++] = this.#fanEnds[b + 2];
    }
    this.#rayAttribute.needsUpdate = true;
    this.#fanAttribute.needsUpdate = true;
    this.group.visible = true;
  }

  /** Release the geometry and materials when the game tears down. */
  dispose() {
    this.rays.geometry.dispose();
    (this.rays.material as THREE.Material).dispose();
    this.fan.geometry.dispose();
    (this.fan.material as THREE.Material).dispose();
  }
}
