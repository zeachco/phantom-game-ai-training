import { NeuralNetwork } from './Network';

export class NeuralSaves {
  public layers: NeuralNetwork[][];
  constructor(layers: NeuralNetwork[][] = []) {
    this.layers = layers.map((models) =>
      models.map((m) => new NeuralNetwork(1, 1)),
    );
  }

  public bestPerformingModel(): NeuralNetwork | undefined {
    return this.sortByModel()[0];
  }

  public sortByModel(): NeuralNetwork[] {
    return this.layers
      .map((l) => this.getModel(l))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  public getModel(layer, index = 0): NeuralNetwork | undefined {
    return this.layers[layer] && this.layers[layer][index];
  }
}
