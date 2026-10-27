import { GamePad } from '../../utilities/inputs/Gamepad';
import { lerp } from '../../utilities/math';
import { MixedNetwork } from '../Mixed';
import { clampOutput, type Level, type NeuralNetwork } from '../Network';

const RADIUS = 14;
const MARGIN = Math.max(RADIUS, 10);
/** the clear band between the selector and expert halves of the mixed view */
const MIXED_GAP = RADIUS * 3;
const CONTROL_LABELS = ['F', 'L', 'R', 'B'];

const TAU = Math.PI * 2;
/** dash patterns are reused instead of rebuilt, setLineDash copies them anyway */
const LINK_DASH = [3, 2];
const NO_DASH: number[] = [];
const NO_LABELS: string[] = [];

/**
 * Link shades are quantized. A brain draws thousands of links and the canvas
 * has to parse a color and close the current path on every style change, so the
 * shades are precomputed once and the links sharing one are stroked together.
 */
const WEIGHT_STEPS = 48;
const WEIGHT_COLORS = new Array(WEIGHT_STEPS).fill(0).map((_step, i) => {
  const value = (i / (WEIGHT_STEPS - 1)) * 2 - 1;
  return `hsla(56, 100%, ${Math.round((value + 1) * 100)}%, ${Math.abs(
    value,
  )})`;
});
/** the opacity of a link is its weight, under that it never reaches a pixel */
const MIN_LINK_WEIGHT = 0.03;

interface BaseConfig {
  MAX_NETWORK_LAYERS: number;
}

/** where one level of a brain sits, recomputed when the canvas moves */
interface LevelLayout {
  level: Level;
  top: number;
  bottom: number;
  /** shrinks on narrow canvases so a full row of nodes fits without touching */
  radius: number;
  inputX: number[];
  outputX: number[];
  labels: string[];
}

const controls = new Map();
controls.set('KeyL', 'ToggleLines');
controls.set('KeyS', 'ToggleStats');

const pad = new GamePad(controls);

function weightBucket(weight: number) {
  const ratio = (Math.max(-1, Math.min(1, weight)) + 1) * 0.5;
  return Math.round(ratio * (WEIGHT_STEPS - 1));
}

function nodePositions(count: number, left: number, right: number) {
  const positions = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    positions[i] = lerp(left, right, count === 1 ? 0.5 : i / (count - 1));
  }
  return positions;
}

/** no values at all, a brain without that hidden row */
const NO_VALUES: number[] = [];

/** a radius that leaves a visible gap between the neighbours of one row */
function rowRadius(width: number, count: number) {
  if (count <= 1) return Math.min(RADIUS, Math.max(2, width * 0.4));
  return Math.min(RADIUS, (width / (count - 1)) * 0.35);
}

/** one hidden row of the distillation view: a trainee and a guide cluster side by side */
interface SplitHiddenRow {
  y: number;
  trainee: { x: number[]; radius: number; values: number[] };
  guide: { x: number[]; radius: number; values: number[] };
  /** the trainee level behind this row, for its mutation magnitudes */
  traineeLevelIndex: number | null;
}

/** `0`, `1`, ... reused across frames, a mixed brain relabels its experts on each one */
const indexLabelsCache: string[][] = [];
function indexLabels(count: number) {
  if (!indexLabelsCache[count]) {
    indexLabelsCache[count] = new Array(count)
      .fill(0)
      .map((_expert, i) => `${i}`);
  }
  return indexLabelsCache[count];
}

/** consecutive arcs of a path get joined by a line, each one moves first */
function traceCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  ctx.moveTo(x + radius, y);
  ctx.arc(x, y, radius, 0, TAU);
}

/**
 * The gauges of a whole row, stroked in two passes: nodes only differ by the
 * sign of their value and that sign is all their color says.
 */
