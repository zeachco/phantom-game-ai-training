# Bugs

Single running list of known bugs across the games. Each entry is one line: what is wrong.

- [x] All cars render the checkpoint sensor while only the car in focus needs to render it.
- [x] Clearing neural network data in either game (highway or circuit) clears both games' saves. Keys are prefixed per game, so the clear should only remove that game's own keys (`io.discardModels()` does `localStorage.clear()`; `io.discardGameModels()` already does the prefixed clear and should be used instead).
- [x] for both highway and circuit games, limit the brains to 9 variants, we can't preview a brain with 10+ hidden layers as keyboard shorcuts are just covering from 1..9
- [x] swap space and zero bindings (both games) so that space selects all cars and zero selects the mixed braind (0-...)
- [ ] in games using the gamepad to catch all keystrokes, it prevents from using F12 or inspect keys, even opening the bookmarks, seems like every keyboard strokes is captured, it should capture only the ones which are actually bound to something
