import { config } from '../games/highway/classes/Config';
import { roundRect } from '../utilities/canvas';
import { getColorScale } from '../utilities/colors';
import { lerp } from '../utilities/math';
import { Level, NeuralNetwork } from './Network';

const RADIUS = 14;
const MARGIN = Math.max(RADIUS, 10);

export class Visualizer {
  static getColor(value) {
    return `hsla(56, 100%, ${Math.round((value + 1) * 100)}%, ${Math.abs(
      value,
    )})`;
  }
  static drawStats(ctx: CanvasRenderingContext2D, network: NeuralNetwork) {
    const height = ctx.canvas.height - MARGIN * 2;
    const levelHeight = height / network.levels.length;
    const pWidth = 150;
    const marg = 8;
    const fh = 18;
    const tWidth = pWidth - marg;
    const levelColor = getColorScale(
      network.levels.length / config.MAX_NETWORK_LAYERS,
    );
    ctx.save();
    ctx.translate(ctx.canvas.width * 0.5 + MARGIN, levelHeight * 0.5);
    ctx.font = fh + 'px Arial';
    ctx.strokeStyle = levelColor;
    ctx.fillStyle = 'rgba(32, 32, 32, .76)';
    roundRect(ctx, pWidth * -0.5, 0, pWidth, fh * 3 + marg * 2, marg, true);
    ctx.fillStyle = levelColor;
    ctx.textBaseline = 'hanging';
    ctx.textAlign = 'center';
    ctx.translate(0, marg);
    ctx.fillText(`Network ${network.id}`, 0, 0, tWidth);
    ctx.translate(0, fh);
    ctx.fillText(
      `Mutation ${(network.mutationFactor * 100).toFixed(4)}%`,
      0,
      0,
      tWidth,
    );
    ctx.translate(0, fh);
    ctx.fillText(`Score ${Math.round(network.score)}`, 0, 0, tWidth);
    ctx.restore();
  }
  static drawNetwork(ctx: CanvasRenderingContext2D, network: NeuralNetwork) {
    const left = MARGIN;
    const top = MARGIN;
    const width = ctx.canvas.width - MARGIN * 2;
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
      Visualizer.drawLevel(
        ctx,
        network.levels[i],
        left,
        levelTop,
        width,
        levelHeight,
        i == network.levels.length - 1 ? ['F', 'L', 'R', 'B'] : [],
      );
    }
  }

  static drawLevel(
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

    // ctx.setLineDash([3, 2]);
    // for (let i = 0; i < inputs.length; i++) {
    //   for (let j = 0; j < outputs.length; j++) {
    //     ctx.beginPath();
    //     ctx.moveTo(Visualizer.#getNodeX(inputs, i, left, right), bottom);
    //     ctx.lineTo(Visualizer.#getNodeX(outputs, j, left, right), top + RADIUS);
    //     ctx.lineWidth = 2;
    //     ctx.strokeStyle = Visualizer.getColor(weights[i][j]);
    //     Visualizer.getColor(weights[i][j]);
    //     ctx.stroke();
    //   }
    // }

    ctx.setLineDash([5, 1]);
    for (let i = 0; i < inputs.length; i++) {
      const x = Visualizer.#getNodeX(inputs, i, left, right);
      const value = inputs[i];
      ctx.beginPath();
      ctx.arc(x, bottom, RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, bottom, RADIUS * 0.5, 0, Math.PI * 2 * Math.abs(value));
      ctx.fillStyle = Visualizer.getColor(inputs[i]);
      ctx.strokeStyle = value > 0 ? 'orange' : 'green';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    for (let i = 0; i < outputs.length; i++) {
      const x = Visualizer.#getNodeX(outputs, i, left, right);
      const value = outputs[i];
      ctx.beginPath();
      ctx.arc(x, top, RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fill();
      ctx.beginPath();
      ctx.strokeStyle = value > 0 ? '#def' : '#86f';
      ctx.lineWidth = 3;
      ctx.arc(x, top, RADIUS * 0.8, 0, Math.PI * 2 * value);
      ctx.fillStyle = Visualizer.getColor(outputs[i]);
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

  static #getNodeX(nodes: any[], index: number, left: number, right: number) {
    return lerp(
      left,
      right,
      nodes.length == 1 ? 0.5 : index / (nodes.length - 1),
    );
  }
}
