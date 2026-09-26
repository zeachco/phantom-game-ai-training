import type { Vector } from '../../../utilities/math';

/**
 * A gate across the road, claimed in order one per lap. The order is what
 * keeps a car from farming: a donut in the open plane never reaches the next
 * gate, only the loop does.
 */
export class Checkpoint {
  /** bounding box of the gate line, static, rejects crossing tests early */
  public minX: number;
  public minY: number;
  public maxX: number;
  public maxY: number;

  constructor(
    public x: number,
    public y: number,
    public a: Vector,
    public b: Vector,
    public index: number,
  ) {
    this.minX = Math.min(a.x, b.x);
    this.minY = Math.min(a.y, b.y);
    this.maxX = Math.max(a.x, b.x);
    this.maxY = Math.max(a.y, b.y);
  }

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

    if (next) {
      // the gate's number, small and unbacked, only for the focused car
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${this.index}`, this.x, this.y - 14);
    }
  }
}
