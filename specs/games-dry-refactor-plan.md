# Games DRY refactor plan

Cross-game consolidation for `src/games/` (highway, circuit, climb, cave).
The four games share one architecture — neural-network training experiments —
and a shared layer already exists in `src/utilities/` and `src/ai/`. This plan
lists the remaining duplication found by a full cross-game audit (2026-10-21)
and turns it into individually-committable, behavior-neutral refactor tasks.

## Rules for this effort

- **Behavior-neutral by default.** Every task keeps the app doing exactly what
  it does today. The only allowed behavior change is a bug fix that is also an
  improvement (marked UX/bug below).
- **One commit per task.** Tasks are ordered small → large; each commit lands
  only after the verification gate passes.
- **Verification gate per task:** `tsc && vite build` (the real gate) plus
  `bun test` (baseline: 192 tests, 2 pre-existing failures —
  applied-distill `[0,1]` steering and train-from `freed.distillRun`).
  A task is done when the baseline holds and `git diff` shows only the
  intended moves.
- **No new lint debt.** Lint is not a gate (pre-existing ~3.4k biome errors);
  changed files must not add diagnostics.
- **Nothing is pushed.** Local commits only.

## Areas of improvement (findings)

F1. `ControlType` enum copy-pasted in 4 `types.ts` (highway lacks `HUMAN`).
F2. `isDemo` + `likelyLagsOnHeavyJs()` duplicated in 3 `Config.ts`.
F3. Group-score persistence (`brainId`, `scoreKey`, `loadScores`,
   `saveScores`, `clearScoreRecords`, `foldScores`, `GroupScores`/`Group`
   interfaces) is a near-verbatim triple in circuit/climb/cave
   `utilities.ts` — the single largest low-risk DRY win.
F4. Input boilerplate: `GAMEPAD_DEADZONE`/`applyDeadzone` ×3,
   `#findGamepad` (DualShock name matching) ×3, the "typing in a form field"
   guard ×6 (Controls ×3, climb/cave `main.ts` keydown, `followKeys.ts`,
   `dom.ts` binders).
F5. Highway `Controls` uses `document.onkeydown =` assignment (clobbers other
   handlers, no cleanup) while the other three use `addEventListener` +
   `dispose()` — a latent bug (UX/bug).
F6. `resetBrainSaves` confirm/discard/re-init boilerplate ×4 in the
   `main.ts` files.
F7. `loadBaseModels(...)` fire-and-forget block (try/await/log/re-init/catch)
   ×4 in the `main.ts` files.
F8. URL seed read/write (`<game>=(\d+)` + `history.replaceState`) ×3.
F9. Distillation state (teacher / `#lastTeacher` / `teacherFrames` /
   `distiller` / `distillErrors` / `distillRun` / `frozenScore`) plus the
   identical `update()` branch, ~95% identical in all 4 entities
   (`Car` ×2, `Player`, `Ball`) — ~140 duplicated lines.
F10. Geometry math copies: segment/segment intersection offset formula ×3
   (highway `Sensor`, circuit `Sensor`, `math.getIntersection`),
   oriented-rect polygon + AABB rebuild byte-identical in highway/circuit
   `Car` (circuit `Obstacle.#corners` is the same convention generalized),
   and ~8 inline `Math.max(a, Math.min(b, x))` clamps while `math.ts` already
   has a `ratio()` that is a clamp under a misleading name.
F11. Race classes `CircuitRace`/`ClimbRace`/`CaveRace` (~950/845/908 lines)
   are 70–80% line-level clones: identical explorer/scout slot policy,
   spawn-with-mutation, expert refresh, pool building, train-from swap,
   teacher resolution, pending-save flush, `saveAll`, `refreshLeaderboard`,
   `resetBrainGroup`, `initialize` skeleton. Only `update()` (game rules)
   genuinely differs. Highway predates the Race-class refactor and is not a
   candidate.
F12. Legend row loops (span-per-line builder) duplicated in highway and
   circuit `main.ts`.

## Explicitly out of scope (do NOT extract)

