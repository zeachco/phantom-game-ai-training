import { config } from './Config';

export class DeathRay {
  private speed = 0;
  public y = 300;

  update() {
    this.speed += config.DEATH_SPEED;
    this.y -= this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'red';
    ctx.moveTo(0, this.y);
    ctx.lineTo(ctx.canvas.width, this.y);
    ctx.stroke();
  }
}
