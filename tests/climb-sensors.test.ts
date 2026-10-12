import { describe, expect, test } from 'bun:test';
import { config, SENSORS } from '../src/games/climb/classes/Config';
import { Sensor } from '../src/games/climb/classes/Sensor';
import type { Tower } from '../src/games/climb/classes/Tower';

/** One platform with its top at y = 50, centered under x = 320. */
function towerWith() {
  return {
    platforms: [{ x: 200, y: 50, w: 240 }],
    crossedSurface() {
      return -1;
    },
    hasSupport() {
      return true;
    },
  } as unknown as Tower;
}

const L = config.SENSOR_LENGTH;
const DOWN = 6; // ray index of the straight-down ray for an 8-ray sensor
const UP = 2;
const LEFT = 4;
const RIGHT = 0;

describe('climb sensors', () => {
  test('a ray meeting a known platform reports 1 − distance/length', () => {
    const sensor = new Sensor(8);
    sensor.update(320, 100, towerWith());
    // the platform top is 50 u below the center: entry at 50/300
    expect(sensor.readings[DOWN]).toBeCloseTo(1 - 50 / L, 6);
  });

  test('the closest surface wins, a farther ground never overwrites', () => {
    const sensor = new Sensor(8);
    sensor.update(320, 100, towerWith());
    // the ground is 100 u below, the platform only 50: the reading must
    // reflect the platform, not the ground
    expect(sensor.readings[DOWN]).toBeGreaterThan(1 - 100 / L);
  });

  test('a ray starting at a surface reports contact (1)', () => {
    const sensor = new Sensor(8);
    sensor.update(320, 50, towerWith());
    expect(sensor.readings[DOWN]).toBe(1);
  });

  test('rays with nothing in range read zero', () => {
    const sensor = new Sensor(8);
    sensor.update(320, 100, towerWith());
    expect(sensor.readings[UP]).toBe(0);
    // the side walls are 320 u away, past the 300 u ray length
    expect(sensor.readings[LEFT]).toBe(0);
    expect(sensor.readings[RIGHT]).toBe(0);
  });

  test('side walls are hit analytically inside the ray length', () => {
    const sensor = new Sensor(8);
    sensor.update(100, 200, towerWith());
    expect(sensor.readings[LEFT]).toBeCloseTo(1 - 100 / L, 6);
    expect(sensor.readings[RIGHT]).toBe(0);
  });

  test('a diagonal ray meets the platform corner at the slab entry point', () => {
    const sensor = new Sensor(8);
    sensor.update(320, 100, towerWith());
    // 315° ray: the entry point is on the platform top, 50 u below the
    // center along the vertical component of the ray
    const diagonal = 1 - 50 / (L * Math.SQRT1_2);
    expect(sensor.readings[7]).toBeCloseTo(diagonal, 4);
  });

  test('the ray count is a constructor override, readings follow it', () => {
    const sensor = new Sensor(16);
    expect(sensor.rayCount).toBe(16);
    expect(sensor.readings).toHaveLength(16);
    sensor.update(320, 100, towerWith());
    // 16 rays: straight down is index 12
    expect(sensor.readings[12]).toBeCloseTo(1 - 50 / L, 6);
    const defaults = new Sensor();
    expect(defaults.rayCount).toBe(SENSORS);
    expect(defaults.readings).toHaveLength(SENSORS);
  });
});
