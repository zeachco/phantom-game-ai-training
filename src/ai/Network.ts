import { config } from '../games/highway/Config';
import { lerp, rand } from '../utilities/math';
import { ModelsByLayerCount } from './utils';

export class NeuralNetwork {
  version = 0;
  levels: Level[];
  /** fatasy points given to train the model */
  public score: number = 0;
  /** 0-1 amount kept when merging to another model */
  public mutationFactor: number = 0.5;
  /** iteration number of the same initial network */
  public mutationIndex: number = 0.5;

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

  static feedForward(givenInputs: any[], network: NeuralNetwork) {
    let outputs = Level.feedForward(givenInputs, network.levels[0]);
    for (let i = 1; i < network.levels.length; i++) {
      outputs = Level.feedForward(outputs, network.levels[i]);
    }
    return outputs;
  }

  get id() {
    return [this.levels.length, this.version, this.mutationIndex].join('-');
  }

  mutate(network: ModelsByLayerCount[number]) {
    this.version = network.version + 1;
    this.mutationFactor = config.MUTATION_LVL
      // (this.mutationIndex / Math.max(1, this.score)) * config.MUTATION_LVL;

    if (this.levels.length !== network.levels.length) {
      console.warn(
        `Neural mismatch ${this.levels.length}>${network.levels.length}`,
      );
      return;
    }
    for (let l = 0; l < this.levels.length; l++) {
      for (let b = 0; b < this.levels[l].biases.length; b++) {
        this.levels[l].biases[b] = lerp(
          network.levels[l].biases[b],
          rand(),
          this.mutationFactor,
        );
      }
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
  inputs;
  outputs;
  biases;
  weights: number[][];
  constructor(inputCount = 1, outputCount = 1) {
    this.inputs = new Array(inputCount);
    this.outputs = new Array(outputCount);
    this.biases = new Array(outputCount);

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

    for (let i = 0; i < level.biases.length; i++) {
      level.biases[i] = rand();
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

      if (sum > level.biases[i]) {
        level.outputs[i] = 1;
      } else {
        level.outputs[i] = 0;
      }
    }

    return level.outputs;
  }
}
