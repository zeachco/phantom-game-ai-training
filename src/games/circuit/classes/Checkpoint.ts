import { Vector } from '../../../utilities/math';

/**
 * A gate across the road, claimed in order one per lap. The order is what
 * keeps a car from farming: a donut in the open plane never reaches the next
 * gate, only the loop does.
 */
export class Checkpoint {
  constructor(
    public x: number,
    public y: number,
    public a: Vector,
    public b: Vector,
  ) {}

  /** the followed car's next gate pulses, the rest stay faint */
  draw(ctx: CanvasRenderingContext2D, next: boolean) {
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    if (next) {
      const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 250);
      ctx.strokeStyle = `rgba(255, 220, 0, ${pulse})`;
      ctx.lineWidth = 6;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2;
    }
    ctx.stroke();
  }
}
