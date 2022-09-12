import { THREE } from "./index";
export class GameLoop {
    clock = new THREE.Clock();
    play(loop) {
        const run = () => {
            requestAnimationFrame(run);
            const dt = this.clock.getDelta();
            const es = this.clock.getElapsedTime();
            loop(es, dt);
        };
        run();
    }
}
