/**
 * Pause-aware game time. `gameNow()` is `performance.now()` minus the time
 * spent paused, so lap timers, lifetime caps, corpse fades and seed countdowns
 * freeze with the game instead of elapsing behind the PAUSED overlay.
 */
let pausedAt: number | null = null;
let pausedTotal = 0;

export function gameNow(): number {
  return (pausedAt ?? performance.now()) - pausedTotal;
}

export function isGamePaused(): boolean {
  return pausedAt !== null;
}

export function setGamePaused(paused: boolean): void {
  if (paused === isGamePaused()) return;
  if (paused) pausedAt = performance.now();
  else {
    pausedTotal += performance.now() - (pausedAt ?? performance.now());
    pausedAt = null;
  }
}
