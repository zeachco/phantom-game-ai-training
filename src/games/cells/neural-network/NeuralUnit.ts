export class NeuralUnit {
  /** Strength of the link */
  public weight: number = 0;
  /** Amount require to activate the neurone */
  public bias: number = 0;

  constructor(data: Partial<NeuralUnit>) {
    Object.assign(this, data);
  }
}
