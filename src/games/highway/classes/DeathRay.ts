import { config } from './Config';

export class DeathRay {
  private speed = 0;
  private gradient;
  public y = 150;

  #createGradient(ctx) {
    this.gradient = ctx.createLinearGradient(0, 1, 0, 50);
    this.gradient.addColorStop(0, 'red');
    this.gradient.addColorStop(0.1, 'darkred');
    this.gradient.addColorStop(0.5, 'red');
    this.gradient.addColorStop(1, 'rgba(0, 0, 0, .6)');
    return this.gradient;
  }

  update() {
    this.speed += config.DEATH_SPEED;
    this.y -= this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // ctx.beginPath();
    // ctx.lineWidth = 4;
    // ctx.strokeStyle = 'red';
    ctx.save();
    ctx.translate(0, this.y);
    ctx.fillStyle = this.gradient || this.#createGradient(ctx);
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    // ctx.moveTo(0, this.y);
    // ctx.lineTo(ctx.canvas.width, this.y);
    // ctx.stroke();
  }
}