function strokeGauges(
  ctx: CanvasRenderingContext2D,
  positions: number[],
  y: number,
  radius: number,
  values: number[],
  positiveColor: string,
  negativeColor: string,
  absolute: boolean,
) {
  for (let pass = 0; pass < 2; pass++) {
    const isPositive = pass === 0;
    let traced = false;
    ctx.beginPath();
    for (let i = 0; i < positions.length; i++) {
      const value = values[i];
      if (!value || value > 0 !== isPositive) continue;
      ctx.moveTo(positions[i] + radius, y);
      ctx.arc(
        positions[i],
        y,
        radius,
        0,
        TAU * (absolute ? Math.abs(value) : value),
      );
      traced = true;
    }
    if (!traced) continue;
    ctx.strokeStyle = isPositive ? positiveColor : negativeColor;
    ctx.stroke();
  }
}

/** one path per shade instead of one per link */
function drawLinks(ctx: CanvasRenderingContext2D, layout: LevelLayout) {
  const { level, inputX, outputX, bottom, radius } = layout;
  const top = layout.top + radius;
  const weights = level.weights;
  const buckets: number[][] = [];

  for (let i = 0; i < inputX.length; i++) {
    const row = weights[i];
    if (!row) continue;
    for (let j = 0; j < outputX.length; j++) {
      const weight = row[j];
      // an invisible link costs as much as a visible one, and they are the many
      if (!(Math.abs(weight) > MIN_LINK_WEIGHT)) continue;
      const bucket = weightBucket(weight);
      buckets[bucket] ??= [];
      buckets[bucket].push(i, j);
    }
  }

  for (let bucket = 0; bucket < buckets.length; bucket++) {
    const pairs = buckets[bucket];
    if (!pairs) continue;
    ctx.beginPath();
    for (let k = 0; k < pairs.length; k += 2) {
      ctx.moveTo(inputX[pairs[k]], bottom);
      ctx.lineTo(outputX[pairs[k + 1]], top);
    }
    ctx.strokeStyle = WEIGHT_COLORS[bucket];
    ctx.stroke();
  }
}

/**
 * The links of a brain only move when its weights do, which never happens
 * during a run: they are rasterized once and blitted on the frames that follow,
 * leaving only the activations to redraw.
 *
 * This freezes `lineDashOffset` on the links; animating it would mean
 * rasterizing thousands of dashed strokes again on every frame.
 */
class LinkLayer {
  /** room for the stroke width on both sides of the strip */
  static PAD = 2;

  #canvas = document.createElement('canvas');
  #ctx = this.#canvas.getContext('2d') as CanvasRenderingContext2D;
  #network: NeuralNetwork | undefined;
  #variant = '';
  #left = NaN;
  #width = 0;
  #height = 0;

  /** `variant` names the view the layouts belong to: the same brain is drawn
   *  at different places in the solo, mixed and split views */
  draw(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    layouts: LevelLayout[],
    left: number,
    width: number,
    variant = '',
  ) {
    const stripWidth = Math.ceil(width) + LinkLayer.PAD * 2;
    const stripHeight = ctx.canvas.height;
    if (stripWidth < 1 || stripHeight < 1) return;

    if (
      this.#network !== network ||
      this.#variant !== variant ||
      this.#left !== left ||
      this.#width !== stripWidth ||
      this.#height !== stripHeight
    ) {
      this.#rasterize(network, layouts, left, stripWidth, stripHeight, variant);
    }

    ctx.drawImage(this.#canvas, left - LinkLayer.PAD, 0);
  }

  #rasterize(
    network: NeuralNetwork,
    layouts: LevelLayout[],
    left: number,
    width: number,
    height: number,
    variant: string,
  ) {
    const ctx = this.#ctx;
    // assigning a size clears the strip and resets its context
    this.#canvas.width = width;
    this.#canvas.height = height;
    // the links are traced in the coordinates of the canvas they came from, the
    // strip is blitted back exactly where it was rasterized for
    ctx.setTransform(1, 0, 0, 1, LinkLayer.PAD - left, 0);
    ctx.lineWidth = 2;
    ctx.setLineDash(LINK_DASH);
    for (let i = 0; i < layouts.length; i++) drawLinks(ctx, layouts[i]);

    this.#network = network;
    this.#variant = variant;
    this.#left = left;
    this.#width = width;
    this.#height = height;
  }
}

export class Visualizer<T extends BaseConfig = BaseConfig> {
  public renderLines = true;
  public renderStats = true;

