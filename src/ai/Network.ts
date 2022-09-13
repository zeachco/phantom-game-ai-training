import { lerp, rand } from "../utilities/math";

export class NeuralNetwork {
  generation = 0;
  levels: Level[];
  constructor(inputNb, outputNb, intermediateLayers = Math.ceil(inputNb / 4)) {
    if (inputNb < outputNb) {
      throw new Error("requires more inputs than outputs");
    }

    this.levels = [];

    for (let i = 0; i < intermediateLayers; i++) {
      const from = Math.floor(lerp(inputNb, outputNb, i / intermediateLayers));
      const to = Math.floor(
        lerp(inputNb, outputNb, (i + 1) / intermediateLayers)
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

  mutate(network: NeuralNetwork, amount = 0.01) {
    if (this.levels.length !== network.levels.length) {
      console.warn(
        `Neural mismatch ${this.levels.length}>${network.levels.length}`
      );
      return;
    }
    this.generation = network.generation + 1;
    for (let l = 0; l < network.levels.length; l++) {
      for (let b = 0; b < this.levels[l].biases.length; b++) {
        this.levels[l].biases[b] = lerp(
          network.levels[l].biases[b],
          rand(),
          amount
        );
      }
      for (let i = 0; i < this.levels[l].weights.length; i++) {
        for (let j = 0; j < this.levels[l].weights[i].length; j++) {
          this.levels[l].weights[i][j] = lerp(
            network.levels[l].weights[i][j],
            rand(),
            amount
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
