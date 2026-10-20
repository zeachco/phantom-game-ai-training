import { describe, expect, test } from 'bun:test';
import { GameLoop } from '../src/utilities/three/GameLoop';
import { setGamePaused } from '../src/utilities/gameClock';

// bun's test env has no requestAnimationFrame; drive the loop with timers
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16)) as unknown as typeof requestAnimationFrame;
}

describe('GameLoop', () => {
  test('keeps calling the loop with a zero delta while paused', async () => {
    const calls: Array<[es: number, dt: number, paused: boolean]> = [];
    new GameLoop().play((es, dt, paused) => {
      calls.push([es, dt, paused]);
    });

    await Bun.sleep(80);
    const unpaused = calls.filter(([, , paused]) => !paused);
    expect(unpaused.length).toBeGreaterThan(0);

    setGamePaused(true);
    await Bun.sleep(80);
    const pausedCalls = calls.filter(([, , paused]) => paused);
    // the loop does not halt: cameras and rendering keep their frames
    expect(pausedCalls.length).toBeGreaterThan(0);
    expect(
      pausedCalls.every(([es, dt]) => es === 0 && dt === 0),
    ).toBe(true);

    setGamePaused(false);
    await Bun.sleep(80);
    const after = calls.filter(([, , paused]) => !paused).slice(
      unpaused.length,
    );
    expect(after.length).toBeGreaterThan(0);
    // resuming must not feed the whole pause in as one giant delta
    expect(Math.max(...after.map(([, dt]) => dt))).toBeLessThan(0.2);
  });
});
