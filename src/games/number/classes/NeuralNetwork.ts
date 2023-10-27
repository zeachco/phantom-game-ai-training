import { rand } from '../../../utilities/math';

export class NeuralNetwork {
  private weights: number[][];
  private biases: number[][];
  //   private layers: number[];

  constructor(inputSize: number, hiddenSize: number, outputSize: number) {
    // 3, 4, 2
    // const weights = [
    //   [
    //     [0, 0, 0, 0],
    //     [0, 0, 0, 0],
    //     [0, 0, 0, 0],
    //   ],
    //   [
    //     [0, 0],
    //     [0, 0],
    //     [0, 0],
    //     [0, 0],
    //   ],
    // ];

    // const biases = [
    //   [0, 0, 0, 0],
    //   [0, 0],
    // ];
    this.weights = [
      // hidden
      // new Array(inputSize)
      //   .fill(0)
      //   .map(() => new Array(hiddenSize).fill(0).map(() => rand(-1, 1))),

      // // output
      // new Array(hiddenSize)
      //   .fill(0)
      //   .map(() => new Array(outputSize).fill(0).map(() => rand(-1, 1))),
    ];

    // for (let inputIdx = 0; inputIdx < this.weights.length; inputIdx++) {
    //   this.weights[inputIdx] = [];
    //   for (let hiddenIdx = 0; hiddenIdx < this.weights.length; hiddenIdx++) {
    //     this.weights[inputIdx][hiddenIdx] = rand(-1, 1);
    //   }
    // }

    this.biases = [
      new Array(hiddenSize).fill(0).map(() => rand(-1, 1)),
      new Array(outputSize).fill(0).map(() => rand(-1, 1)),
    ];
  }

  private sigmoid(x: number) {
    return 1 / (1 + Math.exp(-x));
  }

  private sigmoidPrime(x: number) {
    return this.sigmoid(x) * (1 - this.sigmoid(x));
  }

  private feedforward(inputs: number[]) {
    let activations: number[][] = [inputs];
    let zs: number[][] = [];
    // for (let i = 0; i < this.weights.length; i++) {
    //   const z = activations.map(
    //     (_, j) =>
    //       this.weights[i].map((w) => w[j]).reduce((a, b) => a + b, 0) +
    //       this.biases[i],
    //   );
    //   zs.push(z);
    //   activations = z.map(this.sigmoid);
    // }
    return { activations, zs };
  }

  private backprop(inputs: number[], targets: number[], learningRate: number) {
    const { activations, zs } = this.feedforward(inputs);
    const deltas: number[][] = [];
    let delta = activations[activations.length - 1].map(
      (a, i) => (a - targets[i]) * this.sigmoidPrime(zs[zs.length - 1][i]),
    );
    deltas.unshift(delta);
    for (let i = this.weights.length - 2; i >= 0; i--) {
      delta = this.weights[i + 1]
        .map((w) => delta.reduce((a, b, j) => a + b * w[j], 0))
        .map((d, j) => d * this.sigmoidPrime(zs[i][j]));
      deltas.unshift(delta);
    }
    for (let i = 0; i < this.weights.length; i++) {
      // this.weights[i] = this.weights[i].map((w, j) =>
      //   w.map((wi, k) => wi - delta[k] * activations[i][j] * learningRate),
      // );
      this.biases[i] = this.biases[i].map(
        (b, j) => b - delta[j] * learningRate,
      );
    }
  }

  public train(
    inputs: number[],
    targets: number[],
    learningRate: number,
    iterations: number,
  ) {
    for (let i = 0; i < iterations; i++) {
      this.backprop(inputs, targets, learningRate);
    }
  }

  public predict(inputs: number[]) {
    const { activations } = this.feedforward(inputs);
    return activations[activations.length - 1];
  }
}
