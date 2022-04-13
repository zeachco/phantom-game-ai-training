import { THREE } from "../../../utilities/three"

const geometry = new THREE.SphereGeometry()
const material = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  opacity: 0.5,
})

export class Segment {
  public mesh: THREE.Mesh
  private clock = new THREE.Clock()

  constructor(public x: number, public y: number, public range = 10) {
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.scale.set(0.2, 0.2, 0.02)
    this.mesh.position.x = x
    this.mesh.position.y = y
  }

  public isInRange(x: number, y: number) {
    return Math.sqrt(this.x - x + (this.y - y)) < this.range
  }

  render() {
    this.mesh.scale.y = 0.2 + Math.sin(this.clock.getElapsedTime() * 10) * 0.02
  }
}
