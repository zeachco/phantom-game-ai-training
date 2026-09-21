# Continuous learning and seeded maps (circuit)

There are no generations. Each brain layer runs a pool of `CARS_PER_GROUP`
(10) cars; the mixed pool runs 10 cars once at least two saved experts exist.
Slot 0 clones the group's best brain. Slot `k > 0` mutates it with the
maximum mutation divided by `k`, clamped to `Number.MIN_VALUE`; the maximum
decays over `MUTATION_LAP_DECAY` (50) laps. A group waits until all of its cars
are dead and their corpses have faded, then respawns every slot together;
groups do not wait for one another.

The map is deterministic from its seed. The seed is mirrored in
`#circuit=<seed>` and rebuilding it reproduces the same road, sections,
checkpoints and obstacles. Later seeds increase curve amplitude and add up to
four higher-frequency harmonics, making hard curves more frequent and intense. Model changes are promoted live and saves are
staged until checkpoint, crash, map-fold or unload save points.

A map waits for three distinct finish identities (brain layer, mixed brain or
human) to complete the required three laps. Finished cars freeze, then a
short countdown precedes the next seeded map.

While the human car is followed, the optional shared game loop cap limits
simulation/render callbacks to 60 FPS. The road defaults to three 60-unit lanes. Seeded sections smoothly change by
one lane at a time between one and four lanes; only the closing lane's divider
merges into a neighbor, while unaffected dividers stay separate. One-lane
sections have no obstacles. Other sections use 12 round obstacles and
preserve either a full car-width edge gap or anchor to an edge with half the
obstacle off-road. The Load models button
is disabled in circuit and highway until archived models match the current
sensor layout.