- The three `update()` rule sets (laps vs floors vs gates/s-position),
  entity physics (2D car, 2D climber, 3D cannon-es ball), and score
  currencies — they are genuinely different.
- Highway's model-based scoring (no per-seed `GroupScores`) — any shared
  group-score API must stay optional for highway.
- `Config.ts` consolidation — every number and several semantics differ per
  game; only F2's env helpers move.
- World generation (`Circuit.ts`/`Tower.ts`/`Cave.ts`) and cameras — no real
  overlap (only the already-shared `mulberry32`).
- `#getReading` inside Sensors — obstacle vocabularies differ (highway
  anisotropic rays, circuit moving obstacles, cave 3D cone marching,
  climb slot-based non-ray sensor).
- `TimingBoard.ts`/`TrackScoreBoard.ts` — circuit-specific boards that differ
  from the shared `scoreBoard.ts`.

## Tasks (execution order)

### T1 — Shared `ControlType` (F1)
New `src/utilities/types.ts` with the `ControlType` enum including `HUMAN`.
All 4 games' `types.ts` re-export it (keeps existing imports working);
highway simply never assigns `HUMAN`.
Files: `src/utilities/types.ts` (new), 4× `src/games/*/types.ts`.

### T2 — Env helpers (F2)
New `src/utilities/env.ts` exporting `isDemo` and
`likelyLagsOnHeavyJs()`; circuit/climb/cave `Config.ts` import them.
Files: `src/utilities/env.ts` (new), 3× `Config.ts`.

### T3 — Shared input helpers (F4)
- `applyDeadzone(value, deadzone = 0.12)` → `src/utilities/math.ts`
  (pure, add a unit test).
- `findStandardGamepad(preferredIndex)` (DualShock name matching +
  `getGamepads` scan) → new `src/utilities/inputs/gamepadApi.ts`
  (distinct from the existing `inputs/Gamepad.ts`, which is a different
  keymap abstraction).
- `isEditableTarget(el)` → `src/utilities/dom.ts`, reused by the 3
  `Controls.ts`, `followKeys.ts`, `dom.ts`'s own binders, and the climb/cave
  `main.ts` keydown guards.
- `createLegend(lines)` → `src/utilities/dom.ts`, used by the highway and
  circuit `main.ts` legend builders (F12).
Files: `math.ts`, `dom.ts`, `followKeys.ts`, `inputs/gamepadApi.ts` (new),
4× `Controls.ts`, climb/cave `main.ts`, `tests/math.test.ts` (new, small).

### T4 — Controls migration (F4, F5)
Circuit/climb/cave `Controls` adopt the shared helpers (their per-game
semantics — signed throttle, held-jump, edge-jump, L2/R2 — stay local).
Highway `Controls` migrates from `on*` assignment to `addEventListener` +
`dispose()` (bug fix, UX/bug) and gains the same typing-target guard.
Files: 4× `Controls.ts`.

### T5 — URL seed helpers (F8)
New `src/utilities/urlSeed.ts`: `readSeedFromHash(game)` and
`writeSeedToHash(game, seed)`; circuit/climb/cave adopt.
Files: `urlSeed.ts` (new), 3× `main.ts`.

### T6 — `groupScores.ts` (F3) — biggest low-risk win
New `src/utilities/groupScores.ts`: generic `GroupScores`/`Group` shapes and
`brainId`, `scoreKey(game, group)`, `loadScores(game)`, `saveScores(game, …)`,
`clearScoreRecords(game)`, `foldScores` — parameterized by the game prefix.
Each game `utilities.ts` keeps only `defaultState`, its entity type alias,
and its extra fields (circuit `lapTimes`, climb `seedBest`, cave
`gateTimes`) plus the thin `scoreBoardRows` adapter. Storage keys are
unchanged, so saved scores load identically. Covered by
`climb-training.test.ts`.
Files: `groupScores.ts` (new), 3× `utilities.ts`.

