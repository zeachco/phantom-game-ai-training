import { expect, test } from 'bun:test';
import { NeuralNetwork } from '../src/ai/Network';

/**
 * The split view is pure canvas drawing, so the test runs the real visualizer
 * against a stub 2D context that records what got stroked and where.
 */
interface Recording {
  arcs: { x: number; y: number; radius: number; color: string }[];
  texts: string[];
}

function makeContext(width: number, height: number) {
  const recording: Recording = { arcs: [], texts: [] };
  let strokeStyle = 'none';
  const ctx = {
    canvas: { width, height },
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillStyle: '',
    get strokeStyle() {
      return strokeStyle;
    },
    set strokeStyle(value: string) {
      strokeStyle = value;
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    setTransform() {},
    setLineDash() {},
    clearRect() {},
    save() {},
    restore() {},
    fillRect() {},
    drawImage() {},
    arc(x: number, y: number, radius: number) {
      recording.arcs.push({ x, y, radius, color: strokeStyle });
    },
    stroke() {},
    fillText(text: string) {
      recording.texts.push(text);
    },
  };
  return { ctx, recording };
}

/** the browser bits the visualizer and its key pad touch on import */
function stubDom() {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      addEventListener: () => {},
      removeEventListener: () => {},
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => makeContext(0, 0).ctx,
      }),
    },
  });
  return {
    restore() {
      if (original) Object.defineProperty(globalThis, 'document', original);
      else Reflect.deleteProperty(globalThis, 'document');
    },
  };
}

/** two brains with the same sensors, the same controls and the same shape */
function brains() {
  const student = new NeuralNetwork(3, 2, 3);
  const guide = new NeuralNetwork(3, 2, 3);
  for (const net of [student, guide]) net.process([0.5, 0.25, 1]);
  return { student, guide };
}

test('a distilling brain is drawn next to its guide, with the output delta in red', async () => {
  const dom = stubDom();
  try {
    const { Visualizer } = await import('../src/ai/v2/Visualizer');
    const visualizer = new Visualizer({ MAX_NETWORK_LAYERS: 9 });
    visualizer.renderLines = false;
    const { student, guide } = brains();
    const { ctx, recording } = makeContext(800, 600);

    visualizer.renderNetwork(ctx, student, guide);

    const left = recording.arcs.filter((arc) => arc.x < 400);
    const right = recording.arcs.filter((arc) => arc.x > 400);
    const red = left.filter((arc) => arc.color === 'red');
    const leftNodes = left.filter((arc) => arc.color !== 'red');
    const rightNodes = right.filter((arc) => arc.color !== 'red');
    // both brains are on screen, side by side
    expect(leftNodes.length).toBeGreaterThan(0);
    expect(rightNodes.length).toBeGreaterThan(0);
    // and they are mirrored: same sensors, same controls, same rows
    expect(leftNodes.length).toBe(rightNodes.length);
    expect(leftNodes.map((arc) => Math.round(arc.y))).toEqual(
      rightNodes.map((arc) => Math.round(arc.y)),
    );

    // the red output deltas mirror each other on both output rows
    expect(red.length).toBeGreaterThan(0);
    expect(right.filter((arc) => arc.color === 'red').length).toBe(red.length);
    // they sit around the nodes, outside the socket rings
    const socketRadius = Math.min(...leftNodes.map((arc) => arc.radius));
    expect(red.every((arc) => arc.radius > socketRadius)).toBe(true);

    // the shared control labels are drawn once per brain
    expect(recording.texts.filter((text) => text === 'F').length).toBe(2);
  } finally {
    dom.restore();
  }
});

test('a brain training alone fills the canvas and draws no delta', async () => {
  const dom = stubDom();
  try {
    const { Visualizer } = await import('../src/ai/v2/Visualizer');
    const visualizer = new Visualizer({ MAX_NETWORK_LAYERS: 9 });
    visualizer.renderLines = false;
    const { student } = brains();
    const { ctx, recording } = makeContext(800, 600);

    visualizer.renderNetwork(ctx, student);

    expect(recording.arcs.some((arc) => arc.color === 'red')).toBe(false);
    // full width: the output row spans past the two half-width layouts
    const outputRow = recording.arcs.filter(
      (arc) =>
        Math.abs(arc.y - Math.min(...recording.arcs.map((a) => a.y))) < 1,
    );
    const spanX =
      Math.max(...outputRow.map((arc) => arc.x)) -
      Math.min(...outputRow.map((arc) => arc.x));
    expect(spanX).toBeGreaterThan(800 * 0.6);
  } finally {
    dom.restore();
  }
});
