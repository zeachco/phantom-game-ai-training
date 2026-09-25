# Seed highscores and summarized total (circuit)

Each brain group stores `{ current, seed, total, phantom, history }` under its
`circuit_score_*` localStorage key. `seed` is the current-map high score and
the only reference the live board uses; `phantom` keeps the last finished
map's high as a record, `total` mirrors the current-map high, and `history`
stores finished-map highs by seed. `total` and `phantom` are retained for
storage compatibility and are never used for display, ordering or promotion.
The visible ghost is saved only when the record holder dies: its frozen score
becomes the chase target, and it stays hidden while a board car already shows
that score, so the leader is never doubled by its own ghost.

Scores and model snapshots are written at checkpoint, crash, map-fold and
unload save points. A group promotes live when a car sets a new high on the
current track. When three distinct brain identities finish the required laps,
finished cars freeze, a short countdown runs, and the next seed is generated;
the old map high is recorded in the history and the bar restarts at zero, so
training history lives in the weights, not in a cross-map score blend.
