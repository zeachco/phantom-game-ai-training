import { randInt } from "../../../utilities/math";
import { Segment } from "./Segment";

export class Path {
  constructor(public segments: Segment[][] = []) {}

  public getNext(index: number) {
    const nextSegments = this.segments[index];
    if (!nextSegments) return null;
    return nextSegments[randInt(0, nextSegments.length - 1)];
  }

  public forEach(cb: (Segment) => void) {
    this.segments.forEach((segments) => segments.forEach(cb));
  }

  public update() {
    this.forEach((seg) => seg.update());
  }
}
