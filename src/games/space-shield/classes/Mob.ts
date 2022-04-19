import { THREE } from "../../../utilities/three"
import { Central } from "./Central"

const geometry = new THREE.BoxGeometry()

export class Mob {
  public targetIndex = 0
  public mesh: THREE.Mesh
  public speed = 0.001
  public target: Central | null = null
  public material: THREE.MeshBasicMaterial
  public vector: THREE.Vector = new THREE.Vector3(0, 0, 0)
  public hp = 100
  constructor(public x = 0, public z = 0) {
    this.material = new THREE.MeshBasicMaterial()
    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.scale.set(0.3, 0.3, 0.3)
    this.mesh.position.set(this.x, 0, this.z)
  }

  update(es: number) {
    if (this.target) {
      const distance = this.mesh.position.distanceTo(this.target.mesh.position)

      const { x, z } = this.target.mesh.position

      if (distance > 1) {
        if (x < this.x) this.x -= this.speed * es
        if (x > this.x) this.x += this.speed * es
        if (z < this.z) this.z -= this.speed * es
        if (z > this.z) this.z += this.speed * es
      } else {
        this.hp -= 1
      }
      // if (this.target.isInRange(this.mesh, this.speed * 1.5)) {
      //   this.changeTarget()
      // }
    }

    this.mesh.position.set(this.x, 0, this.z)
    this.mesh.rotation.x += this.speed * es
    this.mesh.rotation.y += this.speed * es
  }
}
