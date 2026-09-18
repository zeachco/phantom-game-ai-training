# Currently working on

## The circuit

A closed loop of road, bigger than the screen, with random left and right
turns. The camera follows the best scoring car around the loop while the
panel shows its brain.

## how it works

- The track is a radial curve `r(theta) = base + sum of random harmonics`,
  star-shaped so the random waves carve turns but can never cross themselves,
  resampled at even arc length.
- No traffic: solid obstacles sit on the road instead, and driving off the
  road kills, so the road is the only place to be.
- Score = a small trickle for moving + a checkpoint boost. Checkpoints are
  gates across the road, claimed in order around the loop, and a gate touched
  out of order subtracts its value, so a U-turn is a debt and donuts earn
  nothing.
- A crashed car stays as a corpse for 20 seconds, then gets deleted. A
  replacement rolls from the saved best of its line (a fresh random mutation
  inside the line's spread), keeping the cap of 200 live cars.
- A crashed brain overwrites its line's save when it beats it, so a line
  improves between generations. When every car has died once, the best seven
  are saved and a new generation starts from the saves.

car names are set as such:

- amount of neural layers
- neural network generation
- mutation index (0 being the original)

showing as `layers-gen-index`

### Score legend

- 👶 is first generation
- 💀 car has crashed (corpse deleted after 20s)
- 🏆 car has crashed with a higher score
- 💜 car is racing
- 💚 car is besting the best score
- 👻 ghost car from a previous generation
- 🧭 mixed brain
- 🏁 checkpoint, the followed car's next one glows
- 🚧 solid obstacle
