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

interface BaseConfig {
  MAX_NETWORK_LAYERS: number;
}

const controls = new Map();
controls.set('KeyV', 'ToggleRender');
controls.set('KeyL', 'ToggleLines');
controls.set('KeyS', 'ToggleStats');

const pad = new GamePad(controls);

export class Visualizer<T extends BaseConfig = BaseConfig> {
  public renderEnable = false;
  public renderLines = true;
  public renderStats = true;

  constructor(public config: T) { }

  render(ctx: CanvasRenderingContext2D, network: NeuralNetwork) {
    if (pad.once('ToggleRender')) this.renderEnable = !this.renderEnable;
    if (pad.once('ToggleLines')) {
      this.renderLines = !this.renderLines;
      this.renderEnable = true;
    }
    if (pad.once('ToggleStats')) this.renderStats = !this.renderStats;

    // experts are shared between the orchestrator cars, replaying the last pass
    // puts back the activations of the brain we are about to draw
    if (network instanceof OrchestratorNetwork) network.replay();

    if (this.renderEnable) this.#drawBrain(ctx, network);
    else this.#rederHelp(ctx);

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

  #getColor(value) {
    return `hsla(56, 100%, ${Math.round((value + 1) * 100)}%, ${Math.abs(
      value,
    )})`;
  }

  #createCursor(ctx: CanvasRenderingContext2D, fontHeight = FH, width = 200) {
    return function print(text: string, height = fontHeight) {
      ctx.font = height + 'px Arial';
      ctx.fillText(text, 0, 0, width);
      ctx.translate(0, height);
    }
  }

  /**
   * A regular brain fills the canvas. An orchestrator shows both halves of its
   * decision: the selector that reads the sensors on the left, the expert it
   * routed those same sensors to on the right.
   */
  #drawBrain(ctx: CanvasRenderingContext2D, network: NeuralNetwork) {
    if (!(network instanceof OrchestratorNetwork)) {
      const width = ctx.canvas.width - MARGIN * 2;
      return this.#drawNetwork(ctx, network, MARGIN, width, CONTROL_LABELS);
    }

    const half = (ctx.canvas.width - MARGIN * 3) / 2;
    const expertLabels = network.experts.map((_expert, i) => `${i}`);
    this.#drawNetwork(ctx, network, MARGIN, half, expertLabels);

    const expert = network.activeExpert;
    if (expert) {
      this.#drawNetwork(ctx, expert, MARGIN * 2 + half, half, CONTROL_LABELS);
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
    ctx.setLineDash([]);
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
      lines.push(`Driving #${orchestrator.selectedIndex} of ${orchestrator.experts.length}`);
      const slot = orchestrator.expertIds[orchestrator.selectedIndex];
      lines.push(`Expert ${slot || '?'} ${expert ? expert.id : 'none'}`);
      lines.push(`Switches ${orchestrator.switches}`);
    }

    // the usage bars live inside the panel, the canvas around it is taken by
    // the two networks
    const barsHeight = orchestrator ? SELECTION_HEIGHT : 0;
    const pWidth = 200;
    const levelColor = orchestrator
      ? this.#blendedColor(orchestrator)
      : this.#layerColor(network.levels.length);
    const print = this.#createCursor(ctx);
    ctx.save();
    ctx.setLineDash([]);
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
    if (orchestrator) this.#drawSelection(ctx, orchestrator, pWidth - MARGIN * 2);
    ctx.restore()
  }

  #rederHelp(ctx: CanvasRenderingContext2D) {
    const print = this.#createCursor(ctx);
    const height = ctx.canvas.height - MARGIN * 2;
    const pWidth = 250;
    ctx.save();
    ctx.translate(ctx.canvas.width * 0.5, height - FH * 3 - MARGIN * 2);
    ctx.strokeStyle = 'gray';
    ctx.fillStyle = 'rgba(32, 32, 32, .76)';
    roundRect(ctx, pWidth * -0.5, 0, pWidth, FH * 3 + MARGIN * 2, MARGIN, true);
    ctx.translate(0, MARGIN);
    ctx.fillStyle = 'gray';
    ctx.textBaseline = 'hanging';
    ctx.textAlign = 'center';
    print("Press [V] to toggle network");
    print("Press [L] to toggle links");
    print("Press [S] to toggle stats");
    ctx.restore()
  }

  #drawNetwork(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    left: number,
    width: number,
    outputLabels: string[],
  ) {
    const top = MARGIN;
    const height = ctx.canvas.height - MARGIN * 2;

    const levelHeight = height / network.levels.length;

    for (let i = network.levels.length - 1; i >= 0; i--) {
      const levelTop =
        top +
        lerp(
          height - levelHeight,
          0,
          network.levels.length == 1 ? 0.5 : i / (network.levels.length - 1),
        );

      ctx.setLineDash([7, 3]);
      this.#drawLevel(
        ctx,
        network.levels[i],
        left,
        levelTop,
        width,
        levelHeight,
        i == network.levels.length - 1 ? outputLabels : [],
      );
    }
  }

  #drawLevel(
    ctx: CanvasRenderingContext2D,
    level: Level,
    left: number,
    top: number,
    width: number,
    height: number,
    outputLabels: string[],
  ) {
    const right = left + width;
    const bottom = top + height;

    const { inputs, outputs, weights } = level;

    if (this.renderLines) {
      for (let i = 0; i < inputs.length; i++) {
        for (let j = 0; j < outputs.length; j++) {
          ctx.beginPath();
          ctx.setLineDash([3, 2]);
          ctx.moveTo(this.#getNodeX(inputs, i, left, right), bottom);
          ctx.lineTo(this.#getNodeX(outputs, j, left, right), top + RADIUS);
          ctx.lineWidth = 2;
          ctx.strokeStyle = this.#getColor(weights[i][j]);
          this.#getColor(weights[i][j]);
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < inputs.length; i++) {
      const x = this.#getNodeX(inputs, i, left, right);
      const value = inputs[i];
      ctx.beginPath();
      ctx.setLineDash([5, 1]);
      ctx.arc(x, bottom, RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, bottom, RADIUS * 0.5, 0, Math.PI * 2 * Math.abs(value));
      ctx.fillStyle = this.#getColor(inputs[i]);
      ctx.strokeStyle = value > 0 ? 'orange' : 'green';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    for (let i = 0; i < outputs.length; i++) {
      const x = this.#getNodeX(outputs, i, left, right);
      const value = outputs[i];
      ctx.beginPath();
      ctx.arc(x, top, RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = value > 0 ? '#def' : '#86f';
      ctx.lineWidth = 3;
      ctx.arc(x, top, RADIUS * 0.8, 0, Math.PI * 2 * value);
      ctx.fillStyle = this.#getColor(outputs[i]);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.font = RADIUS + 'px Arial';
      if (outputLabels[i]) {
        ctx.fillText(outputLabels[i], x, top + RADIUS * 0.1);
      }
    }
  }

  #getNodeX(nodes: any[], index: number, left: number, right: number) {
    return lerp(
      left,
      right,
      nodes.length == 1 ? 0.5 : index / (nodes.length - 1),
    );
  }
}
