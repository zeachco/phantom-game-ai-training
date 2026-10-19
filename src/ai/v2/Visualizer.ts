import { layerColor, mixedNetworkColor } from '../../utilities/ai/colors';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { lerp } from '../../utilities/math';
import { MixedNetwork } from '../Mixed';
import type { Level, NeuralNetwork } from '../Network';

const RADIUS = 14;
const MARGIN = Math.max(RADIUS, 10);
const FH = 18;
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
  #left = NaN;
  #width = 0;
  #height = 0;

  draw(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    layouts: LevelLayout[],
    left: number,
    width: number,
  ) {
    const stripWidth = Math.ceil(width) + LinkLayer.PAD * 2;
    const stripHeight = ctx.canvas.height;
    if (stripWidth < 1 || stripHeight < 1) return;

    if (
      this.#network !== network ||
      this.#left !== left ||
      this.#width !== stripWidth ||
      this.#height !== stripHeight
    ) {
      this.#rasterize(network, layouts, left, stripWidth, stripHeight);
    }

    ctx.drawImage(this.#canvas, left - LinkLayer.PAD, 0);
  }

  #rasterize(
    network: NeuralNetwork,
    layouts: LevelLayout[],
    left: number,
    width: number,
    height: number,
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
   * drawn back to back, trainee on the left and guide on the right, and the red
   * arc on the outputs is how far the guide would have answered from the
   * trainee.
   */
  renderNetwork(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    guide: NeuralNetwork | null = null,
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

    this.#drawBrain(ctx, network, guide);
  }

  #layerColor(layer: number) {
    return layerColor(layer, this.config.MAX_NETWORK_LAYERS);
  }

  /** the accent a mixed car wears: its brains weighted by usage */
  #blendedColor(network: MixedNetwork) {
    return mixedNetworkColor(
      network,
      this.config.MAX_NETWORK_LAYERS,
      '#808080',
    );
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
  ) {
    // distillation: the same sensors and the same controls, drawn twice. Only
    // the hidden neurons differ, so the two halves mirror each other and the
    // outputs carry the red delta of what the trainee has left to learn.
    if (guide && !(network instanceof MixedNetwork)) {
      const half = (ctx.canvas.width - MARGIN * 3) / 2;
      const trainee = this.#drawNetwork(
        ctx,
        network,
        MARGIN,
        half,
        CONTROL_LABELS,
        this.#mainLinks,
      );
      const trained = this.#drawNetwork(
        ctx,
        guide,
        MARGIN * 2 + half,
        half,
        CONTROL_LABELS,
        this.#guideLinks,
      );
      this.#drawOutputDeltas(ctx, trainee, trained);
      this.#drawOutputDeltas(ctx, trained, trainee);
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

    const half = (ctx.canvas.width - MARGIN * 3) / 2;
    const expertLabels = indexLabels(network.experts.length);
    this.#drawNetwork(
      ctx,
      network,
      MARGIN,
      half,
      expertLabels,
      this.#mainLinks,
    );

    const expert = network.activeExpert;
    if (expert) {
      this.#drawNetwork(
        ctx,
        expert,
        MARGIN * 2 + half,
        half,
        CONTROL_LABELS,
        this.#expertLinks,
      );
    }
  }

  #drawNetwork(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    left: number,
    width: number,
    outputLabels: string[],
    links: LinkLayer,
  ) {
    const layouts = this.#layout(ctx, network, left, width, outputLabels);
    if (this.renderLines) links.draw(ctx, network, layouts, left, width);
    this.#drawNodes(ctx, layouts);
    return layouts;
  }

  /**
   * The gap between the two answers, drawn in red around `from`'s outputs: an
   * arc whose sweep is how far the target's output is, one direction for a
   * target above the current value, the other one for below.
   */
  #drawOutputDeltas(
    ctx: CanvasRenderingContext2D,
    trainee: LevelLayout[],
    guide: LevelLayout[],
  ) {
    const mine = trainee[0];
    const theirs = guide[0];
    if (!mine || !theirs) return;
    const outputs = mine.level.outputs;
    const target = theirs.level.outputs;
    // just outside the socket ring, so the arc is readable next to the node
    const radius = Math.max(5, mine.radius * 1.25);

    ctx.setLineDash(NO_DASH);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'red';
    for (let i = 0; i < mine.outputX.length; i++) {
      const delta = (target[i] ?? 0) - (outputs[i] ?? 0);
      if (!Number.isFinite(delta) || Math.abs(delta) < 0.01) continue;
      const sweep = TAU * Math.max(-1, Math.min(1, delta));
      ctx.beginPath();
      ctx.arc(
        mine.outputX[i],
        mine.top,
        radius,
        -Math.PI / 2,
        -Math.PI / 2 + sweep,
      );
      ctx.stroke();
    }
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
  #drawNodes(ctx: CanvasRenderingContext2D, layouts: LevelLayout[]) {
    ctx.setLineDash(NO_DASH);
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < layouts.length; i++) {
      const { level, top, bottom, radius, inputX, outputX, labels } =
        layouts[i];

      ctx.beginPath();
      for (let n = 0; n < inputX.length; n++) {
        traceCircle(ctx, inputX[n], bottom, radius);
      }
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.stroke();

      strokeGauges(
        ctx,
        inputX,
        bottom,
        radius * 0.55,
        level.inputs,
        'orange',
        'green',
        true,
      );

      ctx.beginPath();
      for (let n = 0; n < outputX.length; n++) {
        traceCircle(ctx, outputX[n], top, radius);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

      strokeGauges(
        ctx,
        outputX,
        top,
        radius * 0.8,
        level.outputs,
        '#def',
        '#86f',
        false,
      );

      if (!labels.length) continue;
      ctx.font = `${Math.max(9, Math.round(radius))}px Arial`;
      ctx.fillStyle = 'white';
      for (let n = 0; n < outputX.length; n++) {
        if (labels[n]) {
          ctx.fillText(labels[n], outputX[n], top + radius * 0.1);
        }
      }
    }
  }
}
