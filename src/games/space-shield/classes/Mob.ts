import { THREE } from "../../../utilities/three"
import { Central } from "./Central.class"

const geometry = new THREE.BoxGeometry()

export class Mob {
  public targetIndex = 0
  public mesh: THREE.Mesh
  public speed = 1
  public target: Central | null = null
  public material: THREE.MeshBasicMaterial
  constructor(public x = 0, public y = 0) {
    this.material = new THREE.MeshBasicMaterial()
    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.scale.set(0.3, 0.3, 0.3)
    this.mesh.position.set(this.x, this.y, 0)
  }

  update(es: number) {
    if (!this.target) {
      // find target
      // this.targetIndex = 0
      // this.changeTarget()
    }
    if (this.target) {
      const { x, y } = this.target.mesh.position
      if (x < this.x) this.x -= this.speed
      if (x > this.x) this.x += this.speed
      if (y < this.y) this.y -= this.speed
      if (y > this.y) this.y += this.speed

      // if (this.target.isInRange(this.mesh, this.speed * 1.5)) {
      //   this.changeTarget()
      // }
    }
    this.mesh.position.set(this.x, this.y, 0)
    this.mesh.rotation.x += this.speed
    this.mesh.rotation.y += this.speed
  }

  // private changeTarget() {
  //   this.target = this.path.getNext(this.targetIndex++)
  //   if (!this.target) {
  //     this.targetIndex = 0
  //     this.target = this.path.getNext(this.targetIndex++)
  //   }
  // }
}
