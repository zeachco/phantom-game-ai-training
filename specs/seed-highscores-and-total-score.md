# Seed highscores and summarized total (circuit)

Each brain group stores `{ current, seed, total, history }` under its own
`circuit_score_*` localStorage key. `seed` is the current-map high score,
`total` is the summarized promotion bar, and `history` stores finished-map
highs by seed.

Scores and model snapshots are written at checkpoint, crash, map-fold and
unload save points. A group promotes only when a car strictly beats its total
bar. When three distinct brain identities finish the required laps, finished
cars freeze, a short countdown runs, and the next seed is generated; the old
map high is folded into the total with `(total + seedHigh) / 2`.
