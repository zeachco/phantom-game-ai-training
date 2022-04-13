import { random } from "../../../utilities/math"
import { Segment } from "./Segment"

export class Path {
  private index = 0
  constructor(public segments: Segment[][] = []) {}
  public getNext() {
    const nextSegments = this.segments[this.index++]
    return nextSegments[random(nextSegments.length - 1)]
  }

  public mount() {}

  public forEach(cb: (Segment) => void) {
    this.segments.forEach((segments) => segments.forEach(cb))
  }
}
