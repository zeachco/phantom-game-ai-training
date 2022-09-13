import { MixOperation, Scene } from "three"
import { random } from "../../utilities/math"
import { Mob } from "./classes/Mob"

export default async () => {
  const { Cameraman } = await import("../../utilities/three/Cameraman.js");
  const { GameLoop } = await import("../../utilities/three/GameLoop.js");
  const { Central } = await import("./classes/Central.js");
  const { GamePad } = await import("../../utilities/inputs/Gamepad.js");

  const scene = new Scene()
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
    checkSpawner(es, dt)
    let i = 0
    while (i < mobs.length) {
      const mob = mobs[i]
      mob.update(es)
      if (mob.hp <= 0) {
        scene.remove(mob.mesh)
        mobs.splice(i, 1)
      } else {
        i++
      }
    }
  })

  function checkSpawner(es = 0, dt = 0) {
    for (let n = 0; n < 10; n++) {
      if (pad.once(`spawn${n}`) || !random(100)) {
        // console.log(`spawning mob #${n}`)
        const distance = 6
        const a = random(Math.PI * 2, 0, true)
        const x = Math.cos(a) * distance
        const z = Math.sin(a) * distance
        const hue = (n * Math.PI * 0.2) / 10
        const mob = new Mob(x, z)
        mob.hp = 3 * n
        mob.speed = 0.011 - 0.001 * (n + 1)
        mobs.push(mob)
        mob.target = central
        mob.material.color.setHSL(hue, 1, 0.5)
        scene.add(mob.mesh)
      }
    }
  }
}
