import { rand } from '../../utilities/math';

/**
 * A class the represents a simple neural network model.
 */
export class SimpleModel {
  constructor(
    public inputSize: number,
    public outputSize: number,
    public hiddenSize: number,
  ) {}
}

export class Neuronne {
  public weight: number;
  public bias: number;

  constructor() {
    this.weight = rand(-1, 1);
    this.bias = rand(-1, 1);
  }
}
