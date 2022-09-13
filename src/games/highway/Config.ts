class Config {
  public CAR_NB = 250;
  public MUTATION_LVL = 0.3;
  public NETWORK_LAYERS = 3;
  public SENSORS = 11;
  public SENSOR_ANGLE = (Math.PI / 2) * 3.7;
  // lane, y, speed, name
  public trafficConfig = [
    // trial of evasion
    [0, -300, 0.1, "A"],
    [1, -500, 0.2, "B"],
    [2, -300, 0.3, "C"],
    // moving cars
    [0, -400, 2, "LA"],
    [0, -600, 2.2, "LB"],
    [2, -300, 2, "RA"],
    [1, -600, 2, "MA"],
    [2, -700, 2.1, "RC"],
    [0, -900, 2.2],
    [1, -900, 2.3],
    [2, -900, 2.1],
    [2, -950, 2.4, "S"],
    // fail wall
    [0, 400, 2.4],
    [1, 400, 2.5],
    [2, 400, 2.4],
  ] as const;
}

export const config = new Config();
