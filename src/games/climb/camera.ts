import { config } from './classes/Config';
import { PLAYER_HEIGHT } from './classes/Player';

/** The camera may look ahead by a quarter of the visible height at full speed. */
export const CAMERA_VELOCITY_LOOKAHEAD = 0.25;
/** Camera smoothing applied to the target position once per rendered frame. */
export const CAMERA_LERP = 0.12;

/**
 * Return the world-space y that should be at the centre of the viewport for a
 * player. Positive velocity looks upward and negative velocity looks downward.
 * The two directions use their respective maximum speeds, so either a full
 * jump impulse or a terminal fall reaches the same 25% look-ahead.
 */
export function climbCameraCenterY(
  player: Pick<{ y: number; vy: number }, 'y' | 'vy'>,
  viewHeight: number,
): number {
  const maxVelocity =
    player.vy >= 0
      ? config.JUMP_SPEED * Math.sqrt(config.MAX_JUMP_HEIGHT_MULTIPLIER)
      : config.TERMINAL_VELOCITY;
  const velocityFraction = Math.max(-1, Math.min(1, player.vy / maxVelocity));
  return (
    player.y +
    PLAYER_HEIGHT * 0.5 +
    velocityFraction * viewHeight * CAMERA_VELOCITY_LOOKAHEAD
  );
}
