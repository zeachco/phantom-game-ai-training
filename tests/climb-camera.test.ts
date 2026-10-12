import { expect, test } from 'bun:test';
import {
  CAMERA_VELOCITY_LOOKAHEAD,
  climbCameraCenterY,
} from '../src/games/climb/camera';
import { config } from '../src/games/climb/classes/Config';
import { PLAYER_HEIGHT } from '../src/games/climb/classes/Player';

const viewHeight = 400;
const playerY = 100;
const bodyCenterY = playerY + PLAYER_HEIGHT * 0.5;

test('centers the player body when vertical velocity is zero', () => {
  expect(climbCameraCenterY({ y: playerY, vy: 0 }, viewHeight)).toBe(
    bodyCenterY,
  );
});

test('looks up by 25% of the viewport at the fastest jump', () => {
  const maxJumpVelocity =
    config.JUMP_SPEED * Math.sqrt(config.MAX_JUMP_HEIGHT_MULTIPLIER);
  expect(
    climbCameraCenterY({ y: playerY, vy: maxJumpVelocity }, viewHeight),
  ).toBeCloseTo(bodyCenterY + viewHeight * CAMERA_VELOCITY_LOOKAHEAD);
});

test('looks down by 25% of the viewport at terminal fall speed', () => {
  expect(
    climbCameraCenterY({ y: playerY, vy: -config.TERMINAL_VELOCITY }, viewHeight),
  ).toBeCloseTo(bodyCenterY - viewHeight * CAMERA_VELOCITY_LOOKAHEAD);
});
