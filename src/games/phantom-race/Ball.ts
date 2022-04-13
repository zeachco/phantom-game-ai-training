export class Ball {
  public vx: number
  public vy: number
  public acc = 1.001

  constructor(public x: number, public y: number, public size: number) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 3 + 2
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
  }

  render(ctx: CanvasRenderingContext2D) {
    this.x += this.vx
    this.y += this.vy

    ctx.fillStyle = "#ff000088"
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}
