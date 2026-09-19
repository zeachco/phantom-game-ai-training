# Seed high scores + summarized total (circuit)

Each group keeps `{current, seed, total, history}` of scores under its
own `circuit_score_*` localStorage key: `current` is the seed the score
set belongs to, `seed` is the high score on the current map, `total` is
the summarized promotion bar, and `history` holds the per-map highs by
seed.

On a seed change (first full lap, seed input, or a reload on a
different seed) the old map's high is finalized into
`history[oldSeed]` and folded into the bar:
`total = (total + seedHigh) / 2` — halving keeps recent maps dominant,
so the bar self-calibrates.

The promotion bar is the summarized total: a car promotes only when it
beats it strictly. The score board shows each group's total and the
current map high.

Model and score saves are staged per group and written to localStorage
only at save points: a car passes a checkpoint, a car crashes, the map
folds, or the page unloads.
