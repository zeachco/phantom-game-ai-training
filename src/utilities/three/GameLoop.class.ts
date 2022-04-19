import { THREE } from "../three"

export class GameLoop {
  clock: THREE.Clock = new THREE.Clock()

  play(loop: (es: number, delta: number) => void) {
    const run = () => {
      requestAnimationFrame(run)
      const dt = this.clock.getDelta()
      const es = this.clock.getElapsedTime() * 0.1 * Math.PI
      loop(es, dt)
    }
    run()
  }
}