  /** the selector half and the expert half go stale on their own */
  #mainLinks = new LinkLayer();
  #expertLinks = new LinkLayer();
  /** the guide of a distilling brain is rasterized on its own strip */
  #guideLinks = new LinkLayer();
  /** a layout only depends on the network shape and the canvas size */
  #layoutCache = new WeakMap<NeuralNetwork, Map<string, LevelLayout[]>>();

  constructor(public config: T) {}

  /**
   * Draw a brain. `guide` is its teacher while it distils: the two are then
   * drawn back to back, trainee on the left and guide on the right, and the
   * red arc on the outputs is the live training error: how far the student's
   * applied answer is from the teacher's on the inputs being driven right now.
   */
  renderNetwork(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    guide: NeuralNetwork | null = null,
    errors: number[] | null = null,
  ) {
    if (pad.once('ToggleLines')) this.renderLines = !this.renderLines;
    if (pad.once('ToggleStats')) this.renderStats = !this.renderStats;

    // experts are shared between the mixed cars, replaying the last pass
    // puts back the activations of the brain we are about to draw
    if (network instanceof MixedNetwork) network.replay();
    if (guide instanceof MixedNetwork && guide.activeExpert) {
      // a guide mixed brain answers through the expert it routed to
      guide = guide.activeExpert;
    }

    this.#drawBrain(ctx, network, guide, errors);
  }

