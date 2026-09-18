# TODO: Cross-game AI utilities refactor (highway + circuit)

Status: spec only — not implemented.

Priority: last. This task depends on every other feature in this folder at
the time it starts — implement them first, then refactor what they produced:

- `continous-learning-and-map-seed.md`
- `seed-highscores-and-total-score.md`
- `drift-and-steering-ui.md`
- `front-facing-sensors.md`
- `bugs.md` — whatever touches the code this refactor reorganizes

Any todo added to the folder before this task starts is also a dependency.

## Intent

`src/games/highway/` and `src/games/circuit/` are near-copies of each other:
the second game was built by cloning the first. Same side panel, same follow
buttons, same load/save/clear flow, same score board, same brain color
logic, same camera follow, same brain wiring.

The goal is to analyze all the AI shared utilities across both games and
reorganize them — into `src/ai/`, `src/utilities/`, or a new shared layer —
so that a new game project is a thin game-specific core (map, car, sensor
targets, scoring) wired onto shared infrastructure, instead of another
clone.

Written as intent + a short inventory, not an implementation plan.

## Shared today, duplicated across the two games

- **Neural network** — `src/ai/Network.ts`, `Mixed.ts`, `BaseConfig.ts`
  already exist; confirm both games route through them with no
  game-specific leakage.
- **Visualization** — brain panel + stats: `src/ai/Visualizer.ts` /
  `src/ai/v2/Visualizer.ts`.
- **Debug controls** — the side panel (load / save / clear training, stats
  toggle, follow buttons 0-9 + mixed, long-press / right-click reset,
  legend, footer), built identically in both `main.ts` files.
- **Game engine / game loop** — `src/utilities/three/GameLoop.ts`, camera
  lerp-follow, death / respawn / replacement flow, score sorting.
- **Canvas drawing** — `drawScores` board (gradient + emoji rows + model
  colors), duplicated in both `utilities.ts`.
- **Maths** — `src/utilities/math.ts` (lerp, rand, vectors, ray
  intersections used by the sensors).
- **Storage / URL** — `fileUtilities` (`src/ai/utils.ts`), model archives
  (`modelTransfer.ts`), `?clear=true` / hash handling.
- **Color** — `src/utilities/colors.ts` plus `mixedColor` / `modelColor` /
  `layerColor` (identical code in both `utilities.ts`).
- **Config** — the common fields of both `Config.ts` (brain counts,
  mutation levels, mixed-brain settings, sensor config) vs. the
  game-specific ones.
- **Exact duplicates that should just disappear** — `Controls.ts`
  (byte-identical in both games), and most of `utilities.ts` (~95%
  identical).

## Outcome

- A new game = `src/games/<name>/` with a map, a car, a sensor target and a
  score rule; brains, panel, board, saves, colors and the loop are reused.
- Both games keep behaving exactly as before — this is a reorganization,
  not a behavior change.
