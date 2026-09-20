# Continuous learning and seeded maps (circuit)

There are no generations. Each brain layer runs a pool of `CARS_PER_GROUP`
(10) cars; the mixed pool runs 10 cars once at least two saved experts exist.
Slot 0 clones the group's best brain. Slot `k > 0` mutates it with the
maximum mutation divided by `k`, clamped to `Number.MIN_VALUE`; the maximum
decays over `MUTATION_LAP_DECAY` (50) laps.

The map is deterministic from its seed. The seed is mirrored in
`#circuit=<seed>` and rebuilding it reproduces the same road, sections,
checkpoints and obstacles. Model changes are promoted live and saves are
staged until checkpoint, crash, map-fold or unload save points.

A map waits for three distinct finish identities (brain layer, mixed brain or
human) to complete the required three laps. Finished cars freeze, then a
short countdown precedes the next seeded map.

Obstacles are round only, 12 per map, and preserve either a full car-width
edge gap or no sliver. The Load models button is disabled in circuit and
highway until archived models match the current sensor layout.
