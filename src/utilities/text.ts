export class CtxTxt {
  public fontSize = 16;
  public lineSize = 1.1;
  public style = 'rgba(255, 255, 220, .75)';
  private py = 0;

  constructor(
    public ctx: CanvasRenderingContext2D,
    public x = 0,
    public y = 0,
  ) {
    this.reset();
  }

  reset() {
    this.py = this.y;
  }

  print(text = '', em = 1) {
    const { ctx, style, fontSize, lineSize } = this;
    ctx.save();
    ctx.font = `${fontSize * em}px Courier`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = style;
    ctx.fillText(text, this.x, this.py);
    this.py += fontSize * lineSize * em;
    ctx.restore();
    return this;
  }
}
