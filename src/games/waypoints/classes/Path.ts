import { Segment } from './Segment';

export class Path {
  constructor(public segments: Segment[] = []) {}

  public update() {
    this.segments.forEach((s) => s.update());
  }
}
