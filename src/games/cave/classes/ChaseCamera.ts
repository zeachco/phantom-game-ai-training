import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { Car } from './Car';
import { config } from './Config';
import type { Cave, RadialHit } from './Cave';

/** Follow the chassis itself. Smooth the orbit, never lag behind its position. */
export class ChaseCamera {
  private heading = new Vector3(0, 0, -1);
  private target = new Vector3();
  private offset = new Vector3();
  private previousCar?: Car;
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

  update(camera: PerspectiveCamera, car: Car, cave: Cave, dt: number) {
    this.target.set(car.x, car.y + 0.5, car.z);
    const reset =
      car !== this.previousCar ||
      this.previousPosition.distanceToSquared(this.target) > 80 ** 2;
    const length = Math.hypot(car.fx, car.fz);
    if (length > 0.01) {
      // Interpolate angles so a 180-degree turn cannot collapse the offset
      // through the car. World up keeps the view level over bumps and rolls.
      const wanted = Math.atan2(car.fx, car.fz);
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
    this.previousCar = car;
    this.previousPosition.copy(this.target);

    // Fit the entire vehicle even in a narrow viewport. Aim directly at it,
    // rather than at a distant tunnel point that can leave it off screen.
    const verticalFov = MathUtils.degToRad(72);
    const limitingFov = Math.min(
      verticalFov,
      2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect),
    );
    const vehicleRadius = Math.hypot(
      car.width / 2 + 0.7,
      config.SUSP_REST + config.CAR_WHEEL_RADIUS + 1.1,
      car.length / 2 + 0.95,
    );
    const minimumDistance = vehicleRadius + 2.5;
    const distance = Math.max(25, vehicleRadius / Math.sin(limitingFov / 2));
    this.offset.set(-this.heading.x, 0.28, -this.heading.z).normalize();
    const obstruction = cave.castWheelRay(
      this.target.x,
      this.target.y,
      this.target.z,
      this.offset.x,
      this.offset.y,
      this.offset.z,
      distance,
      car.s,
      this.hit,
    );
    const actualDistance =
      obstruction < 0 ? distance : Math.max(minimumDistance, obstruction - 1);
    camera.position
      .copy(this.target)
      .addScaledVector(this.offset, actualDistance);
    // A nearby wall pulls the camera in; widen the lens enough to retain the
    // whole chassis instead of letting the car fill or clip the viewport.
    const requiredFov =
      2 * Math.asin(Math.min(0.95, vehicleRadius / actualDistance));
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
    // If a rock leaves less than a car length of room, the focused car can
    // be drawn through that obstruction while retaining a usable camera view.
    return obstruction >= 0 && obstruction < minimumDistance + 1;
  }
}