### T7 — `makeResetBrainSaves` (F6)
New `src/utilities/resetBrainSaves.ts`:
`makeResetBrainSaves({ io, game, onReset, discardMixedOnLayer })` returning
the `(value: number | 'mixed') => void` handler. Confirm texts and the
per-game re-init callbacks stay at the call sites.
Files: `resetBrainSaves.ts` (new), 4× `main.ts`.

### T8 — `loadBaseModelsThen` (F7)
`src/ai/serverSync.ts` gains `loadBaseModelsThen(game, io, onWritten)`:
the shared try/await/log/catch with the `written` → re-init callback and the
online-retry listener wiring; all 4 `main.ts` call sites shrink to one line.
Files: `serverSync.ts`, 4× `main.ts`.

### T9 — `DistillDriver` (F9) — biggest overall win
`src/ai/distill.ts` gains a `DistillDriver` owning the distillation state and
the per-frame teacher branch (teacher-swap reset, `distillStep`, probe
handling, error capture). Entities hold one instance and keep their
`teacher`/`distillRun`/`teacherFrames`/`distillErrors`/`distiller`
read/write surface as passthroughs so game loops, the visualizer, and
`keepTrainedBrain` need no changes. The driver must support both score
modes: highway retains progress under the teacher; circuit/climb/cave
restore a pre-frame `frozenScore`. Covered by the distill/train-from/
loss-graph test suites.
Files: `distill.ts`, 4× entity classes.

### T10 — Geometry math helpers (F10)
`src/utilities/math.ts`: `segmentIntersectionOffset(ax,ay,bx,by,cx,cy,dx,dy)`,
`aabbOverlap(a, b)`, `orientedRectPolygon(x, y, angle, rad, alpha)` +
`updateAABB(points, box)`, and a clearly-named `clamp(value, min, max)`
(the existing `ratio()` keeps working as an alias). Highway/circuit `Car`
polygon builders and both 2D `Sensor` ray casts switch to the shared math;
the ~8 inline clamps in `src/games/` adopt `clamp`.
Files: `math.ts`, highway/circuit `Car.ts`, highway/circuit `Sensor.ts`,
stragglers found by `grep`.

### T11 — Race slot policy + expert library (F11, safe slice)
New `src/utilities/race/slotPolicy.ts`: pure functions for the
explorer/scout slot policy (`slotMutation`, `isExplorerSlot`, `isScoutSlot`,
`scoutSource`, `slotSource`) parameterized by the group-seed progress getter
and the explorer limit. New `src/utilities/race/expertLibrary.ts`:
`refreshExperts(state, io, dims)` + `invalidateStaleMixed(state, experts)`.
The three Race classes delegate to them; no method signatures change.
Files: 2 new files, 3× Race classes.

### T12 — `RaceBase<TEntity>` (F11, the big one — last)
New `src/utilities/race/RaceBase.ts`: a base class owning the shared
scaffolding — `groups`/`seed`/`pendingSaves` state, `setTrainFrom` +
`applyTrainFrom` (single-student swap, takes a `spawnStudent` callback),
`teacherScore`, `#teacherBrain`, `flushPendingSaves`, `saveAll`,
`refreshLeaderboard` (parameterized by the state entity array name),
`resetBrainGroup`, and the `initialize` skeleton (load layers + mixed
hydration + pool build + spawn human + population). `CircuitRace`,
`ClimbRace`, `CaveRace` extend it and keep only `update()`, their `spawnX`,
and their world-specific init extras. Done only after T11 lands, verified
against the full suite (climb/cave training + train-from tests) plus a
manual build. If verification reveals drift, T12 is split per method group.
Files: `RaceBase.ts` (new), 3× Race classes.

## Status

| Task | Area | Status |
|------|------|--------|
| T1   | F1   | pending |
| T2   | F2   | pending |
| T3   | F4, F12 | pending |
| T4   | F4, F5 | pending |
| T5   | F8   | pending |
| T6   | F3   | pending |
| T7   | F6   | pending |
| T8   | F7   | pending |
| T9   | F9   | pending |
| T10  | F10  | pending |
| T11  | F11  | pending |
| T12  | F11  | pending |
