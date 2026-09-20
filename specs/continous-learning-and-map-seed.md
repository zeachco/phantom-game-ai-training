# Continuous learning + seeded map (circuit)

There are no generations. Each brain layer keeps a persistent pool of
CARS_PER_GROUP (10) cars; the mixed pool (MIXED_CARS, 10) appears once
saved experts exist. On any respawn the slot is refilled from a ladder:
slot 0 clones the group's best brain untouched. Each slot k > 0 mutates it
by the max mutation divided by k, clamped to Number.MIN_VALUE, so higher
slots stay closer to the original; the max mutation decays over
MUTATION_LAP_DECAY (50) laps.

Promotion is live: the moment a car beats the group's promotion bar its
brain is snapshotted as the group's best (see
seed-highscores-and-total-score for the bar).

The map is a pure function of a seed: all randomness (road waves,
narrow sections, obstacle positions, sizes, colors) flows from one
mulberry32(seed) stream, so the same seed rebuilds the identical map.
The seed lives in the URL hash (#circuit=<seed>) and a panel input; a
missing hash starts at 0. A seed advances once any car completes
LAPS_PER_SEED (3) full laps on it, then the map regenerates in place,
every pool respawns from its ladder and the per-seed score folds into
the total.

Map shape: the road is 3 lanes wide most of the way; 1-2 seeded
sections pinch one edge down to 2 lanes over a smooth cosine transition
(centerline unchanged, lane lines slide to the centerline through the
pinch). Obstacles (20) are never placed where the full 3-lane width is
missing — transitions included — and a block's gap to the road edge is
either at least one car width (OBSTACLE_PASS_GAP) or none: blocks that
would leave a sliver snap flush to the nearer edge. Walls declared at 90°
span across the road; multi-lane wall spans snap one projected edge to a
road boundary.

A car under CAR_STALL_SPEED (1 u/f) for CAR_STALL_TIMEOUT (5s) in a row
times out and dies through the normal death path.
