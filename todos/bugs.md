# Bugs

Single running list of known bugs across the games. Each entry is one line: what is wrong.

- [x] All cars render the checkpoint sensor while only the car in focus needs to render it.
- [x] Clearing neural network data in either game (highway or circuit) clears both games' saves. Keys are prefixed per game, so the clear should only remove that game's own keys (`io.discardModels()` does `localStorage.clear()`; `io.discardGameModels()` already does the prefixed clear and should be used instead).
- [x] for both highway and circuit games, limit the brains to 9 variants, we can't preview a brain with 10+ hidden layers as keyboard shorcuts are just covering from 1..9
- [x] swap space and zero bindings (both games) so that space selects all cars and zero selects the mixed braind (0-...)
- [x] in games using the gamepad to catch all keystrokes, it prevents from using F12 or inspect keys, even opening the bookmarks, seems like every keyboard strokes is captured, it should capture only the ones which are actually bound to something
- [x] cars that never move or crash keep an experiment alive forever: each car needs its own 2-minute cap (per-car timer, not a global one) and ends when it is reached
- [x] car saves are written to local storage too often: since scoring changed, a save should update at most when the car passes a checkpoint or crashes
- [x] obstacles could leave a gap to the road edge that the sensors see but a car cannot fit through: the gap must be at least one car width, or zero (block snapped flush to the edge)
- [x] the steering wheel spokes are not centered on the wheel in the middle position, and the pedals only travel to the middle of the box when fully pressed (gas was too weak to drift: tripled)
- [x] when pressing arrows to control the human car, the camera now follows the human until it crashes
- [x] the road sometimes goes from 3 lanes to 2 lanes (seeded pinched sections); where there is not at least the full 3-lane width (transitions included) no obstacles are placed
- [x] in both circuit and highway, loading default model loads an old model that is trained with different sensors, giving a bad trained experience, let's disable the button for now

## In circuit game

- [x] cars die after 7 seconds without crossing a checkpoint, there's a small text right to the controls showing remaining time with fixed 1 digit after coma
- [x] lap should show 1/3 for the first lap and 3/3 for the last one (lap # not the index of the lap)
- [x] mixed brain instances are not visibly playing on the circuit
- [x] (feature change) before jumping to the next map seed, at least 3 cars group needs to finish the track (3 distinct neural structures, mixed experts group and human player can count), next to controls, a small message would appear as a success "completed" in green next to the circuit number or "unfinished" in yellow
- [x] time to completion would be tracked per car, saved on the brain group, updated for each lap ( as an array lie [60.45, 55.2] when there's 2 laps in completing the 3rd one )
- [x] diminish the mutation rate per index so there's less variation and mutation stay closer to the original model. clamp minimal mutation values to Number.MIN_VALUE to ensure index 1 at very high cumulated generation still makes a change
- [ ] 7 seconds elapsed time might yield different results based on performances, let's try to do the equivalent elapsed frames instead and display a gauge instead of "x secs" budgets for checkpoint time checks
- [x] update obstacles to use round objects only, with white outlines, gray interiors, and a dotted white/red secondary outline; preserve safe road gaps
- [ ] as the seed of the racing circuit augment, there's more and more tight curves. Seed can go up to the infinity so it could be used as a base divisor to set the curve difficulty (difficulty = 10/(10+seed)) and use the difficulty to add more often hard curves and make the hard curves more intense. At maximum diff, we could have almost zigzag shaped curves.
- [x] add as input the current vector velocity of the car and it's relative angle to the front similar to the vector pointing to the next checkpoint, -1.0 to 1.0 for the vector angle and it's delta with the front of the car.
- [ ] add a maximum fps toggle that's off by default that limits 60 fps and auto enables when the player is playing (camera following the player)
- [ ] add 40% to the front distance for sensors
- [ ] orange UI: move controls to the right, move seed to the top-left, and replace the seed input with a number div plus < and > buttons that change the map and URL immediately
- [ ] purple UI: change the Follow buttons to a four-column grid
- [ ] yellow/green UI: place the explanatory text beside the legend to save vertical space, and make the text area vertically scrollable with overflow auto
- [ ] neural network UI: use the selected brain group's color for DOM borders; use light gray for mixed DOM elements to avoid per-frame DOM color updates while keeping the canvas visualization matched to the mixed selection
- [x] road can have up to 4 lanes, obstacles are less frequent, max obstacle width is 80% of half the available lane width, none when lane is one lane width
