# Currently working on

## The circuit

A closed loop of road, bigger than the screen, with random left and right
turns. The camera follows the best scoring car around the loop while the
panel shows its brain.

## how it works

- The track is a radial curve `r(theta) = base + sum of random harmonics`,
  star-shaped so the random waves carve turns but can never cross themselves,
  resampled at even arc length.
- No traffic: gray, white-outlined circles and angled walls sit on the road
  instead, and driving off the road kills, so the road is the only place to be.
- Score comes from checkpoint boosts, with each reward equal to the greater of
  `10` and `1000 /` the frames taken since the previous checkpoint. Checkpoints are gates across
  the road, claimed in order around the loop, and a gate touched
  out of order subtracts its value, so a U-turn is a debt and donuts earn
  nothing. Every car also runs a 7 s countdown between gates: reach the next
  checkpoint or the car dies like a collision (the followed car's remaining
  time shows in the "secs" badge of the bottom HUD).
- There are no generations: a crash leaves the car as a corpse that fades out
  over 5 s. A brain category waits until every car in its pool is dead and the
  corpses are gone, then respawns the whole pool together — slot 0 clones the
  group's best brain, the higher slots carry progressively bolder mutations.
  Once one of a group's cars crosses the finish line, that group is demoted: it
  respawns 5 cars on slots 1..5, every one of them a mutation, and the untouched
  original is out of the pool for good (a map change or a manual reset rebuilds
  the full ladder). Groups are independent, so one category never waits for
  another, and the map never holds more than CAR_NB (200) AI cars at once. The
  bottom HUD shows the three fastest brain groups by completed-lap timing,
  measured in simulation frames.
- The moment a car sets a new high on the current track, its brain is saved
  as the group's new best (live, not at death). The map is a pure function of
  a seed kept in the URL hash (`#circuit=<seed>`): same seed, same track; the
  seed input field changes it on demand, and any car completing
  LAPS_PER_SEED (3) full laps advances it by 1 — finishing is a save point,
  the finishing brain is saved first, like a crash. Each finished map's high
  is recorded in the group's history; the scoreboard and promotion never
  compare against previous tracks or a blended cross-map total, training
  history lives in the weights the pools respawn from.

car names use a capital brain ID followed by the mutation index:

- `A3` = one hidden layer, mutation index 3.
- `Z3` = mixed brain, mutation index 3.

### Score legend

- 💀 car has crashed (the corpse fades out over 5 s)
- 🏆 car has crashed with a higher score
- 💜 car is racing
- 💚 car is leading its group on this track
- 👻 track record, frozen when its holder died; ghost colors match the line
- 🧭 Z
- 🏁 checkpoint, the followed car's next one glows
- 🚧 gray obstacle (circle or wall)
- 🕹 human car, driven with the arrows or WASD

### Human play

A \"Human play\" checkbox in the panel spawns one brainless car driven with
the arrows or WASD (up/W throttle, down/S brake-then-reverse, left/A and
right/D steer). It is a watcher, not a participant in training: no network,
no saves, no group — its score competes in the live list and it can be
followed by the camera, but it never writes into the AI pipeline. Crashing
respawns a fresh human car; unchecking removes it.

### Human play

A "Human play" checkbox in the panel spawns one brainless car driven with
the arrows or WASD (up/W throttle, down/S brake-then-reverse, left/A and
right/D steer). It is a watcher, not a participant in training: no network,
no saves, no group — its score competes in the live list and it can be
followed by the camera, but it never writes into the AI pipeline. Crashing
respawns a fresh human car; unchecking removes it.
