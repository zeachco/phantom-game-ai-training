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
  Groups are independent, so one category never waits for another, and the map
  never holds more than CAR_NB (200) AI cars at once.
- The moment a car beats its group's summarized total score, its brain is saved
  as the group's new best (live, not at death). The map is a pure function of
  a seed kept in the URL hash (`#circuit=<seed>`): same seed, same track; the
  seed input field changes it on demand, and any car completing
  LAPS_PER_SEED (3) full laps advances it by 1 — finishing is a save point,
  the finishing brain is saved first, like a crash. Each finished map's high
  score folds into the total with a halving, so recent maps dominate.

car names are set as such:

- `layers-slot` (there is no generation), e.g. `3-7` = 3-layer brain, slot 7.

### Score legend

- 💀 car has crashed (the corpse fades out over 5 s)
- 🏆 car has crashed with a higher score
- 💜 car is racing
- 💚 car is besting the best score
- 👻 line total (the bar) + map high
- 🧭 mixed brain
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
