import { describe, expect, test } from 'bun:test';
import { config, SENSORS } from '../src/games/climb/classes/Config';
import { Sensor } from '../src/games/climb/classes/Sensor';
import type { Tower } from '../src/games/climb/classes/Tower';

/** One platform with its top at y = 50, centered under x = 320. */
function towerWith(platforms = [{ x: 200, y: 50, w: 240 }]) {
  return {
    platforms,
    crossedSurface() {
      return -1;
    },
    hasSupport() {
      return true;
    },
  } as unknown as Tower;
}

const L = config.SENSOR_LENGTH;
const DOWN = 6; // even straight-down ray for an 8-ray sensor
const ODD_DOWN = 3; // odd straight-down ray for a 4-ray sensor
const UP = 2;
const LEFT = 4;
const RIGHT = 0;

describe('climb sensors', () => {
  test('an odd ray reports the nearest platform', () => {
    const sensor = new Sensor(4);
    sensor.update(320, 100, towerWith());
    // the platform top is 50 u below the center: entry at 50/300
    expect(sensor.readings[ODD_DOWN]).toBeCloseTo(1 - 50 / L, 6);
  });

  test('an even ray passes through one platform to the next obstacle', () => {
    const sensor = new Sensor(8);
    sensor.update(
      320,
      100,
      towerWith([
        { x: 200, y: 50, w: 240 },
        { x: 200, y: 20, w: 240 },
      ]),
    );
    // The first platform is at 50u; the even ray skips it and reports 20u.
    expect(sensor.readings[DOWN]).toBeCloseTo(1 - 80 / L, 6);
  });

  test('an odd ray ignores the farther ground after the nearest platform', () => {
    const sensor = new Sensor(4);
    sensor.update(320, 100, towerWith());
    expect(sensor.readings[ODD_DOWN]).toBeGreaterThan(1 - 100 / L);
  });

  test('an odd ray starting at a surface reports contact (1)', () => {
    const sensor = new Sensor(4);
    sensor.update(320, 50, towerWith());
    expect(sensor.readings[ODD_DOWN]).toBe(1);
  });

  test('rays with nothing in range read zero', () => {
    const sensor = new Sensor(8);
    sensor.update(320, 100, towerWith());
    expect(sensor.readings[UP]).toBe(0);
    expect(sensor.readings[LEFT]).toBe(0);
    expect(sensor.readings[RIGHT]).toBe(0);
  });

  test('side walls are invisible to every sensor', () => {
    const sensor = new Sensor(8);
    sensor.update(100, 200, towerWith());
    expect(sensor.readings[LEFT]).toBe(0);
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
    // 16 rays: straight down is even index 12, so it skips the platform and
    // reports the ground at 100u below.
    expect(sensor.readings[12]).toBeCloseTo(1 - 100 / L, 6);
    const defaults = new Sensor();
    expect(defaults.rayCount).toBe(SENSORS);
    expect(defaults.readings).toHaveLength(SENSORS);
  });
});
