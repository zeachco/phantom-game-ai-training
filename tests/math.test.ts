import { describe, expect, test } from 'bun:test';
import { applyDeadzone } from '../src/utilities/math';

describe('applyDeadzone', () => {
  test('values inside the deadzone read as zero', () => {
    expect(applyDeadzone(0)).toBe(0);
    expect(applyDeadzone(0.05)).toBe(0);
    expect(applyDeadzone(-0.12)).toBe(0);
  });
  test('values outside are rescaled to keep full travel', () => {
    expect(applyDeadzone(1)).toBe(1);
    expect(applyDeadzone(-1)).toBe(-1);
    expect(applyDeadzone(0.5)).toBeCloseTo(0.4318, 4);
    expect(applyDeadzone(-0.5)).toBeCloseTo(-0.4318, 4);
  });
  test('a custom deadzone is honored', () => {
    expect(applyDeadzone(0.5, 0.5)).toBe(0);
    expect(applyDeadzone(0.75, 0.5)).toBeCloseTo(0.5, 4);
  });
});
