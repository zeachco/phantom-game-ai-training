import { CircleGeometry, MeshMatcapMaterial, Mesh } from "three"

const geometry = new CircleGeometry(1, 8)
const material = new MeshMatcapMaterial({
  color: `rgba(255, 255, 255, .3)`,
  opacity: 0.8,
})

export class Central {
  public mesh: Mesh
  constructor() {
    this.mesh = new Mesh(geometry, material)
    this.mesh.rotation.set(Math.PI * 1.5, Math.PI * 0, Math.PI * 0)
  }
  update(delta: number) {
    this.mesh.rotation.z += Math.PI * 0.5 * delta
  }
}
