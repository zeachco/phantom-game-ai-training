import { expect, test } from 'bun:test';
import { config } from '../src/games/climb/classes/Config';
import { PLAYER_HALF_W, Player } from '../src/games/climb/classes/Player';
import { Sensor } from '../src/games/climb/classes/Sensor';
import type { Platform, Tower } from '../src/games/climb/classes/Tower';
import { ControlType } from '../src/games/climb/types';

function towerWith(platforms: Platform[] = []): Tower {
  return {
    platforms,
    crossedSurface(x, halfW, prevFeet, feet) {
      let top = -1;
      for (const p of platforms) {
        if (p.y > prevFeet + 1e-6 || p.y <= feet - 1e-6) continue;
        if (x + halfW <= p.x || x - halfW >= p.x + p.w) continue;
        top = Math.max(top, p.y);
      }
      return top;
    },
    supportPlatform(x, halfW, feet, tolerance = 2) {
      return (
        platforms.find(
          (p) =>
            Math.abs(p.y - feet) <= tolerance &&
            x + halfW > p.x &&
            x - halfW < p.x + p.w,
        ) ?? null
      );
    },
  } as unknown as Tower;
}

test('a jump within the landing budget advances the combo and boosts strength', () => {
  const platform = { x: 0, y: 40, w: config.TOWER_WIDTH };
  const player = new Player(320, 40, ControlType.DUMMY, towerWith([platform]));
  player.controls.jump = 1;
  player.update(0);
  player.controls.jump = 0;
  for (let frame = 1; frame < 100 && !player.grounded; frame++)
    player.update(frame);

  expect(player.comboValue).toBe(1);
  player.controls.jump = 1;
  player.update(100);
  expect(player.comboValue).toBe(2);
  expect(player.vy).toBe(config.JUMP_SPEED * config.COMBO_JUMP_STRENGTH);
});

test('mid-air wall bounces add combo points and cap at x10', () => {
  // spawned off the ground, grounded cleared so every bounce is mid-air
  // (real spawns start on the ground, where the initial flag is correct)
  const player = new Player(
    PLAYER_HALF_W + 1,
    40,
    ControlType.DUMMY,
    towerWith(),
  );
  player.grounded = false;
  player.vx = -4;
  player.update(0);
  expect(player.comboValue).toBe(1);
  for (let i = 0; i < config.MAX_COMBO + 2; i++) {
    player.x = PLAYER_HALF_W + 1;
    player.vx = -4;
    player.update(i + 1);
  }
  expect(player.comboValue).toBe(config.MAX_COMBO);
});

test('a wall bounce while touching the ground does not build the combo', () => {
  const player = new Player(
    PLAYER_HALF_W + 1,
    0,
    ControlType.DUMMY,
    towerWith(),
  );
  player.vx = -4;
  player.update(0);
  expect(player.comboValue).toBe(0);
});

test('the combo is the final normalized neural input', () => {
  const sensor = new Sensor(1);
  sensor.update(320, 100, 0, 0, false, towerWith(), null, config.MAX_COMBO);
  expect(sensor.readings.at(-1)).toBe(1);
  sensor.update(320, 100, 0, 0, false, towerWith(), null, 2);
  expect(sensor.readings.at(-1)).toBe(2 / config.MAX_COMBO);
});
