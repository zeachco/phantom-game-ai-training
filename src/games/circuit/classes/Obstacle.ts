import { AABB, Vector, rand } from '../../../utilities/math';

const COLORS = ['#d96a2b', '#8a4a2a', '#b23a3a'];

/**
 * A solid block on the road. It never moves, so the polygon and its box are
 * built once in the constructor and reused by the damage check and the rays.
 */
export class Obstacle {
  public width: number;
  public height: number;
  public color: string;
  public polygon: Vector[] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  public aabb: AABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  constructor(
    public x: number,
    public y: number,
    public angle: number,
  ) {
    this.width = rand(24, 48);
    this.height = rand(20, 50);
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.#corners();
  }

  /** same rotation convention as the car's polygon */
  #corners() {
    const sa = Math.sin(this.angle);
    const ca = Math.cos(this.angle);
    const hw = this.width / 2;
    const hh = this.height / 2;
    const local = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 4; i++) {
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

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(-this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}
