import { config } from './Config';

export class DeathRay {
  private speed = 0;
  private gradient;
  public y = 150;

  #createGradient(ctx) {
    this.gradient = ctx.createLinearGradient(0, 1, 0, 100);
    this.gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    this.gradient.addColorStop(0.1, 'rgba(255, 0, 0, 1)');
    this.gradient.addColorStop(0.2, 'rgba(255, 255, 0, .5)');
    this.gradient.addColorStop(0.5, 'rgba(255, 0, 0, .6)');
    this.gradient.addColorStop(1, 'rgba(0, 0, 0, .6)');
    return this.gradient;
  }

  update() {
    this.speed += config.DEATH_SPEED;
    this.y -= this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(0, this.y);
    ctx.fillStyle = this.gradient || this.#createGradient(ctx);
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
}
