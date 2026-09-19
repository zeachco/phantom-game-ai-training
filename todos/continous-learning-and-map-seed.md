# TODO: Continuous learning + seeded map (circuit game)

Status: implemented (2026-09-18), defaults per §8.

## Intent

Kill the generation cycle. Cars no longer live and die in generations: a crash is
just a respawn at the start, and learning is continuous. Per brain category,
exactly one thing survives — the best score and the brain that made it.

The map decouples from generations entirely. It no longer re-rolls on its own:
it is generated from a seed number, the seed is visible in the URL, and the map
only changes when the player sets a new seed or when any car completes a full
lap (which advances the seed).

This document is written as intent + rules, not as an implementation plan. It
should stay true even if the code around it changes.

## Vocabulary (stable terms)

- **Brain category / group** — the shape of the neural network (its layer
  count). "brain 3" = the group of 3-layer brains. A car belongs to exactly one
  group.
- **Pool** — the live cars of one group. Exactly 20 cars, slots indexed 0..19.
- **Best brain** — the group's current champion: a snapshot of the weights of
  the car that scored the group's best score so far, plus that score.
- **Seed** — a positive integer that fully determines the circuit.
- **Full lap** — one car having claimed all of the circuit's ordered gates in
  sequence (a complete loop, start to start).

## 1. No more generations

- There is no generation counter, no "all cars dead" gate, no end-of-generation
  save pass, and no "next generation" button/overlay.
- The 20-car pool of every group runs continuously and is always full: the
  frame a car crashes, its slot respawns a fresh car at the start.
- A crashed car's own state (score, position) is gone; what survives is only
  the group-level state described below.

## 2. Groups and pools

- Every brain category keeps a pool of exactly 20 cars, slots 0..19.
- A slot's identity is its index. The index is what determines the car's brain
  at spawn time (see §3).
- Cars are indistinguishable apart from their slot index and their group color.

## 3. Spawn ladder: mutations distributed by index

When a car is (re)spawned into slot `i` of group `G`, its brain is built from
`G`'s current best brain:

- `i = 0` — an exact clone of the best brain. Zero mutation.
- `i = k` (1..19) — a clone of the best brain mutated with factor
  `(k / 19) × maxMutation`. The ladder is linear: index 1 is roughly 1/20 of
  the way, index 19 is the full maximum mutation.
- `maxMutation` ("the maximum mutation given the generation") — since
  generations no longer exist, this is defined as a function of session
  progress, where progress is the number of full laps completed (i.e. how far
  the seed has advanced). Default: start at the historical max mutation level
  and shrink toward the historical min as the lap count grows, so early laps
  explore widely and later laps exploit. (Decision point, see §8.)
- The whole pool is therefore a spread of exploration around the current best:
  one pure clone and 19 progressively bolder mutations.
- When a group has no best brain yet (brand-new category, nothing scored):
  all 20 cars spawn with fresh random brains; the first car to score becomes
  the first best and the ladder takes over from the next respawn.

## 4. Best-brain promotion (live, per group)

- Each group tracks one best: `(bestBrain, bestScore)`.
- Promotion is live, not at death: the moment any car's score strictly
  exceeds the group's recorded best score, that car's brain is written
  immediately as the new best brain and its score becomes the new best score.
- Consequence: if car index 3 beats car index 0 (the clone of the current
  best), index 3's brain *is* the new best — the next time slot 0 respawns it
  will be a clone of index 3's brain.
- When car index 0 dies, it respawns as itself — i.e. a clone of the current
  best — unless some other car has already beaten that version, in which case
  it respawns as a clone of the newer best.
- Ties promote nobody: the bar only rises on a strict improvement.
- The best brain is a snapshot (a copy of the weights at the moment of
  promotion), so later changes to the promoting car's weights cannot alter it.

## 5. Death and respawn

- Crash (leaving the road or hitting an obstacle) → the slot respawns
  immediately at the start of the current circuit, with a brain rebuilt from
  the ladder (§3) and score 0.
- The bar (`bestScore`) never decreases within a map. A car must beat it from
  zero, which is the selection pressure that replaces generations.

## 6. What survives (persistence)

- Per brain category, the only saved artifact is the best brain + its best
  score. The old multi-model-per-layer saves and any generation history are
  gone; loading must tolerate/ignore legacy saves.
- Save timing: whenever a group's best changes (throttled is fine) and on page
  unload, so a reload never loses more than the most recent few minutes of
  progress.
- On load: a group with a saved best seeds its pool from it (slot 0 = clone,
  slots 1..19 = the ladder); a group without one starts fresh random.
- The map is not saved: it comes from the seed in the URL (§7).

## 7. Map and seed

- The circuit is generated deterministically from the seed: same seed → same
  track (centerline shape, road, gates, obstacles, start line and direction).
  All randomness in map generation must flow from a PRNG seeded with the seed.
- The seed is a positive integer, reflected in the URL as a hash fragment:
  `?game=circuit#circuit=<seed>` (e.g. `#circuit=12345454`). The game reads it
  from the hash on load and always keeps the URL in sync with the active seed
  (via history update, no reload), so a link is always a reproducible state.
- No seed in the URL on load → default to a random seed and write it into the
  URL (decision point, see §8).
- The "randomize circuit" button is replaced by a **seed input field**: it
  displays the current seed; the user types a new seed and applies it (enter /
  blur / apply) → the map regenerates from that seed.
- The map does not change on its own. The only two things that change it:
  1. the user applies a seed in the input field;
  2. **any car completes a full lap** → the seed advances (default: +1) → the
     URL updates → the map regenerates from the new seed.
- When the map regenerates (user or lap): the new track replaces the old one,
  every live car respawns at the start of the new track (brains rebuilt from
  each group's ladder), and each group's `bestScore` resets to 0 while the
  best brain (weights) is kept — the learning persists, the bar restarts on
  the new map (decision point, see §8).

## 8. Decision points (defaults chosen, confirm before implementing)

1. **Default seed when the URL hash is missing**: random (default) vs. fixed
   constant.
2. **Seed advance on full lap**: +1 (default — the sequence of maps a run went
   through is reproducible from the first seed) vs. a fresh random seed.
3. **`maxMutation` over time**: shrink with lap count (default) vs. constant
   historical max vs. constant historical min.
4. **Score bar on map change**: reset `bestScore` and keep the best brain
   (default) vs. keep scores cumulative across maps (then "best" is dominated
   by map-count, not speed) vs. reset both.
5. **Lap credit**: the first car to complete a full lap on a given seed
   advances the seed; further laps on the *new* map count normally (a lap is
   always "on the map the car is driving").

## 9. Removed / replaced (checklist for the implementing pass)

- [x] Generation counter + "NEXT GENERATION" overlay and button.
- [x] All-dead → new generation flow.
- [x] Multi-model-per-layer save/load (single best brain + score per category
      instead).
- [x] Per-generation map re-roll.
- [x] "Randomize circuit" button → seed input field.
- [x] Unseeded randomness in circuit generation → seeded PRNG.
