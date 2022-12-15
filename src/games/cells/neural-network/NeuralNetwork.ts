import { lerp, rand } from "../../../utilities/math.js";
import { NeuralUnit } from "./NeuralUnit.js";

export class NeuralNetwork {
  public layers: NeuralUnit[][] = [];
  public score = 0;

  constructor(
    public inputs: number,
    public outputs: number = 1,
    public hiddenLayers: number[] = [5],
    public generation = 0,
    public mutationAmount = 0,
  ) {
    this.layers = [inputs, ...hiddenLayers, outputs].map((unitCount) =>
      new Array(unitCount).fill(0).map(() =>
        new NeuralUnit({
          bias: 0,
          weight: 0,
        })
      )
    );

    this.randomize(1);
  }

  public loadFromFile(filename: string) {
    const text = localStorage.getItem(filename);
    const data = JSON.parse(text) as NeuralNetwork;
    this.fromObject(data);
    return data;
  }

  public saveToFile(filename: string) {
    localStorage.setItem(filename, this.toJSON())
  }

  public fromObject(data: NeuralNetwork) {
    Object.assign(this, data);
  }

  public toJSON(): string {
    const data = {
      score: this.score,
      generation: this.generation,
      layers: this.layers,
    };

    return JSON.stringify(data, null, 2);
  }

  public train(trainer: () => [number[], number[]], samples = 1000) {
    const networks: {
      network: NeuralNetwork;
      mutation: number;
      distance: number;
    }[] = [];

    for (let index = 1; index <= samples; index++) {
      const [inputs, expected] = trainer();
      const network = this.clone(index / samples);
      const results = this.feedForward(inputs);
      const distance = expected.reduce(
        (acc, index) => acc + Math.abs(expected[index] - results[index]),
        0,
      );

      console.log({ inputs, expected, results, distance });
      // TODO implement back propagation based on diff
      networks.push({
        network,
        mutation: network.mutationAmount,
        distance,
      });
    }

    networks.sort((a, b) => a.distance - b.distance);

    console.table(networks.map((a) => a.distance));

    return networks;
  }

  public clone(mutationLevel = this.mutationAmount) {
    return new NeuralNetwork(
      this.inputs,
      this.outputs,
      this.hiddenLayers,
      this.generation + 1,
      mutationLevel,
    );
  }

  public feedForward(inputs: number[], layerIndex = 0): number[] {
    const layer = this.layers[layerIndex];
    if (!layer) return inputs;

    const outputs = layer.map((unit) => {
      return inputs.reduce((acc, input) => {
        const value = unit.weight * input;
        return value > unit.bias ? value : acc;
      }, 0);
    });

    return this.feedForward(outputs, layerIndex + 1);
  }

  public randomize(mutationLevel = this.mutationAmount) {
    for (let layerIndex = 0; layerIndex < this.layers.length; layerIndex++) {
      const layer = this.layers[layerIndex];
      for (let unitIndex = 0; unitIndex < layer.length; unitIndex++) {
        const unit = layer[unitIndex];
        unit.bias = lerp(unit.bias, rand(-1, 1), mutationLevel);
        unit.weight = lerp(unit.weight, rand(-1, 1), mutationLevel);
      }
    }
  }
}
