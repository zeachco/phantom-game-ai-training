import { NeuralNetwork } from '../games/cells/neural-network/NeuralNetwork';
import { lerp } from '../utilities/math';

export class NeuralVisualizer {
  public network: NeuralNetwork;

  constructor(private ctx: CanvasRenderingContext2D) {}

  render() {
    const { ctx, gw, gh } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, .5)';
    ctx.fillRect(0, 0, gw, gh);

    this.renderNetwork();
  }

  public renderNetwork() {
    const { ctx, gw, gh, network } = this;
    if (!network) return;

    let top = gh;
    network.layers.forEach((layer, layerIdx) => {
      let left = 10;
      top -= 40;
      layer.forEach((unit, unitIdx) => {
        const biasColor = this.getHue(unit.bias);
        const weightColor = this.getHue(unit.weight);
        ctx.strokeStyle = `hsla(${biasColor}, 100%, 50%, 1)`;
        ctx.fillStyle = `hsla(${weightColor}, 100%, 50%, 1)`;
        ctx.fillRect(left, top, 25, 25);
        ctx.strokeRect(left, top, 25, 25);
        left += 40;
        if (left > gw - 115) {
          left = 10;
          top -= 40;
        }
      });
    });
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
