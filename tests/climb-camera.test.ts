import { expect, test } from 'bun:test';
import { climbCameraCenterY } from '../src/games/climb/camera';
import { PLAYER_HEIGHT } from '../src/games/climb/classes/Player';

const viewHeight = 400;
const playerY = 100;
const bodyCenterY = playerY + PLAYER_HEIGHT * 0.5;

test('centers the player body when vertical velocity is zero', () => {
  expect(climbCameraCenterY({ y: playerY, vy: 0 }, viewHeight)).toBe(
    bodyCenterY,
  );
});

test('ignores upward velocity when choosing the target', () => {
  expect(climbCameraCenterY({ y: playerY, vy: 20 }, viewHeight)).toBe(
    bodyCenterY,
  );
});

test('ignores downward velocity when choosing the target', () => {
  expect(climbCameraCenterY({ y: playerY, vy: -20 }, viewHeight)).toBe(
    bodyCenterY,
  );
});