  /**
   * A regular brain fills the canvas. A mixed brain shows both halves of its
   * decision: the selector that reads the sensors on the left, the expert it
   * routed those same sensors to on the right.
   */
  #drawBrain(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    guide: NeuralNetwork | null,
    errors: number[] | null,
  ) {
    // distillation: one brain drawn as two. The sensors are the same, the
    // controls are the same, only the hidden neurons are split, trainee on the
    // left and guide on the right, and the outputs carry the red delta of what
    // the trainee has left to learn.
    if (guide) {
      // a mixed student answers through the expert it routed to, so that
      // expert is the trainee half: it is the pipeline whose controls the
      // student applies
      const trainee =
        network instanceof MixedNetwork
          ? (network.activeExpert ?? network)
          : network;
      this.#drawDistillationView(
        ctx,
        trainee,
        guide,
        errors,
        network instanceof MixedNetwork ? null : network.lastMutations,
      );
      return;
    }

    if (!(network instanceof MixedNetwork)) {
      const width = ctx.canvas.width - MARGIN * 2;
      return this.#drawNetwork(
        ctx,
        network,
        MARGIN,
        width,
        CONTROL_LABELS,
        this.#mainLinks,
      );
    }

    const expert = network.activeExpert;
    if (expert) this.#drawMixedView(ctx, network, expert);
  }

  /** The selector and its active expert read one shared sensor row, while
   * their distinct decisions remain on opposite sides of the center gap. */
  #drawMixedView(
    ctx: CanvasRenderingContext2D,
    selector: MixedNetwork,
    expert: NeuralNetwork,
  ) {
    const half = Math.max(1, (ctx.canvas.width - MARGIN * 2 - MIXED_GAP) / 2);
    const left = MARGIN;
    const right = left + half + MIXED_GAP;
    const sharedInputs = nodePositions(
      selector.levels[0]?.inputs.length ?? 0,
      MARGIN,
      ctx.canvas.width - MARGIN,
    );
    const selectorLayouts = this.#layout(
      ctx,
      selector,
      left,
      half,
      indexLabels(selector.experts.length),
    ).map((layout) => ({ ...layout }));
    const expertLayouts = this.#layout(
      ctx,
      expert,
      right,
      half,
      CONTROL_LABELS,
    ).map((layout) => ({ ...layout }));
    for (const layouts of [selectorLayouts, expertLayouts]) {
      const input = layouts[layouts.length - 1];
      if (input) {
        input.inputX = sharedInputs;
        input.bottom = ctx.canvas.height - MARGIN;
      }
    }
    if (this.renderLines) {
      // both brains share the full-width sensor row, so their links must be
      // rasterized across the whole canvas: a half-width strip clips every
      // link leaving that half toward a sensor on the other side
      this.#mainLinks.draw(
        ctx,
        selector,
        selectorLayouts,
        0,
        ctx.canvas.width,
        'mixed-selector',
      );
      this.#expertLinks.draw(
        ctx,
        expert,
        expertLayouts,
        0,
        ctx.canvas.width,
        'mixed-expert',
      );
    }
    this.#drawNodes(ctx, selectorLayouts, true);
    this.#drawNodes(ctx, expertLayouts, true);
    const first = selectorLayouts[selectorLayouts.length - 1];
    this.#drawRow(
      ctx,
      sharedInputs,
      first?.bottom ?? ctx.canvas.height - MARGIN,
      rowRadius(ctx.canvas.width - MARGIN * 2, sharedInputs.length),
      selector.levels[0]?.inputs ?? [],
      'rgba(0, 0, 0, 0.65)',
      'orange',
      'green',
      true,
    );
  }

  #drawNetwork(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    left: number,
    width: number,
    outputLabels: string[],
    links: LinkLayer,
    variant = '',
  ) {
    const layouts = this.#layout(ctx, network, left, width, outputLabels);
    if (this.renderLines)
      links.draw(ctx, network, layouts, left, width, variant);
    this.#drawNodes(ctx, layouts);
    return layouts;
  }

  #layout(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    left: number,
    width: number,
    outputLabels: string[],
  ): LevelLayout[] {
    const height = ctx.canvas.height - MARGIN * 2;
    const key = `${left}|${width}|${height}|${outputLabels.length}`;
    let byKey = this.#layoutCache.get(network);
    if (!byKey) {
      byKey = new Map();
      this.#layoutCache.set(network, byKey);
    }
    const cached = byKey.get(key);
    if (cached) return cached;

    const layouts = this.#buildLayout(
      network,
      left,
      width,
      height,
      outputLabels,
    );
    byKey.set(key, layouts);
    return layouts;
  }

  #buildLayout(
    network: NeuralNetwork,
    left: number,
    width: number,
    height: number,
    outputLabels: string[],
  ): LevelLayout[] {
    const top = MARGIN;
    const count = network.levels.length;
    const levelHeight = height / count;
    const right = left + width;
    const layouts: LevelLayout[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const level = network.levels[i];
      const levelTop =
        top +
        lerp(height - levelHeight, 0, count === 1 ? 0.5 : i / (count - 1));
      const nodes = Math.max(level.inputs.length, level.outputs.length);

      layouts.push({
        level,
        top: levelTop,
        bottom: levelTop + levelHeight,
        radius:
          nodes > 1
            ? Math.min(RADIUS, (width / (nodes - 1)) * 0.45)
            : Math.min(RADIUS, width * 0.4),
        inputX: nodePositions(level.inputs.length, left, right),
        outputX: nodePositions(level.outputs.length, left, right),
        labels: i === count - 1 ? outputLabels : NO_LABELS,
      });
    }

    return layouts;
  }

  /**
   * The only part that has to be redrawn on every frame: the activations.
   * Each node is one thin socket ring, and the arc around it is the gauge,
   * whole rows stroked in a single pass per sign.
   */
  #drawNodes(
    ctx: CanvasRenderingContext2D,
    layouts: LevelLayout[],
    skipFirstInputs = false,
  ) {
    ctx.setLineDash(NO_DASH);
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < layouts.length; i++) {
      const { level, top, bottom, radius, inputX, outputX, labels } =
        layouts[i];

      if (!(skipFirstInputs && i === layouts.length - 1)) {
        this.#drawRow(
          ctx,
          inputX,
          bottom,
          radius,
          level.inputs,
          'rgba(0, 0, 0, 0.65)',
          'orange',
          'green',
          true,
        );
      }
      this.#drawRow(
        ctx,
        outputX,
        top,
        radius,
        level.outputs,
        'rgba(255, 255, 255, 0.4)',
        '#def',
        '#86f',
        false,
        labels,
      );
    }
  }

  /** one row of sockets and their gauges, the unit every view is built from */
  #drawRow(
    ctx: CanvasRenderingContext2D,
    positions: number[],
    y: number,
    radius: number,
    values: number[],
    ringColor: string,
    positiveColor: string,
    negativeColor: string,
    absolute: boolean,
    labels: string[] = NO_LABELS,
  ) {
    ctx.beginPath();
    for (let n = 0; n < positions.length; n++) {
      traceCircle(ctx, positions[n], y, radius);
    }
    ctx.strokeStyle = ringColor;
    ctx.stroke();

    strokeGauges(
      ctx,
      positions,
      y,
      radius * (absolute ? 0.55 : 0.8),
      values,
      positiveColor,
      negativeColor,
      absolute,
    );

    if (!labels.length) return;
    ctx.font = `${Math.max(9, Math.round(radius))}px Arial`;
    ctx.fillStyle = 'white';
    for (let n = 0; n < positions.length; n++) {
      if (labels[n]) ctx.fillText(labels[n], positions[n], y + radius * 0.1);
    }
  }

  /**
   * The distillation view: a single brain-like diagram where the sensors and
   * the controls are shared and only the hidden layers are split, the trainee
   * on the left and the guide on the right of every hidden row. Both brains
   * keep their own links (sensors to their first hidden row, their hidden rows
   * to each other, their last hidden row to the shared controls).
   */
  #drawDistillationView(
    ctx: CanvasRenderingContext2D,
    trainee: NeuralNetwork,
    guide: NeuralNetwork,
    errors: number[] | null,
    mutations: number[][] | null,
  ) {
    const layout = this.#splitLayout(ctx, trainee, guide);
    ctx.setLineDash(NO_DASH);
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.renderLines) {
      this.#mainLinks.draw(
        ctx,
        trainee,
        layout.traineeLevels,
        MARGIN,
        ctx.canvas.width - MARGIN * 2,
        'split',
      );
      this.#guideLinks.draw(
        ctx,
        guide,
        layout.guideLevels,
        MARGIN,
        ctx.canvas.width - MARGIN * 2,
        'split',
      );
    }

    // the shared sensor row, read by both brains
    this.#drawRow(
      ctx,
      layout.inputs,
      layout.inputY,
      layout.inputRadius,
      trainee.levels[0]?.inputs ?? [],
      'rgba(0, 0, 0, 0.65)',
      'orange',
      'green',
      true,
    );

    // every hidden row holds two clusters: trainee left, guide right
    for (const row of layout.hiddenRows) {
      this.#drawRow(
        ctx,
        row.trainee.x,
        row.y,
        row.trainee.radius,
        row.trainee.values,
        'rgba(255, 255, 255, 0.4)',
        '#def',
        '#86f',
        false,
      );
      if (mutations && row.traineeLevelIndex !== null) {
        this.#drawMutations(
          ctx,
          row.trainee.x,
          row.y,
          row.trainee.radius,
          mutations[row.traineeLevelIndex] ?? [],
        );
      }
      this.#drawRow(
        ctx,
        row.guide.x,
        row.y,
        row.guide.radius,
        row.guide.values,
        'rgba(255, 255, 255, 0.4)',
        '#dfd',
        '#6d6',
        false,
      );
    }

    // the shared control row, answered by both brains
    const last = trainee.levels[trainee.levels.length - 1];
    this.#drawRow(
      ctx,
      layout.outputs,
      layout.outputY,
      layout.outputRadius,
      last?.outputs ?? [],
      'rgba(255, 255, 255, 0.4)',
      '#def',
      '#86f',
      false,
      CONTROL_LABELS,
    );
    if (mutations) {
      this.#drawMutations(
        ctx,
        layout.outputs,
        layout.outputY,
        layout.outputRadius,
        mutations[trainee.levels.length - 1] ?? [],
      );
    }

    // the live training error on the controls; the clamped answer gap is the
    // fallback for a view drawn outside a training step
    if (errors) {
      this.#drawErrorArcs(
        ctx,
        layout.outputs,
        layout.outputY,
        layout.outputRadius,
        errors,
      );
    } else {
      this.#drawOutputDeltas2(
        ctx,
        layout.outputs,
        layout.outputY,
        layout.outputRadius,
        last?.outputs ?? [],
        guide.levels[guide.levels.length - 1]?.outputs ?? [],
      );
    }
  }

  /**
   * The merged layout: rows are sensors at the bottom, controls at the top and
   * the hidden rows in between. A brain with fewer hidden layers starts closer
   * to the controls, so both last hidden rows sit next to the outputs they
   * feed. Hidden clusters are spaced inside their half so a wide layer never
   * overlaps its neighbour.
   */
  #splitLayout(
    ctx: CanvasRenderingContext2D,
    trainee: NeuralNetwork,
    guide: NeuralNetwork,
  ) {
    const left = MARGIN;
    const width = Math.max(1, ctx.canvas.width - MARGIN * 2);
    const height = Math.max(1, ctx.canvas.height - MARGIN * 2);
    const traineeHidden = Math.max(0, trainee.levels.length - 1);
    const guideHidden = Math.max(0, guide.levels.length - 1);
    const hiddenRowsNb = Math.max(1, traineeHidden, guideHidden);
    const rowsNb = hiddenRowsNb + 2;
    const step = height / (rowsNb - 1);
    const yOf = (row: number) => MARGIN + height - row * step;

    const center = left + width / 2;
    const splitGap = Math.max(MARGIN, width * 0.06);
    const traineeLeft = left;
    const traineeRight = center - splitGap;
    const guideLeft = center + splitGap;
    const guideRight = left + width;

    const inputsNb = Math.max(
      trainee.levels[0]?.inputs.length ?? 0,
      guide.levels[0]?.inputs.length ?? 0,
    );
    const lastTrainee = trainee.levels[trainee.levels.length - 1];
    const lastGuide = guide.levels[guide.levels.length - 1];
    const outputsNb = Math.max(
      lastTrainee?.outputs.length ?? 0,
      lastGuide?.outputs.length ?? 0,
    );
    const inputRadius = rowRadius(width, inputsNb);
    const outputRadius = rowRadius(width, outputsNb);
    const inputs = nodePositions(
      inputsNb,
      left + inputRadius,
      left + width - inputRadius,
    );
    const outputs = nodePositions(
      outputsNb,
      left + outputRadius,
      left + width - outputRadius,
    );

    // the hidden row index of a brain, aligned to the top of the hidden block
    const rowOf = (hiddenIndex: number, hiddenNb: number) =>
      hiddenRowsNb - hiddenNb + hiddenIndex;

    /** a hidden row of one brain: values, positions and a radius that fits */
    const cluster = (
      values: number[],
      clusterLeft: number,
      clusterRight: number,
      radius: number,
    ) => ({
      x: nodePositions(
        values.length,
        clusterLeft + radius,
        clusterRight - radius,
      ),
      radius,
      values,
    });

    const hiddenRows: SplitHiddenRow[] = [];
    for (let row = 1; row <= hiddenRowsNb; row++) {
      const traineeLevelIndex = row - (hiddenRowsNb - traineeHidden) - 1;
      const traineeLevel = trainee.levels[traineeLevelIndex];
      const guideLevel = guide.levels[row - (hiddenRowsNb - guideHidden) - 1];
      const traineeValues = traineeLevel ? traineeLevel.outputs : NO_VALUES;
      const guideValues = guideLevel ? guideLevel.outputs : NO_VALUES;
      // one node size per row, so the two clusters read as the same layer
      const radius = Math.min(
        rowRadius(traineeRight - traineeLeft, traineeValues.length),
        rowRadius(guideRight - guideLeft, guideValues.length),
      );
      hiddenRows.push({
        y: yOf(row),
        trainee: cluster(traineeValues, traineeLeft, traineeRight, radius),
        guide: cluster(guideValues, guideLeft, guideRight, radius),
        traineeLevelIndex: traineeLevel ? traineeLevelIndex : null,
      });
    }

    const rowsAt = (
      net: NeuralNetwork,
      hiddenNb: number,
      xOf: (hiddenIndex: number) => number[],
    ): LevelLayout[] =>
      net.levels.map((level, i) => {
        const isFirst = i === 0;
        const isLast = i === net.levels.length - 1;
        const inputRow = isFirst
          ? { y: yOf(0), x: inputs }
          : {
              y: yOf(rowOf(i, hiddenNb)),
              x: xOf(i),
            };
        const outputRow = isLast
          ? { y: yOf(rowsNb - 1), x: outputs }
          : { y: yOf(rowOf(i + 1, hiddenNb)), x: xOf(i + 1) };
        return {
          level,
          top: outputRow.y,
          bottom: inputRow.y,
          radius: inputRadius,
          inputX: inputRow.x,
          outputX: outputRow.x,
          labels: NO_LABELS,
        };
      });

    const traineeX = (hiddenIndex: number) =>
      hiddenRows[rowOf(hiddenIndex, traineeHidden) - 1].trainee.x;
    const guideX = (hiddenIndex: number) =>
      hiddenRows[rowOf(hiddenIndex, guideHidden) - 1].guide.x;

    return {
      inputs,
      inputY: yOf(0),
      inputRadius,
      outputs,
      outputY: yOf(rowsNb - 1),
      outputRadius,
      hiddenRows,
      traineeLevels: rowsAt(trainee, traineeHidden, traineeX),
      guideLevels: rowsAt(guide, guideHidden, guideX),
    };
  }

  /**
   * The live training error, drawn in red around the shared outputs: one arc
   * per control, its sweep is how far the student's applied answer is from
   * the teacher's on the inputs being driven right now, one direction for an
   * error above, the other for below.
   */
  #drawErrorArcs(
    ctx: CanvasRenderingContext2D,
    positions: number[],
    y: number,
    radius: number,
    errors: number[],
  ) {
    // just outside the socket ring, so the arc is readable next to the node
    const arcRadius = Math.max(5, radius * 1.25);
    ctx.setLineDash(NO_DASH);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'red';
    for (let i = 0; i < positions.length; i++) {
      const error = errors[i] ?? 0;
      if (!Number.isFinite(error) || Math.abs(error) < 0.01) continue;
      const sweep = TAU * Math.max(-1, Math.min(1, error));
      ctx.beginPath();
      ctx.arc(positions[i], y, arcRadius, -Math.PI / 2, -Math.PI / 2 + sweep);
      ctx.stroke();
    }
  }

  /**
   * Which nodes the last backprop step actually moved: a red halo around each
   * mutated node, the more weight it lost the more solid the red.
   */
  #drawMutations(
    ctx: CanvasRenderingContext2D,
    positions: number[],
    y: number,
    radius: number,
    magnitudes: number[],
  ) {
    const haloRadius = radius * 1.5;
    ctx.setLineDash(NO_DASH);
    ctx.lineWidth = 3;
    for (let i = 0; i < positions.length; i++) {
      const magnitude = magnitudes[i] ?? 0;
      if (!Number.isFinite(magnitude) || magnitude < 1e-6) continue;
      // a node that moved 0.05 of weight in one step is fully red
      const intensity = Math.max(0.15, Math.min(1, magnitude / 0.05));
      ctx.strokeStyle = `rgba(255, 40, 40, ${intensity})`;
      ctx.beginPath();
      ctx.arc(positions[i], y, haloRadius, 0, TAU);
      ctx.stroke();
    }
  }

  /**
   * The gap between the two answers, drawn in red around the shared outputs:
   * an arc whose sweep is how far the guide's answer is, one direction for a
   * target above the current value, the other one for below.
   */
  #drawOutputDeltas2(
    ctx: CanvasRenderingContext2D,
    positions: number[],
    y: number,
    radius: number,
    outputs: number[],
    target: number[],
  ) {
    // just outside the socket ring, so the arc is readable next to the node
    const arcRadius = Math.max(5, radius * 1.25);
    ctx.setLineDash(NO_DASH);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'red';
    for (let i = 0; i < positions.length; i++) {
      // what the games apply, so the gap reads like the difference it is
      const delta = clampOutput(target[i] ?? 0) - clampOutput(outputs[i] ?? 0);
      if (!Number.isFinite(delta) || Math.abs(delta) < 0.01) continue;
      const sweep = TAU * Math.max(-1, Math.min(1, delta));
      ctx.beginPath();
      ctx.arc(positions[i], y, arcRadius, -Math.PI / 2, -Math.PI / 2 + sweep);
      ctx.stroke();
    }
  }
}
