import { THREE } from "../../../utilities/three"
import { Central } from "./Central"

const geometry = new THREE.BoxGeometry()
const V = THREE.Vector3

export class Mob {
  public targetIndex = 0
  public mesh: THREE.Mesh
  public speed = 0.01
  public target: Central | null = null
  public material: THREE.MeshBasicMaterial
  public v: THREE.Vector3 = new V(0, 0, 0)
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
      if (distance > 1) {
        this.mesh.lookAt(this.target.mesh.position)
        this.mesh.translateZ(Math.min((distance / 10000) * es, this.speed * es))
      } else {
        this.hp -= 1
      }
    }
  }
}
