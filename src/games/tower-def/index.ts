import { random } from "../../utilities/math"
import { THREE } from "../../utilities/three"
import { Mob } from "./classes/Mob"
import { Path } from "./classes/Path"
import { Segment } from "./classes/Segment"

const path = new Path([
  [new Segment(-4, 0)],
  [new Segment(-3, -2), new Segment(-2, 2), new Segment(-1, -2)],
  [new Segment(-1, -2)],
  [new Segment(0, 1), new Segment(0, 0)],
  [new Segment(3, 2)],
])

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const mobs: Mob[] = []

for (var i = 0; i < 30; i++) {
  const mob = new Mob(random(-7, -5), random(-2, 2))
  scene.add(mob.mesh)
  mobs.push(mob)
}

path.forEach((s) => scene.add(s.mesh))

camera.position.z = 15

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
  path.render()
  mobs.forEach((mob) => mob.update())
}
animate()
