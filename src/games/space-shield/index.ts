import { MixOperation } from "three"
import { random } from "../../utilities/math"
import { Mob } from "./classes/Mob"

export default async () => {
  const { THREE } = await import("../../utilities/three")
  const { Cameraman } = await import("../../utilities/three/Cameraman")
  const { GameLoop } = await import("../../utilities/three/GameLoop")
  const { Central } = await import("./classes/Central")
  const { GamePad } = await import("../../utilities/inputs/Gamepad")

  const scene = new THREE.Scene()
  const cameraman = new Cameraman(scene, 0, 10, 0)
  const controls = new Map()
  controls.set("KeyW", "KeyUp")
  controls.set("KeyW", "KeyUp")
  controls.set("KeyW", "KeyUp")
  for (let n = 0; n < 10; n++) {
    controls.set(`spawn${n}`, `Digit${n}`)
  }
  const pad = new GamePad(controls)

  const central = new Central()
  scene.add(central.mesh)
  const mobs: Mob[] = []

  const loop = new GameLoop()
  loop.play((es, dt) => {
    central.update(dt)
    cameraman.update(dt)
    checkSpawner()
    mobs.forEach((m) => {
      m.update(es)
      if (m.hp <= 0) {
      }
    })
  })

  function checkSpawner() {
    for (let n = 0; n < 10; n++) {
      if (pad.once(`spawn${n}`)) {
        console.log(`spawning mob #${n}`)
        const distance = 5
        const a = random(Math.PI * 2, 0, true)
        const x = Math.cos(a) * distance
        const z = Math.sin(a) * distance
        const mob = new Mob(x, z)
        mob.hp = 3 * n
        mob.speed = 0.0011 - 0.0001 * (n + 1)
        mobs.push(mob)
        mob.target = central
        mob.material.color.setHSL((n * Math.PI * 0.2) / 10, 1, 0.5)
        scene.add(mob.mesh)
      }
    }
  }
}
