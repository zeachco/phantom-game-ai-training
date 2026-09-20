import type { AABB, Vector } from '../../../utilities/math';

export type ObstacleShape = 'circle' | 'wall';

const OBSTACLE_FILL = '#666';
const OBSTACLE_OUTLINE = '#fff';
const OBSTACLE_ACCENT = '#e33';
const CIRCLE_SIDES = 24;

/**
 * A solid obstacle on the road. It never moves, so its polygon and box are
 * built once in the constructor and reused by the damage check and the rays.
 * Circles use a polygon approximation for collision and sensor consistency,
 * while their canvas rendering remains round.
 */
export class Obstacle {
  public polygon: Vector[];
  public aabb: AABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  constructor(
    public x: number,
    public y: number,
    public angle: number,
    public width: number,
    public height: number,
    public shape: ObstacleShape,
  ) {
    const sides = shape === 'circle' ? CIRCLE_SIDES : 4;
    this.polygon = new Array(sides).fill(0).map(() => ({ x: 0, y: 0 }));
    this.#corners();
  }

  /** same rotation convention as the car's polygon */
  #corners() {
    const sa = Math.sin(this.angle);
    const ca = Math.cos(this.angle);
    const hw = this.width / 2;
    const hh = this.height / 2;
    const local =
      this.shape === 'circle'
        ? this.polygon.map((_point, i) => {
            const a = (i / this.polygon.length) * Math.PI * 2;
            return [Math.cos(a) * hw, Math.sin(a) * hh];
          })
        : [
            [-hw, -hh],
            [hw, -hh],
            [hw, hh],
            [-hw, hh],
          ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < this.polygon.length; i++) {
      const px = local[i][0];
      const py = local[i][1];
      const point = this.polygon[i];
      point.x = this.x + px * ca + py * sa;
      point.y = this.y - px * sa + py * ca;
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }
    const box = this.aabb;
    box.minX = minX;
    box.minY = minY;
    box.maxX = maxX;
    box.maxY = maxY;
  }

  #path(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    if (this.shape === 'circle') {
      ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);

    this.#path(ctx);
    ctx.fillStyle = OBSTACLE_FILL;
    ctx.fill();

    this.#path(ctx);
    ctx.strokeStyle = OBSTACLE_OUTLINE;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.stroke();

    // The offset passes alternate white and red dots, making obstacles stand
    // out against both the gray road and the dark plane.
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 6]);
    ctx.lineDashOffset = 0;
    ctx.strokeStyle = OBSTACLE_OUTLINE;
    ctx.stroke();
    ctx.lineDashOffset = 4;
    ctx.strokeStyle = OBSTACLE_ACCENT;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    ctx.restore();
  }
}
