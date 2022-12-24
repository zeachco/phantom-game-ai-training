import { NeuralNetwork } from '../games/cells/neural-network/NeuralNetwork';
import { lerp } from '../utilities/math';
import { CtxTxt } from '../utilities/text';

export class NeuralVisualizer {
  public network: NeuralNetwork;
  public entity: { x: number; y: number; a: number; label: string };
  private text: CtxTxt;

  constructor(private ctx: CanvasRenderingContext2D) {
    this.text = new CtxTxt(ctx, 24, 24);
    this.text.fontSize = 14;
  }

  render() {
    const { ctx, gw, gh } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, .5)';
    ctx.fillRect(0, 0, gw, gh);

    this.renderNetwork();
  }

  public renderNetwork() {
    const { text, ctx, gw, gh, network, entity } = this;
    if (!network) return;
    const { inputs, outputs, hiddenLayers, layers } = network;
    text.reset();
    text.print(network.name, 1.5);
    const tensorSize = hiddenLayers.reduce(
      (acc, nb) => acc * nb,
      inputs * outputs,
    );
    text.print(`Tensor size: ${tensorSize}`);
    layers.forEach((layer, index) => {
      text.print(`Layers ${index} have ${layer.length} units`);
    });
    text.print(`Score: ${network.score.toFixed(10)}`);

    if (entity) {
      text.print(``);
      text.print(`Entity ${entity.label}`, 1.25);
      text.print(`x: ${entity.x}`);
      text.print(`y: ${entity.y}`);
      text.print(`angle: ${entity.a}`);
    }

    // let top = gh;
    // network.layers.forEach((layer, layerIdx) => {
    //   let left = 10;
    //   top -= 60;
    //   layer.forEach((unit, unitIdx) => {
    //     const biasColor = this.getHue(unit.bias);
    //     const weightColor = this.getHue(unit.weight);
    //     ctx.strokeStyle = `hsla(${biasColor}, 100%, 50%, 1)`;
    //     ctx.fillStyle = `hsla(${weightColor}, 100%, 50%, 1)`;
    //     ctx.fillRect(left, top, 25, 25);
    //     ctx.strokeRect(left, top, 25, 25);
    //     ctx.fillStyle = 'white';
    //     ctx.fillText(`${unitIdx}`, left + 12.5, top + 12.5);
    //     left += 40;
    //     if (left > gw - 115) {
    //       left = 10;
    //       top -= 40;
    //     }
    //   });
    // });
  }

  private get gw() {
    return this.ctx.canvas.width;
  }
  private get gh() {
    return this.ctx.canvas.height;
  }

  private getHue(value) {
    return Math.round(lerp(270, 180, (value + 1) / 2));
  }
}
