import { Ball } from "./Ball"

export class CollisionBox {
  private collided = false

  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number
  ) {}

  render(ctx) {
    ctx.fillStyle = this.collided ? "#ff0000" : "#0000ff"
    ctx.fillRect(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height
    )
  }

  getCollitionNormal(ball: Ball) {
    var w = this.width / 2
    var h = this.height / 2
    var s = ball.size / 2

    // collide
    const offsetX = ball.x - this.x
    const offsetY = ball.y - this.y

    const left = offsetX > -w - s
    const top = offsetX > -h - s
    const right = offsetX < w + s
    const bot = offsetX < -h + s

    // console.log({ left, right, top, bot })
    this.collided = left && right && top && bot
  }
}
