import { describe, expect, test } from 'bun:test';
import { config } from '../src/games/climb/classes/Config';
import { Sensor } from '../src/games/climb/classes/Sensor';
import type { Platform, Tower } from '../src/games/climb/classes/Tower';

function towerWith(platforms: Platform[] = [{ x: 200, y: 50, w: 240 }]) {
  return { platforms } as unknown as Tower;
}

describe('climb sensors', () => {
  test('slots report nearest platforms with normalized geometry', () => {
    const sensor = new Sensor(2);
    sensor.update(
      320,
      100,
      0,
      0,
      false,
      towerWith([
        { x: 200, y: 50, w: 240 },
        { x: 100, y: 180, w: 100 },
      ]),
      null,
    );

    expect(sensor.readings[0]).toBeCloseTo(0, 6);
    expect(sensor.readings[1]).toBeCloseTo(-50 / config.SENSOR_LENGTH, 6);
    expect(sensor.readings[2]).toBe(1);
    expect(sensor.readings[3]).toBe(1);
    expect(sensor.readings[4]).toBeCloseTo(-170 / config.SENSOR_LENGTH, 6);
  });

  test('the standing platform is excluded from slots', () => {
    const current = { x: 200, y: 50, w: 240 };
    const sensor = new Sensor(1);
    sensor.update(
      320,
      65,
      0,
      0,
      true,
      towerWith([current, { x: 100, y: 180, w: 100 }]),
      current,
    );
    expect(sensor.readings[1]).toBeCloseTo(115 / config.SENSOR_LENGTH, 6);
    expect(sensor.readings[2]).toBe(1);
  });

  test('body channels include walls, velocity, support edges, and combo', () => {
    const sensor = new Sensor(1);
    const current = { x: 100, y: 50, w: 200 };
    sensor.update(100, 65, -3, 4, true, towerWith([current]), current, 5);
    const o = 4;
    expect(sensor.readings[o]).toBeCloseTo(100 / config.TOWER_WIDTH, 6);
    expect(sensor.readings[o + 1]).toBeCloseTo(540 / config.TOWER_WIDTH, 6);
    expect(sensor.readings[o + 2]).toBeCloseTo(-3 / config.MAX_SPEED, 6);
    expect(sensor.readings[o + 3]).toBeCloseTo(4 / config.JUMP_SPEED, 6);
    expect(sensor.readings[o + 4]).toBe(1);
    expect(sensor.readings[o + 5]).toBeCloseTo(100 / config.TOWER_WIDTH, 6);
    expect(sensor.readings[o + 6]).toBeCloseTo(340 / config.TOWER_WIDTH, 6);
    expect(sensor.readings[o + 7]).toBe(0.5);
  });

  test('the constructor controls slot count and input length', () => {
    const sensor = new Sensor(16);
    expect(sensor.slotCount).toBe(16);
    expect(sensor.readings).toHaveLength(16 * 4 + 8);
  });
});
