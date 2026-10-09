import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { Ball } from './Ball';
import type { Cave, RadialHit } from './Cave';

/** Follow the ball itself. Smooth the orbit, never lag behind its position. */
export class ChaseCamera {
  private heading = new Vector3(0, 0, -1);
  private target = new Vector3();
  private offset = new Vector3();
  private candidate = new Vector3();
  private previousBall?: Ball;
  private previousPosition = new Vector3();
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

  update(camera: PerspectiveCamera, ball: Ball, cave: Cave, dt: number) {
    this.target.set(ball.x, ball.y + 0.5, ball.z);
    const reset =
      ball !== this.previousBall ||
      this.previousPosition.distanceToSquared(this.target) > 80 ** 2;
    const length = Math.hypot(ball.fx, ball.fz);
    if (length > 0.01) {
      // Interpolate angles so a 180-degree turn cannot collapse the offset
      // through the ball. World up keeps the view level over bumps.
      const wanted = Math.atan2(ball.fx, ball.fz);
      const current = Math.atan2(this.heading.x, this.heading.z);
      const difference = Math.atan2(
        Math.sin(wanted - current),
        Math.cos(wanted - current),
      );
      const angle = reset
        ? wanted
        : current + difference * (1 - Math.exp(-8 * dt));
      this.heading.set(Math.sin(angle), 0, Math.cos(angle));
    }
    this.previousBall = ball;
    this.previousPosition.copy(this.target);

    // Fit the whole ball even in a narrow viewport. Aim directly at it,
    // rather than at a distant tunnel point that can leave it off screen.
    const verticalFov = MathUtils.degToRad(72);
    const limitingFov = Math.min(
      verticalFov,
      2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect),
    );
    const vehicleRadius = ball.radius + 1.2;
    const minimumDistance = vehicleRadius + 2.5;
    const distance = Math.max(25, vehicleRadius / Math.sin(limitingFov / 2));
    this.offset.set(-this.heading.x, 0.28, -this.heading.z).normalize();
    let nearest = this.#clearance(cave, ball, this.offset, distance);
    if (nearest >= 0 && nearest < minimumDistance + 1) {
      // If the rear orbit is blocked, use a clear side or front view rather
      // than forcing the minimum follow distance through an obstacle.
      for (const angle of [-Math.PI / 2, Math.PI / 2, Math.PI]) {
        const x = -this.heading.x;
        const z = -this.heading.z;
        this.candidate.set(x * Math.cos(angle) - z * Math.sin(angle), 0.28, x * Math.sin(angle) + z * Math.cos(angle)).normalize();
        const clearance = this.#clearance(cave, ball, this.candidate, distance);
        if (clearance < 0 || clearance > nearest) {
          nearest = clearance;
          this.offset.copy(this.candidate);
          if (clearance < 0 || clearance >= minimumDistance + 1) break;
        }
      }
    }
    const actualDistance =
      nearest < 0 ? distance : Math.max(camera.near + 0.1, nearest - 1);
    camera.position
      .copy(this.target)
      .addScaledVector(this.offset, actualDistance);
    // A nearby wall pulls the camera in; widen the lens enough to retain the
    // whole ball instead of letting it fill or clip the viewport.
    const requiredFov = 2 * Math.asin(Math.min(0.95, (vehicleRadius + 0.5) / actualDistance));
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
    camera.lookAt(this.target);
    // If a rock or a wall leaves less than a ball length of room, the focused
    // ball can be drawn through that obstruction while retaining a view.
    return nearest >= 0 && nearest < minimumDistance + 1;
  }

  #clearance(cave: Cave, ball: Ball, offset: Vector3, distance: number) {
    const rock = cave.castWheelRay(this.target.x, this.target.y, this.target.z, offset.x, offset.y, offset.z, distance, ball.s, this.hit);
    const wall = cave.wallRayDistance(this.target.x, this.target.y, this.target.z, offset.x, offset.y, offset.z, distance, ball.s);
    return rock < 0 ? wall : wall < 0 ? rock : Math.min(rock, wall);
  }
}
