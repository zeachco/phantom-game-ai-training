import { lerp, rand } from '../utilities/math';
import type { ModelsByLayerCount } from './utils';

/** namespace of the regular brains, kept as-is to stay compatible with old saves */
export const DEFAULT_KIND = 'neural';

export class NeuralNetwork {
  /** amount of generation passed */
  public version = 0;
  public levels: Level[];
  /** fatasy points given to train the model */
  public score: number = 0;
  /** 0-1 amount kept when merging to another model */
  public mutationFactor: number = 0.5;
  /** iteration number of the same initial network */
  public mutationIndex: number = 0.5;
  /** Score different with previous version */
  public diff = 0;
  /** Date of last version */
  public date = Date.now();
  /** storage namespace, brains of different kinds never mutate into each other */
  public kind: string = DEFAULT_KIND;

  constructor(inputNb, outputNb, intermediateLayers = Math.ceil(inputNb / 4)) {
    if (inputNb < outputNb) {
      throw new Error('requires more inputs than outputs');
    }

    this.levels = [];

    for (let i = 0; i < intermediateLayers; i++) {
      const from = Math.floor(lerp(inputNb, outputNb, i / intermediateLayers));
      const to = Math.floor(
        lerp(inputNb, outputNb, (i + 1) / intermediateLayers),
      );
      this.levels.push(new Level(from, to));
    }
  }

  static feedForward(givenInputs: number[], network: NeuralNetwork) {
    let outputs = Level.feedForward(givenInputs, network.levels[0]);
    for (let i = 1; i < network.levels.length; i++) {
      outputs = Level.feedForward(outputs, network.levels[i]);
    }
    return outputs;
  }

  /** rebuilds a usable network out of a save, levels are sized from the stored weights */
  static hydrate(saved: ModelsByLayerCount[number]): NeuralNetwork {
    const network = new NeuralNetwork(1, 1, 0);
    network.levels = (saved.levels || []).map((saved) => {
      const weights: number[][] = saved.weights;
      const level = new Level(weights.length, weights[0].length);
      for (let i = 0; i < weights.length; i++) {
        for (let j = 0; j < weights[i].length; j++) {
          level.weights[i][j] = weights[i][j];
        }
      }
      return level;
    });
    network.version = saved.version || 0;
    network.score = saved.score || 0;
    network.mutationIndex = saved.mutationIndex || 0;
    network.mutationFactor = 0;
    network.kind = saved.kind || DEFAULT_KIND;
    return network;
  }

  /** entry point used by the entities, subclasses can route the inputs differently */
  process(inputs: number[]): number[] {
    return NeuralNetwork.feedForward(inputs, this);
  }

  get id() {
    return [this.levels.length, this.version, this.mutationIndex].join('-');
  }

  get inputCount() {
    return this.levels[0] ? this.levels[0].weights.length : 0;
  }

  get outputCount() {
    const last = this.levels[this.levels.length - 1];
    return last ? last.weights[0].length : 0;
  }

  mutate(network: ModelsByLayerCount[number]) {
    this.version = network.version;
    for (let l = 0; l < this.levels.length; l++) {
      for (let i = 0; i < this.levels[l].weights.length; i++) {
        for (let j = 0; j < this.levels[l].weights[i].length; j++) {
          this.levels[l].weights[i][j] = lerp(
            network.levels[l].weights[i][j],
            rand(),
            this.mutationFactor,
          );
        }
      }
    }
  }
}

export class Level {
  public inputs;
  public outputs;
  public weights: number[][];
  constructor(inputCount = 1, outputCount = 1) {
    this.inputs = new Array(inputCount);
    this.outputs = new Array(outputCount);

    this.weights = [];
    for (let i = 0; i < inputCount; i++) {
      this.weights[i] = new Array(outputCount);
    }

    Level.#randomize(this);
  }

  static #randomize(level: Level) {
    for (let i = 0; i < level.inputs.length; i++) {
      for (let j = 0; j < level.outputs.length; j++) {
        level.weights[i][j] = rand();
      }
    }
  }

  static feedForward(givenInputs: number[], level: Level) {
    for (let i = 0; i < level.inputs.length; i++) {
      level.inputs[i] = givenInputs[i];
    }

    for (let i = 0; i < level.outputs.length; i++) {
      let sum = 0;
      for (let j = 0; j < level.inputs.length; j++) {
        sum += level.inputs[j] * level.weights[j][i];
      }

      level.outputs[i] = sum;
    }

    return level.outputs;
  }
}
