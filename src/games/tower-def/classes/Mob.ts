import { random } from "../../../utilities/math"
import { Segment } from "./Segment"
import { THREE } from "../../../utilities/three"

const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })

export class Mob {
  private speed = random(0.01, 0.1, true)
  public target?: Segment
  public mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>
  constructor(public x: number, public y: number) {
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.scale.set(0.5, 0.5, 0.2)
    this.mesh.position.set(this.x, this.y, 0)
  }

  update() {
    if (this.target) {
      const { x, y } = this.target
      if (x > this.x) this.x -= this.speed
      if (x < this.x) this.x += this.speed
      if (y > this.y) this.y -= this.speed
      if (y < this.y) this.y += this.speed
    }
    this.mesh.position.set(this.x, this.y, 0)
    this.mesh.rotation.x += this.speed
    this.mesh.rotation.y += this.speed
  }
}
