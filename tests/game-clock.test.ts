import { describe, expect, test } from 'bun:test';
import {
  gameNow,
  isGamePaused,
  setGamePaused,
} from '../src/utilities/gameClock';

describe('gameClock', () => {
  test('game time freezes while paused and resumes without the gap', async () => {
    setGamePaused(true);
    expect(isGamePaused()).toBe(true);
    const frozen = gameNow();
    await Bun.sleep(30);
    expect(gameNow()).toBe(frozen);
    setGamePaused(false);
    expect(isGamePaused()).toBe(false);
    expect(gameNow() - frozen).toBeLessThan(15);
  });
});
