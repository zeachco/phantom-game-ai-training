import { random } from "../../../utilities/math"
import { Segment } from "./Segment"
import { THREE } from "../../../utilities/three"
import { Path } from "./Path"

const geometry = new THREE.BoxGeometry()

const MINSPD = 0.05
const MAXSPD = 0.1

export class Mob {
  private speed = random(MINSPD, MAXSPD, true)
  public target?: Segment
  public targetIndex = 0
  public mesh: THREE.Mesh
  constructor(public path: Path, public x = 0, public y = 0) {
    const amountOfRed = Math.round((this.speed / MAXSPD) * 255)
    const amountOfGreen = Math.round(255 - amountOfRed / 2)
    const material = new THREE.MeshBasicMaterial({
      color: `rgba(${amountOfRed}, ${amountOfGreen}, 0)`,
      opacity: 0.2,
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.scale.set(0.3, 0.3, 0.3)
    this.mesh.position.set(this.x, this.y, 0)
  }

  update() {
    if (!this.target) {
      this.targetIndex = 0
      this.changeTarget()
    }
    if (this.target) {
      const { x, y } = this.target
      if (x < this.x) this.x -= this.speed
      if (x > this.x) this.x += this.speed
      if (y < this.y) this.y -= this.speed
      if (y > this.y) this.y += this.speed

      if (this.target.isInRange(this.mesh, this.speed * 1.5)) {
        this.changeTarget()
      }
    }
    this.mesh.position.set(this.x, this.y, 0)
    this.mesh.rotation.x += this.speed
    this.mesh.rotation.y += this.speed
  }

  private changeTarget() {
    this.target = this.path.getNext(this.targetIndex++)
    if (!this.target) {
      this.targetIndex = 0
      this.target = this.path.getNext(this.targetIndex++)
    }
  }
}
