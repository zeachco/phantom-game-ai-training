import { Clock } from 'three';
import { isGamePaused } from '../gameClock';

export interface GameLoopOptions {
  /** When set, frames are skipped until this interval has elapsed. */
  maxFps?: number;
  /** Enables the cap dynamically without stopping the animation loop. */
  shouldCap?: () => boolean;
}

export class GameLoop {
  clock: Clock = new Clock();

  /**
   * `paused` is true while the game is paused: the simulation must not step,
   * but cameras and rendering keep updating on the frozen scene, so the loop
   * still runs every frame with a zero delta.
   */
  play(
    loop: (es: number, delta: number, paused: boolean) => void,
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
      if (isGamePaused()) {
        // Halted: drain the clock so resuming does not feed the whole pause
        // in as one giant delta. The loop still runs, with a zero delta, so
        // cameras keep tracking and the frozen scene keeps rendering.
        this.clock.getDelta();
        loop(0, 0, true);
        return;
      }
      const dt = this.clock.getDelta();
      const es = this.clock.getElapsedTime();
      loop(es, dt, false);
    };
    // Preserve the old eager first tick; later ticks are driven by RAF.
    run(performance.now());
  }
}
