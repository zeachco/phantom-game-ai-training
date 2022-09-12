import { random } from "../../../utilities/math";
export class Path {
    segments;
    constructor(segments = []) {
        this.segments = segments;
    }
    getNext(index) {
        const nextSegments = this.segments[index];
        if (!nextSegments)
            return null;
        return nextSegments[random(nextSegments.length - 1)];
    }
    forEach(cb) {
        this.segments.forEach((segments) => segments.forEach(cb));
    }
    update() {
        this.forEach((seg) => seg.update());
    }
}
