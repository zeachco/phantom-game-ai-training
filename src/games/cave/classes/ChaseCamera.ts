import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { Ball } from './Ball';
import type { Cave, RadialHit } from './Cave';
import { config } from './Config';

/** Blend the cave axis behind the ball toward it, then keep the view clear. */
export class ChaseCamera {
  private ballPosition = new Vector3();
  private cavePosition = new Vector3();
  private target = new Vector3();
  private focus = new Vector3();
  private caveCenter = new Vector3();
  private straightAhead = new Vector3();
  private viewDirection = new Vector3();
  private ballDirection = new Vector3();
  private offset = new Vector3();
  private hit: RadialHit = {
    s: 0,
    a: 0,
    dist: 0,
    nx: 0,
    ny: 0,
    nz: 0,
    hx: 0,
    hy: 0,
    hz: 0,
  };

  update(camera: PerspectiveCamera, ball: Ball, cave: Cave) {
    this.ballPosition.set(ball.x, ball.y, ball.z);
    this.target.set(ball.x, ball.y + 0.5, ball.z);
    const lookAhead =
      config.CAMERA_LOOK_AHEAD_SECTIONS * config.CAVE_SEGMENT_LENGTH;
    cave.centerAt(ball.s, this.caveCenter);
    cave.centerAt(ball.s + lookAhead, this.focus);
    cave.tangent(ball.s, this.straightAhead);
    this.straightAhead.y *= config.CAVE_VERTICAL_SCALE;
    this.straightAhead
      .normalize()
      .multiplyScalar(lookAhead)
      .add(this.caveCenter);
    // Amplify the bend relative to the local straight direction. A straight
    // tunnel keeps the same aim; its future horizontal and vertical curves
    // contribute three times their normal deviation.
    this.focus
      .sub(this.straightAhead)
      .multiplyScalar(config.CAMERA_CURVE_AMPLIFICATION)
      .add(this.straightAhead);

    // Fit the whole ball even in a narrow viewport.
    const verticalFov = MathUtils.degToRad(72);
    const limitingFov = Math.min(
      verticalFov,
      2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect),
    );
    const vehicleRadius = ball.radius + 1.2;
    const minimumDistance = vehicleRadius + 2.5;
    const behindDistance = Math.max(
      config.CAMERA_FOLLOW_DISTANCE,
      vehicleRadius /
        Math.sin(limitingFov / 2) /
        (1 - config.CAMERA_BALL_BLEND),
    );
    cave.centerAt(Math.max(0, ball.s - behindDistance), this.cavePosition);
    // This is a spatial blend, recalculated every frame: 80% cave center,
    // 20% ball position, with no delayed follow after jumps or respawns.
    this.cavePosition.lerp(this.ballPosition, config.CAMERA_BALL_BLEND);
    this.offset.copy(this.cavePosition).sub(this.target);
    const distance = this.offset.length();
    this.offset.normalize();
    // Keep the camera on this blended rear axis when an obstacle pulls it in.
    const nearest = this.#clearance(cave, ball, this.offset, distance);
    const actualDistance =
      nearest < 0 ? distance : Math.max(camera.near + 0.1, nearest - 1);
    camera.position
      .copy(this.target)
      .addScaledVector(this.offset, actualDistance);
    // A nearby wall pulls the camera in; widen the lens enough to retain the
    // whole ball instead of letting it fill or clip the viewport.
    this.viewDirection.copy(this.focus).sub(camera.position);
    this.ballDirection.copy(this.ballPosition).sub(camera.position);
    const requiredFov =
      2 *
      Math.min(
        MathUtils.degToRad(87.5),
        this.ballDirection.angleTo(this.viewDirection) +
          Math.asin(
            Math.min(0.95, (vehicleRadius + 0.5) / this.ballDirection.length()),
          ),
      );
    const fittedFov =
      camera.aspect < 1
        ? 2 * Math.atan(Math.tan(requiredFov / 2) / camera.aspect)
        : requiredFov;
    const fov = Math.max(72, MathUtils.radToDeg(fittedFov));
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(this.focus);
    // If a rock or a wall leaves less than a ball length of room, the focused
    // ball can be drawn through that obstruction while retaining a view.
    return nearest >= 0 && nearest < minimumDistance + 1;
  }

  #clearance(cave: Cave, ball: Ball, offset: Vector3, distance: number) {
    const rock = cave.castWheelRay(
      this.target.x,
      this.target.y,
      this.target.z,
      offset.x,
      offset.y,
      offset.z,
      distance,
      ball.s,
      this.hit,
    );
    const wall = cave.wallRayDistance(
      this.target.x,
      this.target.y,
      this.target.z,
      offset.x,
      offset.y,
      offset.z,
      distance,
      ball.s,
    );
    return rock < 0 ? wall : wall < 0 ? rock : Math.min(rock, wall);
  }
}
