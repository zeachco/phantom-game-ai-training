export class Ball {
  public vx: number = 0
  public vy: number = 0
  public acc = 1.001
  private color: string

  constructor(public x: number, public y: number, public size: number) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 3 + 2
    setTimeout(() => {
      this.vx = Math.cos(angle) * speed
      this.vy = Math.sin(angle) * speed
    }, Math.random() * 3000)
    const colorAngle = Math.round(Math.random() * 360)
    this.color = `hsl(${colorAngle}, 100%, 50%)`
  }

  render(ctx: CanvasRenderingContext2D) {
    this.x += this.vx
    this.y += this.vy

    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}
