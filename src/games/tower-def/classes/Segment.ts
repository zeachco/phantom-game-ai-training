import { THREE } from "../../../utilities/three"

const geometry = new THREE.RingGeometry()
const material = new THREE.MeshBasicMaterial({
  color: 0x8800bb,
  opacity: 0.5,
})

export class Segment {
  public mesh: THREE.Mesh
  private clock = new THREE.Clock()

  constructor(public x: number, public y: number) {
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.scale.set(0.2, 0.2, 0.02)
    this.mesh.position.x = x
    this.mesh.position.y = y
  }

  public isInRange(mesh: THREE.Mesh, range = 0.1) {
    if (!mesh?.position) return false
    return mesh.position.distanceTo(this.mesh.position) < range
  }

  render() {
    this.mesh.scale.y = 0.2 + Math.sin(this.clock.getElapsedTime() * 10) * 0.02
  }
}
