import { type PerspectiveCamera, Vector3 } from 'three';
import type { Ball } from './Ball';
import type { Cave } from './Cave';
import { config } from './Config';

/** Translate with the ball while keeping a fixed offset, aim and lens. */
export class ChaseCamera {
  private target = new Vector3();
  private boom = new Vector3();

  update(camera: PerspectiveCamera, ball: Ball, cave?: Cave) {
    // Behind is the negated forward tangent, flattened to the world horizontal
    // plane. A fixed +Z offset would sit beside or in front of the ball
    // wherever the tunnel runs laterally. Fall back to velocity, then +Z, so
    // the direction stays defined at a standstill.
    let bx = -ball.fx;
    let bz = -ball.fz;
    let length = Math.hypot(bx, bz);
    if (length < 1e-4) {
      bx = -ball.vx;
      bz = -ball.vz;
      length = Math.hypot(bx, bz);
    }
    if (length < 1e-4) {
      bx = 0;
      bz = 1;
      length = 1;
    }
    bx /= length;
    bz /= length;

    this.boom.set(
      bx * config.CAMERA_FOLLOW_DISTANCE,
      config.CAMERA_FOLLOW_HEIGHT,
      bz * config.CAMERA_FOLLOW_DISTANCE,
    );
    const boomLength = this.boom.length();
    let reach = boomLength;
    // Shorten the boom when rock lies between the camera and the ball, so a
    // narrowing tunnel cannot hide the ball behind a wall.
    if (cave) {
      const hit = cave.castRay(
        ball.x,
        ball.y,
        ball.z,
        this.boom.x / boomLength,
        this.boom.y / boomLength,
        this.boom.z / boomLength,
        boomLength,
        ball.s,
        ball.fx,
        ball.fy,
        ball.fz,
      );
      if (hit >= 0) reach = Math.max(1, hit - config.CAMERA_COLLISION_MARGIN);
    }
    const scale = reach / boomLength;
    camera.position.set(
      ball.x + this.boom.x * scale,
      ball.y + this.boom.y * scale,
      ball.z + this.boom.z * scale,
    );
    this.target.set(ball.x, ball.y + 0.5, ball.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.target);
  }
}
