# Continuous learning + seeded map (circuit)

There are no generations. Each brain layer keeps a persistent pool of
CARS_PER_GROUP (20) cars; the mixed pool (MIXED_CARS, 20) appears once
saved experts exist. On any respawn the slot is refilled from a ladder:
slot 0 clones the group's best brain, slot k mutates it by
(k / 19) × the max mutation, and the max mutation decays over
MUTATION_LAP_DECAY (50) laps.

Promotion is live: the moment a car beats the group's promotion bar its
brain is snapshotted as the group's best (see
seed-highscores-and-total-score for the bar).

The map is a pure function of a seed: all randomness (road waves,
obstacle positions, sizes, colors) flows from one mulberry32(seed)
stream, so the same seed rebuilds the identical map. Obstacles leave
either a gap of at least one car width (OBSTACLE_PASS_GAP) to the road
edge or none — blocks that would leave a sliver snap flush to the
nearer edge. The seed lives in the URL hash (#circuit=<seed>) and a
panel input. The first full lap on a seed advances it (seed + 1) and
regenerates the map in place; every pool respawns from its ladder and
the per-seed score folds into the total.
