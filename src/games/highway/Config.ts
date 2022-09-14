class Config {
  public CAR_NB = 300;
  public MAX_NETWORK_LAYERS = 9;
  public MUTATION_LVL = 0.03;

  // visual
  public SCORES_NB = this.MAX_NETWORK_LAYERS * 2;

  // env
  public SENSORS = 11;
  public SENSOR_ANGLE = (Math.PI / 2) * 3.7;
  public DEATH_SPEED = 0.005;

  // car
  public CAR_ACCELERATION = 0.03;
  public CAR_FRICTION = 0.005;
  public CAR_MAX_SPEED = 5;
  public CLEAR_STORAGE = false;

  // road
  // lane/y/speed/name
  public trafficConfig = [
    // trial of evasion
    [0, -300, 0.1, 'A'],
    [1, -500, 0.2, 'B'],
    [2, -300, 0.3, 'C'],
    // moving cars
    [0, -400, 2, 'LA'],
    [0, -600, 2.2, 'LB'],
    [2, -300, 2, 'RA'],
    [1, -600, 2, 'MA'],
    [2, -700, 2.1, 'RC'],
    [0, -900, 2.2],
    [1, -900, 2.3],
    [2, -900, 2.1],
    [2, -950, 2.4, 'S'],
  ] as const;

  public get CAR_PER_LEVELS() {
    return this.CAR_NB / this.MAX_NETWORK_LAYERS;
  }
}

export const config = new Config();
