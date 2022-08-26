import { Ball } from "./Ball";

export class CollisionBox {
  private collided = {} as { [key: number]: boolean };
  private collidedBlur = 0;
  public vx = 0;
  public vy = 0;

  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public hp = 20 + Math.round(Math.random() * 10)
  ) {}

  render(ctx: CanvasRenderingContext2D) {
    this.vx *= 0.9;
    this.vy *= 0.9;
    this.x += this.vx;
    this.y += this.vy;

    const collisions = Object.keys(this.collided).filter(
      (i) => this.collided[i]
    ).length;
    this.collidedBlur += collisions;
    this.collidedBlur *= 0.85;
    const w = this.width + this.collidedBlur;
    const h = this.height + this.collidedBlur;
    ctx.fillStyle = this.collided
      ? `hsla(${90 - this.hp / 20}, 50%, 50%, 90%)`
      : "#0000ff66";
    ctx.fillRect(this.x - w / 2, this.y - h / 2, w, h);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "#22222266";
    ctx.strokeRect(this.x - w / 2, this.y - h / 2, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.hp + "", this.x, this.y);
  }

  getCollitionNormal(ball: Ball, index) {
    var w = this.width / 2;
    var h = this.height / 2;
    var s = ball.size;

    const left = ball.x + s > this.x - w;
    const right = ball.x - s < this.x + w;
    const top = ball.y + s > this.y - h;
    const bot = ball.y - s < this.y + h;

    const offsetX = (ball.x - this.x) / this.width;
    const offsetY = (ball.y - this.y) / this.height;

    const collided = left && right && top && bot;

    this.collided[index] = collided;

    if (collided) {
      const directionX = Math.sign(offsetX) * 1.01;
      const directionY = Math.sign(offsetY) * 1.01;
      if (Math.abs(offsetX) >= 0.5) {
        // horizontal
        ball.vx = Math.abs(ball.vx) * directionX;
        ball.vx += this.vx / 10;
      } else if (Math.abs(offsetY) >= 0.5) {
        // vertical
        ball.vy = Math.abs(ball.vy) * directionY;
        ball.vy += this.vy / 10;
      }
      this.hp -= 1;
    }
    return { collided, offsetY, offsetX };
  }
}
