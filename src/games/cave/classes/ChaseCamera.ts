import { PerspectiveCamera, Vector3 } from 'three';
import type { Ball } from './Ball';
import { config } from './Config';

/** Translate with the ball while keeping a fixed offset, aim and lens. */
export class ChaseCamera {
  private target = new Vector3();

  update(camera: PerspectiveCamera, ball: Ball) {
    camera.position.set(
      ball.x,
      ball.y + config.CAMERA_FOLLOW_HEIGHT,
      ball.z + config.CAMERA_FOLLOW_DISTANCE,
    );
    this.target.set(ball.x, ball.y + 0.5, ball.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.target);
  }
}
