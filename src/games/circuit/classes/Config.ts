import { ModelsByLayerCount } from '../../../ai/utils';

class Config {
  // population
  /** cap of live AI cars, a replacement spawns the frame one dies */
  public CAR_NB = 200;
  /** floor of cars per brain type (network layer), so every layer keeps breeding */
  public MIN_CARS_PER_LAYER = 2;
  public AUTO_DISTRIBUTE_LAYERS = false;
  public MAX_MUTATION_LVL = 0.9;
  public MIN_MUTATION_LVL = 0.0001;
  /** 18 per layer x 10 layers, the rest of the cap goes to the mixed cars */
  public CARS_PER_LAYERS = [0, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18];
  public MAX_NETWORK_LAYERS = 10;
  /** gap from the line to the start point, wider than the claim radius */
  public SPAWN_OFFSET = 150;
  /** corpses stay on the map that long after the crash, then get deleted */
  public DEAD_LIFETIME = 20000;

  // mixed: a brain that picks which trained brain drives
  public MIXED_ENABLED = true;
  public MIXED_CARS = 20;
  /** floor on the mutating mixed cars, the run needs a spread to arbitrate */
  public MIXED_MIN_CARS = 20;
  /** below that there is nothing to arbitrate, the run is skipped */
  public MIXED_MIN_EXPERTS = 2;
  /** how many saved brains per layer become selectable experts */
  public MIXED_EXPERTS_PER_LAYER = 1;
  /** single hidden layer, it only has to route the inputs to the right brain */
  public MIXED_HIDDEN_NODES = 12;
  /** mutations are boosted, every expert is good at something worth trying */
  public MIXED_MUTATION_BOOST = 3;
  /** odds of rerolling every weight leading to one expert, scaled by the factor */
  public MIXED_RESET_CHANCE = 0.15;
  public MIXED_MAX_MUTATION_LVL = 0.3;
  public MIXED_COLOR = '#ff69b4';

  // visual
  public SCORES_NB = this.MAX_NETWORK_LAYERS * 2;
  /** length of the line from a car to its next gate */
  public GATE_LINE_LENGTH = 70;
  public PLANE_COLOR = '#11150f';
  public ROAD_COLOR = '#1e2124';
  public LANE_COLOR = 'rgba(255, 255, 255, 0.4)';
  public EDGE_COLOR = 'white';

  // env
  public SENSORS = 17;
  public SENSOR_ANGLE = (Math.PI / 2) * 3.5;
  public SENSORS_MAX_DEPTH = 160;
  public SENSORS_MAX_WIDTH = 160;

  // car
  public CAR_ACCELERATION = 0.03;
  public CAR_FRICTION = 0.005;
  public CAR_MAX_SPEED = 5;
  public CLEAR_STORAGE = /clear/.test(window.location.href);
  /** leaving the road kills, the trickle only exists to reward moving on it */
  public DISTANCE_SCORE_RATE = 1 / 30;

  // circuit, a radial curve r(theta) so the random waves can never
  // self-intersect, the map is bigger than the screen
  public CIRCUIT_BASE_RADIUS = 1500;
  /** max total deviation of the radius from the base, wide sweeping turns */
  public CIRCUIT_WAVINESS = 420;
  /** points of the resampled centerline, also the drawn boundary resolution */
  public CIRCUIT_SAMPLES = 192;
  /** every Nth boundary point becomes a sensor segment, coarser is cheaper */
  public SENSOR_DECIMATION = 4;
  public ROAD_WIDTH = 180;
  public ROAD_LANES = 3;

  // checkpoints, claimed in order so the only way to bank score is
  // around the loop, donuts in the open plane earn nothing
  public CHECKPOINTS = 32;
  /** worth more than the walk to the next one, that is the anti-donut lever */
  public CHECKPOINT_SCORE = 100;
  public CHECKPOINT_CLAIM_RADIUS = 100;

  // obstacles, solid blocks along the road, none in the start zone
  public OBSTACLES = 40;

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
