import { CTRL_COLORS, type ModelsByLayerCount } from '../../../ai/utils';

class Config {
  public CAR_NB = 200;
  /** floor of cars per brain type (network layer), so every layer keeps breeding */
  public MIN_CARS_PER_LAYER = 3;
  public AUTO_DISTRIBUTE_LAYERS = false;
  public MAX_MUTATION_LVL = 0.9;
  public MIN_MUTATION_LVL = 0.0001;
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
  ];
  /** cap of brain variants, the keyboard shortcuts only cover 1..9 */
  public MAX_NETWORK_LAYERS = 9;

  // mixed: a brain that picks which trained brain drives
  public MIXED_ENABLED = true;
  public MIXED_CARS = 12;
  /** floor on the mutating mixed cars, the run needs a spread to arbitrate */
  public MIXED_MIN_CARS = 50;
  /** below that there is nothing to arbitrate, the run is skipped */
  public MIXED_MIN_EXPERTS = 2;
  /** how many saved brains per layer become selectable experts */
  public MIXED_EXPERTS_PER_LAYER = 1;
  /** single hidden layer, it only has to route the inputs to the right brain */
  public MIXED_HIDDEN_NODES = 12;
  /** odds of rerolling every weight leading to one expert, scaled by the factor */
  public MIXED_RESET_CHANCE = 0.15;
  public MIXED_MAX_MUTATION_LVL = 0.3;
  /** the mixed identity color, CTRL_COLORS[0]: mixed groups live on layer 0 */
  public MIXED_COLOR = CTRL_COLORS[0];

  // visual
  public SCORES_NB = this.MAX_NETWORK_LAYERS * 2;

  // env
  public SENSORS = 17;
  public SENSOR_ANGLE = (Math.PI / 2) * 3.5;
  public SENSORS_MAX_DEPTH = 160;
  public SENSORS_MAX_WIDTH = 160;
  public DEATH_SPEED = 0.0018;

  // car
  public CAR_ACCELERATION = 0.03;
  public CAR_FRICTION = 0.005;
  public CAR_MAX_SPEED = 5;
  /** per-car lifetime cap in ms: a car that neither moves nor crashes is killed at this age so it can never keep an experiment alive forever */
  public CAR_LIFETIME_CAP = 120000;
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
    const getModel = (layer) => saves[layer]?.[0];
    const layerScore = (models: ModelsByLayerCount[number]) =>
      models?.[0]?.score || 0;

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
      if (!models?.[0]) return;
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

export const config = new Config();
