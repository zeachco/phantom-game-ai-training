let experimentNb = 0;

export class Experiment {
  constructor(
    public instanceNb = 100,
    public brainLayerNb = 1,
    public name = `experiment${experimentNb++}`,
  ) {}
}

let entityNb = 0;
export class MLInstance {
  constructor(
    public experiment: Experiment,
    public entity,
    public name = `instance${entityNb++}`,
  ) {}

  update() {
    if (typeof this.entity.update === 'function') this.entity.update();
  }

  render() {
    if (typeof this.entity.render === 'function') this.entity.render();
  }
}
