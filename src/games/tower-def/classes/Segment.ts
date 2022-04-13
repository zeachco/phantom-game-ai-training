export class Segment {
  constructor(public x: number, public y: number, public range = 10) {}
  public isInRange(x: number, y: number) {
    return Math.sqrt(this.x - x + (this.y - y)) < this.range
  }
}
