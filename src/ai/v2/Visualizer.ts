import { roundRect } from '../../utilities/canvas';
import { blendColorScale, getColorScale } from '../../utilities/colors';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { lerp } from '../../utilities/math';
import { Level, NeuralNetwork } from '../Network';
import { OrchestratorNetwork } from '../Orchestrator';

const RADIUS = 14;
const MARGIN = Math.max(RADIUS, 10);
const FH = 18;
const CONTROL_LABELS = ['F', 'L', 'R', 'B'];
/** bars height plus the row of expert indexes under them */
const SELECTION_HEIGHT = FH * 4;

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
    positions[i] = lerp(left, right, count == 1 ? 0.5 : i / (count - 1));
  }
  return positions;
}

/** `0`, `1`, ... reused across frames, an orchestrator relabels its experts on each one */
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
      const pairs = buckets[bucket] || (buckets[bucket] = []);
      pairs.push(i, j);
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
  /** a layout only depends on the network shape and the canvas size */
  #layoutCache = new WeakMap<NeuralNetwork, Map<string, LevelLayout[]>>();

  constructor(public config: T) {}

  render(ctx: CanvasRenderingContext2D, network: NeuralNetwork) {
    if (pad.once('ToggleLines')) this.renderLines = !this.renderLines;
    if (pad.once('ToggleStats')) this.renderStats = !this.renderStats;

    // experts are shared between the orchestrator cars, replaying the last pass
    // puts back the activations of the brain we are about to draw
    if (network instanceof OrchestratorNetwork) network.replay();

    this.#drawBrain(ctx, network);

    if (this.renderStats) this.#drawStats(ctx, network);
  }

  #layerColor(layer: number) {
    return getColorScale(layer / this.config.MAX_NETWORK_LAYERS);
  }

  /** the accent an orchestrator car wears: its brains weighted by usage */
  #blendedColor(network: OrchestratorNetwork) {
    const shares = network.selectionShares;
    return blendColorScale(
      network.expertLayers.map((layer, i) => ({
        ratio: layer / this.config.MAX_NETWORK_LAYERS,
        weight: shares[i],
      })),
    );
  }

  #createCursor(ctx: CanvasRenderingContext2D, width: number, fontHeight = FH) {
    return function print(text: string, height = fontHeight) {
      ctx.font = height + 'px Arial';
      ctx.fillText(text, 0, 0, width);
      ctx.translate(0, height);
    };
  }

  /**
   * A regular brain fills the canvas. An orchestrator shows both halves of its
   * decision: the selector that reads the sensors on the left, the expert it
   * routed those same sensors to on the right.
   */
  #drawBrain(ctx: CanvasRenderingContext2D, network: NeuralNetwork) {
    if (!(network instanceof OrchestratorNetwork)) {
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

  /**
   * One bar per expert, filled with the share of the run it has been driving.
   * Drawn from the current origin, centered on it.
   */
  #drawSelection(
    ctx: CanvasRenderingContext2D,
    network: OrchestratorNetwork,
    width: number,
  ) {
    const shares = network.selectionShares;
    const height = SELECTION_HEIGHT - FH;
    const barWidth = width / shares.length;
    const left = width * -0.5;

    ctx.save();
    ctx.setLineDash(NO_DASH);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'hanging';
    ctx.font = `${RADIUS * 0.7}px Arial`;
    network.expertLayers.forEach((layer, i) => {
      // each bar wears the color of its brain, so the blended car accent can be
      // read straight off the distribution
      const color = this.#layerColor(layer);
      const isActive = i === network.selectedIndex;
      const x = left + i * barWidth;
      ctx.globalAlpha = isActive ? 1 : 0.45;
      ctx.fillStyle = color;
      ctx.fillRect(
        x + 1,
        height * (1 - shares[i]),
        barWidth - 2,
        height * shares[i],
      );
      ctx.fillText(`${i}`, x + barWidth * 0.5, height + 2);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  #drawStats(ctx: CanvasRenderingContext2D, network: NeuralNetwork) {
    const orchestrator =
      network instanceof OrchestratorNetwork ? network : undefined;
    const lines = [`Network ${network.id}`];

    if (network.mutationIndex === 0) {
      lines.push('Original model');
    } else {
      lines.push(`Mutation ${(network.mutationFactor * 100).toFixed(4)}%`);
      lines.push(`MutationIndex ${network.mutationIndex}`);
    }
    lines.push(`Score ${Math.round(network.score)}`);

    if (orchestrator) {
      const expert = orchestrator.activeExpert;
      lines.push(
        `Driving #${orchestrator.selectedIndex} of ${orchestrator.experts.length}`,
      );
      const slot = orchestrator.expertIds[orchestrator.selectedIndex];
      lines.push(`Expert ${slot || '?'} ${expert ? expert.id : 'none'}`);
      lines.push(`Switches ${orchestrator.switches}`);
    }

    // the usage bars live inside the panel, the canvas around it is taken by
    // the two networks
    const barsHeight = orchestrator ? SELECTION_HEIGHT : 0;
    const pWidth = Math.min(200, ctx.canvas.width * 0.6);
    /** the lines are squeezed to the content box, not to the border */
    const contentWidth = pWidth - MARGIN * 2;
    const levelColor = orchestrator
      ? this.#blendedColor(orchestrator)
      : this.#layerColor(network.levels.length);
    const print = this.#createCursor(ctx, contentWidth);
    ctx.save();
    ctx.setLineDash(NO_DASH);
    ctx.translate(ctx.canvas.width * 0.5 + MARGIN, MARGIN * 2);
    ctx.strokeStyle = levelColor;
    ctx.fillStyle = 'rgba(32, 32, 32, .76)';
    roundRect(
      ctx,
      pWidth * -0.5,
      0,
      pWidth,
      lines.length * FH + barsHeight + MARGIN * 2,
      MARGIN,
      true,
    );
    ctx.translate(0, MARGIN);
    ctx.fillStyle = levelColor;
    ctx.textBaseline = 'hanging';
    ctx.textAlign = 'center';
    lines.forEach((line) => print(line));
    if (orchestrator) this.#drawSelection(ctx, orchestrator, contentWidth);
    ctx.restore();
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

    const layouts = this.#buildLayout(network, left, width, height, outputLabels);
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
        top + lerp(height - levelHeight, 0, count == 1 ? 0.5 : i / (count - 1));
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
        labels: i == count - 1 ? outputLabels : NO_LABELS,
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
      const { level, top, bottom, radius, inputX, outputX, labels } = layouts[i];

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
      ctx.font = Math.max(9, Math.round(radius)) + 'px Arial';
      ctx.fillStyle = 'white';
      for (let n = 0; n < outputX.length; n++) {
        if (labels[n]) {
          ctx.fillText(labels[n], outputX[n], top + radius * 0.1);
        }
      }
    }
  }
}
