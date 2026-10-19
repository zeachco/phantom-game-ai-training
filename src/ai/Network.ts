import { lerp, rand } from '../utilities/math';
import type { ModelsByLayerCount } from './utils';

/** namespace of the regular brains, kept as-is to stay compatible with old saves */
export const DEFAULT_KIND = 'neural';

/**
 * Learning rate for one distillation step (brain.train). Shared by all games
 * so every student brain chases its teacher at the same pace.
 */
export const TEACHING_RATE = 0.1;
/** a whole distillation run decays over this many frames */
export const TEACHING_FRAMES = 10_000;

/**
 * The step coefficient of a distillation run at `frames` into it. It starts
 * eager, four times the base rate, and settles linearly back to the base rate
 * over TEACHING_FRAMES: early frames move the brain fast, later ones polish it
 * instead of oscillating around the teacher.
 */
export function teachingRate(frames: number, base = TEACHING_RATE): number {
  if (!Number.isFinite(frames) || frames <= 0) return base * 4;
  const decay = Math.min(1, frames / TEACHING_FRAMES);
  return base * (1 + 3 * (1 - decay));
}

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

  /**
   * One gradient-descent step that pulls the network's outputs toward
   * `targets` for `inputs` (MSE, backpropagated through every level). The
   * brain is a pure linear map, so the gradients are exact. Returns the
   * pre-step loss; watch it shrink while a distilling brain converges on its
   * teacher.
   */
  public train(
    inputs: number[],
    targets: number[],
    learningRate = TEACHING_RATE,
  ): number {
    const activations: number[][] = [inputs];
    let current = inputs;
    for (const level of this.levels) {
      current = Level.feedForward(current, level);
      activations.push(current);
    }
    const output = current;
    let loss = 0;
    const deltas = new Array<number>(output.length);
    for (let i = 0; i < output.length; i++) {
      const error = output[i] - (targets[i] ?? 0);
      loss += error * error;
      deltas[i] = (2 * error) / output.length;
    }
    NeuralNetwork.applyGradients(
      this.levels,
      activations,
      deltas,
      learningRate,
    );
    return loss;
  }

  /**
   * Walk `deltas` (output-space) back through `levels`, applying one descent
   * step per weight and propagating the input-space deltas. Shared by train
   * and MixedNetwork's selector distillation.
   */
  public static applyGradients(
    levels: Level[],
    activations: number[][],
    deltas: number[],
    learningRate: number,
  ): void {
    for (let levelIndex = levels.length - 1; levelIndex >= 0; levelIndex--) {
      const level = levels[levelIndex];
      const into = activations[levelIndex];
      const nextDeltas =
        levelIndex > 0 ? new Array<number>(into.length).fill(0) : null;
      // Scale the step by the layer's activation energy (normalised LMS). With
      // a raw rate a wide sensor fan-in makes the step grow with every frame
      // until the weights overflow; divided by the norm the same rate is
      // stable whatever the input magnitudes are.
      let energy = 1;
      for (let i = 0; i < into.length; i++) energy += into[i] * into[i];
      const step = learningRate / energy;
      for (let input = 0; input < level.inputs.length; input++) {
        const activation = into[input];
        if (!activation) continue; // zero input: no gradient on this row
        const weights = level.weights[input];
        for (let output = 0; output < level.outputs.length; output++) {
          const delta = deltas[output];
          if (!delta) continue;
          if (nextDeltas) nextDeltas[input] += weights[output] * delta;
          const correction = step * delta * activation;
          // a non finite correction would poison the brain for good
          if (Number.isFinite(correction)) weights[output] -= correction;
        }
      }
      if (nextDeltas) deltas = nextDeltas;
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
