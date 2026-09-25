import type { Segment } from './Segment';

export class Path {
  constructor(public segments: Segment[] = []) {}

  public update() {
    for (const s of this.segments) s.update();
  }
}
