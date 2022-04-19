import { THREE } from "../../utilities/three"
import { Cameraman } from "../../utilities/three/Cameraman.class"
import { Mob } from "./classes/Mob"
import { Path } from "./classes/Path"
import { Segment } from "./classes/Segment"
import map from "./maps/default"

export default () => {
  const paths = map.paths.map(
    (pathConfig) =>
      new Path(
        pathConfig.segments.map((waypoints) =>
          waypoints.map(([x, y]) => new Segment(x, y))
        )
      )
  )

  const scene = new THREE.Scene()
  const cameraman = new Cameraman(scene, 0, 10, 0)
  const { camera } = cameraman

  const mobs: Mob[] = []

  paths.forEach((path) => {
    for (var i = 0; i < 40; i++) {
      const mob = new Mob(path)
      scene.add(mob.mesh)
      mobs.push(mob)
    }

    path.forEach((s) => scene.add(s.mesh))
  })

  const clock = new THREE.Clock()

  function animate() {
    requestAnimationFrame(animate)

    // Apply matrix like this to rotate the camera.
    const es = clock.getElapsedTime() * 0.1 * Math.PI
    // camera.position.set(Math.cos(es) * 10, -10 + Math.sin(es) * 10, 25)

    // Make camera look at the box.
    camera.lookAt(0, 0, 0)

    cameraman.update()

    paths.forEach((path) => path.update())
    mobs.forEach((mob) => mob.update())
  }
  animate()
}
