import { ModelsByLayerCount } from '../../../ai/utils';

class Config {
  public CAR_NB = 1000;
  public AUTO_DISTRIBUTE_LAYERS = true;
  public MAX_MUTATION_LVL = .9;
  public MIN_MUTATION_LVL = .0001;
  public CARS_PER_LAYERS = [
    0,
    this.CAR_NB / 10,
    this.CAR_NB / 10,
    this.CAR_NB / 10,
    this.CAR_NB / 10,
    this.CAR_NB / 10,
    this.CAR_NB / 10,
    this.CAR_NB / 10,
    this.CAR_NB / 10,
    this.CAR_NB / 10,
    this.CAR_NB / 10,
  ];
  public MAX_NETWORK_LAYERS = this.CARS_PER_LAYERS.length;

  // visual
  public SCORES_NB = this.MAX_NETWORK_LAYERS * 2;

  // env
  public SENSORS = 17;
  public SENSOR_ANGLE = (Math.PI / 2) * 3.5;
  public SENSORS_MAX_DEPTH = 120;
  public SENSORS_MAX_WIDTH = 120;
  public DEATH_SPEED = 0.0018;

  // car
  public CAR_ACCELERATION = 0.03;
  public CAR_FRICTION = 0.005;
  public CAR_MAX_SPEED = 5;
  public CLEAR_STORAGE = /clear/.test(window.location.href);

  // road
  // lane/y/speed/name
  public trafficConfig = [
    // trial of evasion
    [0, -300, 0.2, 'A'],
    [1, -500, 0.4, 'B'],
    [2, -300, 0.6, 'C'],
    // moving cars
    [0, -400, 2, 'LA'],
    [0, -600, 2.2, 'LB'],
    [2, -300, 2, 'RA'],
    [1, -600, 2, 'MA'],
    [2, -700, 2.1, 'RC'],
    [0, -900, 2.2],
    [1, -900, 2.3],
    [2, -900, 2.1],
    [2, -950, 2.4, 'SP'],
    [1, -1400, 2.5, 'M0'],
    [0, -1550, 2.3, 'EL'],
    [2, -1550, 2.4, 'ER'],
    [0, -1950, 2.2, 'E2L'],
    [2, -1950, 2.2, 'E2R'],
  ] as const;

  public get CAR_PER_LEVELS() {
    return this.CAR_NB / this.MAX_NETWORK_LAYERS;
  }

  public autoDistributeByScores(saves: ModelsByLayerCount[]) {
    if (!this.AUTO_DISTRIBUTE_LAYERS) return;
    const getModel = (layer) => saves[layer] && saves[layer][0];
    const layerScore = (models: ModelsByLayerCount[number]) =>
      (models && models[0] && models[0].score) || 0;

    let totalScore = 0;
    for (let i = 1; i < this.CARS_PER_LAYERS.length; i++) {
      const save = getModel(i);
      if (!save) continue;
      totalScore += save.score;
    }

    const sortedLayers = [...saves].sort(
      (a, b) => layerScore(a) - layerScore(b),
    );

    let remainingScore = totalScore;

    sortedLayers.forEach((models) => {
      if (!models || !models[0]) return;
      const layer = models[0].levels.length;
      const give = layer ? Math.ceil(remainingScore * 0.55) : 0;
      remainingScore -= give;
      this.CARS_PER_LAYERS[layer] = Math.round(
        (give / totalScore) * this.CAR_NB + 2,
      );
      console.log(
        `set layer ${layer} with ${this.CARS_PER_LAYERS[layer]} cars`,
      );
    });
  }
}

export const config = ((window as any).config = new Config());
