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
- [ ] in both circuit and highway, loading default model loads an old model that is trained with different sensors, giving a bad trained experience, let's disable the button for now

## In circuit game

- [ ] cars die after 7 seconds without crossing a checkpoint, there's a small text right to the controls showing remaining time with fixed 1 digit after coma
- [ ] lap should show 1/3 for the first lap and 3/3 for the last one (lap # not the index of the lap)
- [ ] mixed brain instances are not visibly playing on the circuit
- [ ] (feature change) before jumping to the next map seed, at least 3 cars group needs to finish the track (3 distinct neural structures, mixed experts group and human player can count), next to controls, a small message would appear as a success "completed" in green next to the circuit number or "unfinished" in yellow
- [ ] time to completion would be tracked per car, saved on the brain group, updated for each lap ( as an array lie [60.45, 55.2] when there's 2 laps in completing the 3rd one )
- [ ] diminish the mutation rate per index so there's less variation and mutation stay closer to the original model. clamp minimal mutation values to Number.MIN_VALUE to ensure index 1 at very high cumulated generation still makes a change
- [ ] 7 seconds elapsed time might yield different results based on performances, let's try to do the equivalent elapsed frames instead and and display a gauge instead of "x secs" budgets for checkpoint time checks
