import { PLAYER_HEIGHT } from './classes/Player';

/** Kept as a compatibility export; camera targeting no longer predicts from
 * vertical velocity. */
export const CAMERA_VELOCITY_LOOKAHEAD = 0;
/** Camera smoothing applied to the target position once per rendered frame. */
export const CAMERA_LERP = 0.25;

/**
 * Return the world-space y that should be at the centre of the viewport for a
 * player. Targeting follows location only; vertical velocity never makes the
 * camera lead or lag in a direction of travel.
 */
export function climbCameraCenterY(
  player: Pick<{ y: number }, 'y'>,
  _viewHeight?: number,
): number {
  return player.y + PLAYER_HEIGHT * 0.5;
}
