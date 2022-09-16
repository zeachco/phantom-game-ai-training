class Config {
  public CAR_NB = 10;
  public MAX_NETWORK_LAYERS = 10;
  public MUTATION_LVL = 0.75;
  public CARS_PER_LAYERS = [50, 50, 50, 50, 50, 50, 50, 50, 50, 2000];

  // visual
  public SCORES_NB = this.MAX_NETWORK_LAYERS * 2;

  // env
  public SENSORS = 9;
  public SENSOR_ANGLE = (Math.PI / 2) * 2.2;
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
}

export const config = ((window as any).config = new Config());
