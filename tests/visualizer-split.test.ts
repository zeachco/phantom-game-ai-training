import { expect, test } from 'bun:test';
import { NeuralNetwork } from '../src/ai/Network';

/**
 * The distillation view is pure canvas drawing, so the test runs the real
 * visualizer against a stub 2D context that records what got stroked and where.
 */
interface Recording {
  arcs: { x: number; y: number; radius: number; color: string }[];
  texts: { text: string; x: number; y: number }[];
}

function makeContext(width: number, height: number) {
  const recording: Recording = { arcs: [], texts: [] };
  let strokeStyle = 'none';
  let fillStyle = '';
  const ctx = {
    canvas: { width, height },
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string) {
      fillStyle = value;
    },
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
    fillText(text: string, x: number, y: number) {
      recording.texts.push({ text, x, y });
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

async function visualizer() {
  const { Visualizer } = await import('../src/ai/v2/Visualizer');
  const instance = new Visualizer({ MAX_NETWORK_LAYERS: 9 });
  instance.renderLines = false;
  return instance;
}

/** rows of a recording, top row first, grouped by their y */
function rows(recording: Recording) {
  const byY = new Map<number, Recording['arcs']>();
  for (const arc of recording.arcs) {
    const key = Math.round(arc.y);
    const row = byY.get(key) ?? [];
    row.push(arc);
    byY.set(key, row);
  }
  return [...byY.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, arcs]) => ({ y, arcs }));
}

/** the sockets of a row: every node also strokes a smaller gauge arc, and the
 *  biggest arcs of a row are the sockets */
function sockets(row: { arcs: Recording['arcs'] }) {
  const nodes = row.arcs.filter((arc) => arc.color !== 'red');
  const radius = Math.max(...nodes.map((arc) => arc.radius));
  return nodes.filter((arc) => Math.abs(arc.radius - radius) < 1e-6);
}

test('a distilling brain shares its sensors and controls, only hidden rows split', async () => {
  const dom = stubDom();
  try {
    const viz = await visualizer();
    const trainee = new NeuralNetwork(4, 3, 3);
    const guide = new NeuralNetwork(4, 3, 4);
    for (const net of [trainee, guide]) net.process([0.5, 0.25, 1, 0]);
    const { ctx, recording } = makeContext(800, 600);

    viz.renderNetwork(ctx, trainee, guide);

    const drawn = rows(recording);
    // sensors row, three hidden rows (the guide is one layer deeper), controls
    expect(drawn.length).toBe(5);

    const controls = drawn[0];
    const hidden = drawn.slice(1, drawn.length - 1);
    const sensors = drawn[drawn.length - 1];
    const center = 400;
    const spanX = (arcs: Recording['arcs']) =>
      Math.max(...arcs.map((arc) => arc.x)) -
      Math.min(...arcs.map((arc) => arc.x));

    // the sensors are one shared row of four, across the whole width
    expect(sockets(sensors).length).toBe(4);
    expect(spanX(sockets(sensors))).toBeGreaterThan(800 * 0.7);
    // the controls are one shared row of three, also across the whole width
    expect(sockets(controls).length).toBe(3);
    expect(spanX(sockets(controls))).toBeGreaterThan(800 * 0.7);
    // both are drawn once, not once per brain
    expect(recording.texts.filter((text) => text.text === 'F').length).toBe(1);

    // the hidden rows carry two clusters: trainee left, guide right
    const leftCount = (row: { arcs: Recording['arcs'] }) =>
      sockets(row).filter((arc) => arc.x < center - 20).length;
    const rightCount = (row: { arcs: Recording['arcs'] }) =>
      sockets(row).filter((arc) => arc.x > center + 20).length;
    // the guide fills every hidden row on the right
    expect(hidden.map(rightCount)).toEqual([3, 3, 3]);
    // the trainee has one hidden layer less: it sits next to the outputs it
    // feeds, leaving the deepest row to the guide
    expect(hidden.map(leftCount)).toEqual([3, 3, 0]);
    expect(leftCount(hidden[2])).toBe(0);

    // the red output delta is one arc per differing control, on the shared row
    const red = recording.arcs.filter((arc) => arc.color === 'red');
    expect(red.length).toBeGreaterThan(0);
    expect(
      red.every((arc) => Math.round(arc.y) === Math.round(controls.y)),
    ).toBe(true);
  } finally {
    dom.restore();
  }
});

test('hidden clusters leave a gap instead of overlapping', async () => {
  const dom = stubDom();
  try {
    const viz = await visualizer();
    // wide hidden layers are where nodes used to collide
    const trainee = new NeuralNetwork(4, 2, 3);
    const guide = new NeuralNetwork(4, 2, 3);
    // a dense first hidden row: 24 nodes on each side
    for (const net of [trainee, guide]) {
      net.levels[0].outputs = new Array(24).fill(0.5);
      net.process([0.5, 0.25, 1, 0]);
    }
    const { ctx, recording } = makeContext(800, 600);

    viz.renderNetwork(ctx, trainee, guide);

    const hiddenRow = rows(recording)[2];
    const left = hiddenRow.arcs.filter((arc) => arc.x < 400);
    const right = hiddenRow.arcs.filter((arc) => arc.x > 400);
    expect(left.length).toBeGreaterThan(20);
    expect(right.length).toBeGreaterThan(20);

    const gaps = (arcs: Recording['arcs']) => {
      const xs = [...new Set(arcs.map((arc) => arc.x))].sort((a, b) => a - b);
      let smallest = Infinity;
      for (let i = 1; i < xs.length; i++)
        smallest = Math.min(smallest, xs[i] - xs[i - 1]);
      return {
        smallest,
        radius: Math.max(...arcs.map((arc) => arc.radius)),
      };
    };
    for (const cluster of [left, right]) {
      const { smallest, radius } = gaps(cluster);
      // neighbouring nodes are more than two radii apart: a visible gap
      expect(smallest).toBeGreaterThan(radius * 2);
    }
    // the two clusters never touch across the middle
    expect(Math.max(...left.map((arc) => arc.x)) + 2 * 5).toBeLessThan(
      Math.min(...right.map((arc) => arc.x)),
    );
  } finally {
    dom.restore();
  }
});

test('a brain training alone fills the canvas and draws no delta', async () => {
  const dom = stubDom();
  try {
    const viz = await visualizer();
    const network = new NeuralNetwork(3, 2, 3);
    network.process([0.5, 0.25, 1]);
    const { ctx, recording } = makeContext(800, 600);

    viz.renderNetwork(ctx, network);

    expect(recording.arcs.some((arc) => arc.color === 'red')).toBe(false);
    // full width: the output row spans past half the canvas
    const topRow = rows(recording)[0].arcs;
    const spanX =
      Math.max(...topRow.map((arc) => arc.x)) -
      Math.min(...topRow.map((arc) => arc.x));
    expect(spanX).toBeGreaterThan(800 * 0.6);
  } finally {
    dom.restore();
  }
});
