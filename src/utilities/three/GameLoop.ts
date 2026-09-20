import { Clock } from 'three';

export interface GameLoopOptions {
  /** When set, frames are skipped until this interval has elapsed. */
  maxFps?: number;
  /** Enables the cap dynamically without stopping the animation loop. */
  shouldCap?: () => boolean;
}

export class GameLoop {
  clock: Clock = new Clock();

  play(
    loop: (es: number, delta: number) => void,
    options: GameLoopOptions = {},
  ) {
    const interval = options.maxFps ? 1000 / options.maxFps : 0;
    let lastCappedFrame = performance.now();
    const run = (now: number) => {
      requestAnimationFrame(run);
      if (
        interval > 0 &&
        options.shouldCap?.() &&
        now - lastCappedFrame < interval
      ) {
        return;
      }
      lastCappedFrame = now;
      const dt = this.clock.getDelta();
      const es = this.clock.getElapsedTime();
      loop(es, dt);
    };
    // Preserve the old eager first tick; later ticks are driven by RAF.
    run(performance.now());
  }
}
