/**
 * Adaptive instance drawing.
 *
 * Every frame a game draws its essential instances (the followed entity, the
 * human and each group's original model) plus as many of the remaining
 * instances as `consume()` allows, in leaderboard order, so when the budget
 * is tight the lowest-scoring tail of the pool is what stops rendering.
 *
 * The allowed count moves at most one step per frame instead of snapping: a
 * frame whose instance section ran over the budget sheds one instance for the
 * next frame, a frame with headroom earns one back. The count settles at the
 * largest population that fits the budget, so the rendered instance count
 * eases toward it one per frame instead of jumping from the full pool down
 * to the essentials the moment the budget is first exceeded.
 */
export interface AdaptiveDrawBudget {
  /**
   * Claim a slot for one non-essential instance. Returns true and spends one
   * of this frame's slots when the instance should be drawn, false once the
   * frame's count is used up. Callers skip this for the essential instances,
   * which always draw.
   */
  consume(): boolean;
  /**
   * Open the frame's instance section. `poolSize` is the total number of
   * instances (essentials included); the count starts at the full pool and
   * is clamped to it from then on.
   */
  begin(poolSize: number): void;
  /**
   * Close the section: measures how long it took and steps the allowed count
   * by one for the next frame.
   */
  end(): void;
}

export function createAdaptiveDrawBudget(budgetMs: number): AdaptiveDrawBudget {
  // slack on either side of the budget so the count settles on one frame
  // cost instead of stepping back and forth across the edge
  const slack = budgetMs * 0.2;
  let total = 0;
  let count = 0;
  let drawn = 0;
  let startedAt = 0;
  let primed = false;

  return {
    consume() {
      if (drawn >= count) return false;
      drawn++;
      return true;
    },
    begin(poolSize: number) {
      total = poolSize;
      if (primed) {
        if (count > total) count = total;
      } else {
        count = total;
        primed = true;
      }
      drawn = 0;
      startedAt = performance.now();
    },
    end() {
      const elapsed = performance.now() - startedAt;
      if (elapsed > budgetMs + slack) count = Math.max(0, count - 1);
      else if (elapsed < budgetMs - slack) count = Math.min(total, count + 1);
    },
  };
}
