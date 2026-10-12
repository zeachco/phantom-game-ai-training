# Climb: Icy Tower-style AI platformer

## Concept

A 2D platformer where 10 brain categories (9 network depths + the mixed brain)
each run a pool of 30 players that climb an infinite, seed-generated tower of
one-way platforms. The tower grows upward as the players climb; the ground
always remains; the camera follows the highest living player. Same training
framework as circuit/cave: pool slots (champion clone, mutation ladder,
explorer, scout, finished swarm), live promotion on a new seed best, hall of
fame, localStorage persistence via `fileUtilities('climb')`.

Physics and gameplay rules are **defined per frame at a 90 FPS reference**.
The simulation is not locked to 90 FPS: it runs every animation frame like
circuit, so on a faster machine the world simply runs faster — every frame
count (height budget, seed-change countdown, corpse fade, budgets) is counted
in simulation frames, which is what "10 seconds at 90 FPS" means in this
game: 900 frames.

## Decisions

- Game dir / registration / storage / hash: `climb` (`?game=climb`,
  `climb_<layer>` saves, `#climb=<seed>`).
- 30 players per brain group (10 groups = 300 AI + 1 human); 15 on
  `likelyLagsOnHeavyJs()` machines, 6 on the demo profile.
- Height budget: an AI player that fails to set a new personal-best height
  for 900 simulation frames dies (STALL_PENALTY). The human is exempt.
- Seed advance: when 3 groups hold `SEED_TARGET_FLOORS` (50 floors = 2500 u)
  on the current seed, a 10 s (900-frame) countdown runs, then the seed
  increments and platforms get harder/tighter. Manual `<` `>` and `R` still
  work.
- One-way platforms (jump through from below), single jump with coyote time
  (6 frames) + jump buffer (6 frames), no double jump.

## Files

```
src/games/climb/
  main.ts            canvas, camera, panel, HUD (port of circuit/main.ts)
  types.ts           ControlType enum
  utilities.ts       Group/GroupScores/defaultState/brainId/loadScores/drawScores
  classes/Config.ts  all tunables
  classes/Tower.ts   seeded platform generation + upward streaming + draw
  classes/Player.ts  physics, one-way landing, deaths, cartoon draw, brain
  classes/Sensor.ts  360° raycast
  classes/Controls.ts# keyboard + gamepad (left/right/jump)
  classes/ClimbRace.ts # pools, promotion, respawn, seed advance
  STREAM.md
tests/climb-physics.test.ts
tests/climb-generation.test.ts
tests/climb-sensors.test.ts
tests/climb-training.test.ts
```

Changed: `src/index.ts` registers `climb`. No `presets/` (nothing trained
yet), so no "Load models" button.

## World (Tower.ts)

- Fixed-width tower `TOWER_WIDTH = 640` with invisible side walls; the ground
  at y = 0 is solid and always present.
- Platforms are one-way rectangles. Rows are generated per seed with
  `mulberry32(seed)`: vertical spacing 32→42 u and width 140→60 u as
  difficulty `min(1, seed / 100)` rises; each row's landing point is drawn
  from the band reachable from the previous row (`JUMP_REACH = 55` u
  horizontal), clamped inside the walls.
- Streaming: `ensureAbove(highest living feet + 800 u)` generates new rows on
  demand; rows are never culled (a full seed is ≈ 70 platforms, memory is
  trivial, and culling would void the floor under respawned players).

## Physics (Player.ts, per frame at 90 FPS reference)

- `GRAVITY 0.75`, `JUMP_SPEED 9` (apex ≈ 54 u > max row spacing),
  `MAX_SPEED 3.5`, ground accel 0.6, air accel 0.21 (35 %), ground friction
  ×0.88 per idle frame (slides a little, not much), terminal −20 u/f.
- One-way landing: while falling, a platform top crossed between the
  previous and current foot position and overlapping the body width lands
  the player. Standing players re-check support each frame (walking off an
  edge starts the coyote window).
- Death: `vy ≤ −DEATH_VELOCITY` (14 u/f, ≈ 130 u of fall) → corpse keeps
  falling to the ground, then fades over `DEAD_LIFETIME` (3 s); or the 900
  frame height budget expires → same death + `STALL_PENALTY` (AI only).
- Score: +1 per new floor (`FLOOR_HEIGHT = 50` u) of personal-best height on
  the current seed; velocity deaths also subtract the impact speed.
- Respawn: a whole group respawns on the ground once every corpse has
  expired; slot 0 = champion clone, 1..N = capped mutation ladder (floor
  0.1, cap ÷10), last slot = fresh random explorer while the group is
  unproven (under 10 floors on the seed), second-to-last = scout
  re-exploring the oldest hall-of-fame line, finished groups demote to a 5
  player mutation swarm.

## Sensors & brain I/O

- Full 360° around the player, `SENSORS = 90` rays (4° apart) by default,
  parameter-controlled with a `?sensors=N` URL override (clamped 8..180).
- Ray length 300 u; hits platform edges, ground, side walls; reading =
  `1 − dist/length` (miss = 0), circuit's convention.
- Inputs = `[90 rays…, vx/MAX_SPEED, vy/JUMP_SPEED clamped ±1, grounded]`
  = 93; outputs = `[left, right, jump]` = 3 (derived from the enumerable
  `Controls` fields, cave's trick).

## Training (ClimbRace.ts)

- Port of `CircuitRace` with laps/checkpoints replaced by the height rules
  above. Live promotion: a new seed best saves the brain + hall-of-fame
  entry immediately, not on death.
- Human player always spawned: arrows/WASD + Space, DualShock (left stick +
  A); first drive input takes the camera, death gives it back.
- Seed advance and per-seed score history mirror circuit's `foldScores`
  (former records become HUD history, each seed starts fresh).

## UI (main.ts)

- Circuit's shell: side panel (Save/Import/Clear training/Clear records,
  follow keys 1–9/all/mixed with long-press reset, live network visualizer,
  legend, about), seed controls top-left, canvas-drawn scoreboard
  (💀💚💜🕹👻 + floor scores).
- Steer overlay: left/right stick, jump-input timeline, velocity vector,
  altitude + floor readout, height-budget gauge of the followed player.
- Camera: x pinned to the tower center; y lerps to the highest living
  player, biased slightly up.
- Simulation runs every animation frame (no fixed-timestep lock); the
  `HUMAN_FPS_CAP` (90) still applies while the human is followed, so the
  reference rate is what the human plays at.

## Graphics (cartoon geometry)

- Sky: vertical gradient + two parallax cloud layers.
- Platforms: rounded rects with warm fills and thick dark outlines; ground:
  grass-topped slab.
- Player: rounded-rect blob in group color, two eyes offset toward the
  facing, squash & stretch from vy, landing "poof" particles, fade-out
  corpse.
- Subtle dashed floor markers every 50 u.

## Tests (bun:test, mirroring tests/cave-*)

- physics: jump apex, coyote, jump buffer, one-way landing (only from
  above), slide damping, death velocity, height budget.
- generation: same seed → same rows, every row reachable from the one
  below, ground always present, difficulty scaling.
- sensors: ray hits on a known layout, normalization, miss = 0, count
  override.
- training: promotion on new seed best, group respawn after corpse expiry,
  seed advance after 3 groups pass the target, storage round-trip.

## Verification

`bun test`, `tsc` + `vite build` (`npm run ci`), `npm run lint` (biome).
Then `npm run dev` → `?game=climb`: play the human, watch AI climb, confirm
seed advance at 50 floors.
