import { MeshBasicMaterial, RingGeometry, Mesh, Clock } from 'three';
import { rand } from '../../../utilities/math';

const geometry = new RingGeometry();
const material = new MeshBasicMaterial({
  color: 0x0088ff,
  opacity: 0.5,
});

export class Segment {
  public mesh: Mesh;
  private clock = new Clock();

  constructor(public x: number, public y: number) {
    this.mesh = new Mesh(geometry, material);
    this.mesh.scale.set(0.2, 0.2, 0.02);
    this.mesh.position.x = x;
    this.mesh.position.y = y;
    // this.mesh.position.z = rand(-20, 20);
  }

  public isInRange(mesh: Mesh, range = 0.1) {
    if (!mesh?.position) return false;
    return mesh.position.distanceTo(this.mesh.position) < range;
  }

  update() {
    // this.mesh.rotateZ(2);
    // this.mesh.scale.y = 0.2 + Math.sin(this.clock.getElapsedTime() * 10) * 0.02;
  }
}
