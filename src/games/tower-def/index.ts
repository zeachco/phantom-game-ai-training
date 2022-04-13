import { THREE } from "../../utilities/three"
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

const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
const cube = new THREE.Mesh(geometry, material)
scene.add(cube)

const sgeometry = new THREE.SphereGeometry()
const smaterial = new THREE.MeshBasicMaterial({
  color: 0xffff00,
  opacity: 0.5,
})

path.forEach((s) => {
  const mesh = new THREE.Mesh(sgeometry, smaterial)
  mesh.scale.set(0.2, 0.2, 0.02)
  mesh.position.x = s.x
  mesh.position.y = s.y
  scene.add(mesh)
})

camera.position.z = 5

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
  cube.rotation.x += 0.01
  cube.rotation.y += 0.01
}
animate()
