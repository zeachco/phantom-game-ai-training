import { describe, expect, test } from 'bun:test';
import type { AdaptiveDrawBudget } from '../src/utilities/adaptiveDraw';
import { createAdaptiveDrawBudget } from '../src/utilities/adaptiveDraw';

/** how many of the next `n` consume() calls claim a slot */
function drawable(budget: AdaptiveDrawBudget, n: number): number {
  let drawn = 0;
  for (let i = 0; i < n; i++) if (budget.consume()) drawn++;
  return drawn;
}

describe('createAdaptiveDrawBudget', () => {
  test('starts at the full pool and holds while frames fit the budget', () => {
    const budget = createAdaptiveDrawBudget(1_000_000);
    budget.begin(5);
    expect(drawable(budget, 10)).toBe(5);
    budget.end();
    budget.begin(5);
    expect(drawable(budget, 10)).toBe(5);
  });

  test('sheds one instance per over-budget frame, down to zero', () => {
    const budget = createAdaptiveDrawBudget(0);
    const counts: number[] = [];
    for (let i = 0; i < 6; i++) {
      budget.begin(4);
      counts.push(drawable(budget, 10));
      budget.end();
    }
    expect(counts).toEqual([4, 3, 2, 1, 0, 0]);
  });

  test('clamps the count when the pool shrinks', () => {
    const budget = createAdaptiveDrawBudget(1_000_000);
    budget.begin(5);
    budget.begin(3);
    expect(drawable(budget, 10)).toBe(3);
  });

  test('steps down on an over-budget frame and back up one per headroom frame', async () => {
    const budget = createAdaptiveDrawBudget(10);
    budget.begin(10);
    await Bun.sleep(20);
    budget.end();
    budget.begin(10);
    expect(drawable(budget, 10)).toBe(9);
    budget.end();
    budget.begin(10);
    expect(drawable(budget, 10)).toBe(10);
  });
});
