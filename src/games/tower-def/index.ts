import { THREE } from "../../utilities/three"
import { Mob } from "./classes/Mob"
import { Path } from "./classes/Path"
import { Segment } from "./classes/Segment"
import map from "./maps/default"

export default () => {
  const paths = map.paths.map(
    (pathConfig) =>
      new Path(
        pathConfig.segments.map((waypoints) => {
          console.log({ waypoints })
          return waypoints.map(([x, y]) => new Segment(x, y))
        })
      )
  )

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

  paths.forEach((path) => {
    for (var i = 0; i < 40; i++) {
      const mob = new Mob(path)
      scene.add(mob.mesh)
      mobs.push(mob)
    }

    path.forEach((s) => scene.add(s.mesh))
  })

  camera.position.z = 20

  function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
    paths.forEach((path) => path.update())
    mobs.forEach((mob) => mob.update())
  }
  animate()
}
