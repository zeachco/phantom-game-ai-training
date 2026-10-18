# Currently working on

## The cave

A small playable 3D cave. The cave and its collision queries are
deterministic and streamed in segments; the AI training pools live in
CaveRace, leaving the entry point to coordinate rendering, input and the
HUD. The camera follows the best scoring ball while the side panel shows
its brain.

## how it works

- The cave is a tube swept along a seeded 3D centerline: a chain of cubic
  Hermite segments (one per 240-unit segment), each turning the direction by
  a seeded random angle, with the radius a base plus long seeded waves plus
  a fine value-noise skin, so the same seed always yields the same cave.
  The tube is compressed vertically (half scale) and streamed: old segments
  are disposed in real time as the balls pass.
- The bottom center of the tube stays a flat drivable band while the sides
  keep their rough skin. The seed anneals the difficulty (a seed of 100+ is
  full difficulty, lower seeds are easier), and the variation compounds with
  depth, so the deeper sections are wilder than the first ones a ball ever
  sees.
- A path check runs once at construction, before any mesh is built, so every
  stretch keeps a drivable line: in-band rock columns keep a minimum gap on
  one side, every rough stretch with columns carries a launch ramp over the
  ground, and every ramp keeps a clear landing zone behind its lip. An
  impossible map can never be produced. `?path=1` in the URL draws the
  validated line, the ramp and landing zones, and the spots the fixer ran.
- The terrain is full of features: rock columns rising off the floor (some
  full-height, so they cannot be jumped), launch ramps whose lip sits just
  before a rough stretch, smooth raised roads, spinning coin pickups on the
  driving band, and bronze slabs that follow any arc of the tunnel
  circumference — floor, banks and ceiling.
- Each ball is a rolling sphere. A forward sensor cone reads the terrain
  ahead and feeds its brain; gravity, jumps and hard wall impacts decide who
  survives. A near head-on full-speed impact kills the ball; side contacts
  cost a point and shave the section gauge.
- Gates are rings across the tube, claimed in order along the tunnel. The
  cave is infinite: every time a brain completes the last gate the seed
  advances to a fresh random cave, and groups that already finished a cave
  return as a mutation-only swarm of their champion, so brains are selected
  for completing unknown caves, not for shaving frames off one known cave.
  A random explorer and a scout that re-runs the group's oldest saved line
  keep the population from converging on a single overfit brain.
- A section gauge kills any ball that stops making forward progress: it
  drains every frame and is refreshed by moving into a new 240-unit section,
  which pays its own score (scaled by race position), so forward progress is
  rewarded even when the decorative gate ring itself is missed.

### Score legend

- `+10` for each gate claimed in order (GATE_SCORE), plus a speed bonus
  (`GATE_SPEED_BONUS` / frames since the previous gate) on every gate but the
  finish gate.
- `+5` per 240-unit section of forward progress, divided by race position, so
  the leader banks more than the pack (SECTION_SCORE).
- `+1` for picking up a spinning coin (COIN_SCORE) **plus an explicit `+5`
  for the temporary boost the coin grants** (COIN_BOOST_REWARD): half a
  gate's payout, paid at pickup so taking a coin is a direct choice, not a
  speed byproduct. Each coin also adds a small permanent top-speed bonus.
- `-1` for touching an obstacle at speed, and `-1` for touching a gate ring
  out of order (WRONG_GATE_PENALTY).
- `+600` one-time for finishing all 18 gates on a seed (FINISH_BONUS) — the
  biggest payout in the game, so the line that gets selected is one that can
  complete the cave, not one that is merely fast on a known one.

### Human play

- WASD or the arrows steer, Space (or the gamepad primary button) jumps; the
  followed ball is drawn solid, the rest fade to 50%.
- `V` toggles the wireframe view, `R` advances the seed, `F12` opens the
  models panel, 1-9 follow a brain group, 0 the overall leader, backquote
  the mixed brain.
- The bottom HUD shows the section gauge (budget remaining to make forward
  progress), the next gate out of 18, frames since the previous gate, the
  latest gate and finish splits, and the current speed.
