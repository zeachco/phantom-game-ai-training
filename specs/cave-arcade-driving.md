# Cave arcade driving (Monkey Ball style)

The cave is a tube and the player is a single rolling sphere, not a car:
no suspension, engine or tire model. The ball is a point of radius
`BALL_RADIUS` resolved against the same analytic surface the mesh renders
(`Cave.nearestRadial`), so what the ball hits is exactly what is drawn.
Gravity pulls it down the slopes, and rolling drag is low enough that
valley momentum carries it into climbs and launches. Orientation is purely
visual — the quaternion spins as rolling; physics never reads it.

Every number below is a knob name; the values live in
`classes/Config.ts`, which is the only file tuning touches.

## Controls: two analog axes + jump

The brain writes exactly three outputs: `moveX` (camera-right), `moveY`
(forward along the cave) in [-1, 1], and `jump`.

- Human: WASD / arrows and the gamepad left stick (deadzone 0.12) drive the
  two axes; Space or the primary button jumps.
- A jump fires from a grounded contact within 55° of vertical, or inside a
  short coyote window after leaving one; a wasted AI jump hold drains a
  little of the section gauge.
- The speed cap is horizontal only, preserving vertical launch velocity.
- The axes live in the cave frame: forward is the horizontal part of the
  tangent, right is `forward x worldUp`.

## Ball physics (`Ball.ts`)

Per frame, a few velocity-bounded substeps of: gravity plus stick
acceleration, the running coin boost along the tangent, speed cap,
integration, then contact — push-out against the analytic tube mesh, then
against any wall slab as a solid box (surface overlap, pushed through the
nearest face). Slow contacts settle, hard ones bounce and scrub
tangential speed. A near head-on wall hit above `BALL_CRASH_SPEED` is
fatal, and the death penalty also bills the current speed, so dying fast
costs more. Rolling drag and the visual roll close the step.

Key knobs: `BALL_MAX_SPEED`, `BALL_RADIUS`, `BALL_ACCEL`, `BALL_GRAVITY`,
`BALL_ROLL_DRAG`, `BALL_AIR_DRAG`, `BALL_RESTITUTION`,
`BALL_BOUNCE_SPEED`, `BALL_WALL_SCRUB`, `BALL_CRASH_SPEED`,
`BALL_HIT_COOLDOWN_FRAMES`, `BALL_JUMP_SPEED`, `BALL_STALL_SPEED`.

## Depth: variation compounds as you go deeper

Feature cells are drawn once per seed, then scaled by a depth factor
(`Cave.depthAt(s)`: 0 at the mouth, 1 over `CAVE_DEPTH_RAMP`). Depth never
adds RNG draws, so every seed keeps the same feature layout and only its
intensity grows:

- columns and walls get taller, wider, and more likely; more of them land
  inside the driving band, and columns pair up more often;
- the easy road lane fades out with depth;
- terrain amplitude and volatility grow (volatility capped), raising the
  jump-ramp odds and the path check's forced ramps;
- walls do not exist at all near the mouth, so it stays an easy runway and
  the obstacles arrive with the rest of the compounding.

## Walls: vertical band obstacles

Each feature cell can carry a vertical wall across the driving band, with a
length of a fraction of the section and a Gaussian falloff across the band.
The wall is a solid slab, not a floor alteration: a pre-integration swept
check handles the front face, then after the tube contact the ball is
resolved against the slab and pushed out through the nearest of its front,
back, side and top faces. `Cave.wallRayDistance` lets the chase camera pull
in front of a slab so it can never sit inside one.

## Coins

Coins are the cave's collectibles: short runs of small spinning discs
floated above the road, streamed and disposed with their chunk. Rolling
over one pays a score plus a boost reward, starts a timed boost along the
cave tangent (overlapping pickups refresh, never stack), and banks a small
permanent top-speed bonus up to a cap. Each coin is collected at most once
per run. Knobs: `COIN_SCORE`, `COIN_BOOST_REWARD`, `COIN_BOOST_ACCEL`,
`COIN_BOOST_DURATION`, `COIN_SPEED_BONUS`, `COIN_PERMANENT_BONUS`,
`COIN_PERMANENT_CAP`, `CAVE_COIN_CHANCE`, `CAVE_COIN_MIN/MAX`,
`CAVE_COIN_SPACING`.

## Gates, score and liveness

- Gates are rings across the tube at `GATE_SPACING`; crossing them in order
  pays `GATE_SCORE` plus a speed bonus, and the last gate pays
  `FINISH_BONUS`. Out-of-order entries pay `WRONG_GATE_PENALTY`.
- Forward section progress pays `SECTION_SCORE / position`: the leader
  banks the full amount, 2nd half as much, and so on. Every frame, race
  position pays `POSITION_SCORE_SCALE / position`.
- A hard hit off a rock bank or wall slab pays `OBSTACLE_HIT_SCORE` (on
  cooldown) and drains some gauge; floor landings do not count.
- The section gauge drains every simulation step. Running it out retires
  the ball as a `gauge` death, as does staying under `BALL_STALL_SPEED`
  for the same budget (`stall`), or a fatal hit (`crash`).

## Training

`CaveRace` is the cave twin of the shared `RaceBase` pools: one group per
brain layer plus an optional mixed group, each a pool of `CARS_PER_GROUP`
balls spawning from the saved champion. Slot 0 clones the group's best;
the other slots mutate with an annealed ladder, plus an explorer slot
while the group has banked few gates and a scout slot that re-runs the
group's oldest hall-of-fame line, so a population never fully converges.
Every death settles the ball: a new group high promotes to `best` and the
hall of fame and persists; gauge deaths mark the group dirty, so a run
that exhausted its budget still saves the brain the next spawn mutates
from. Three distinct brain categories finishing the seed starts a short
countdown to the next seed. Saves live under the `cave_` prefix.

## Camera and sensors

The chase camera follows the best-scoring ball of the followed category
(anti-flicker hysteresis included). Any driving input keeps it on the human
ball; a human crash falls back to the best-scoring living ball. While an AI
ball is followed, `SensorViz` draws that ball's sensor fan: one ray line
each (shortened to the hit) plus a translucent cone surface over the rim.
Following the human hides it.

## Brain inputs and outputs

The sensor is a 9-ray cone (a center ray plus two concentric rings)
opening 120° along a blend of the ball's movement direction and the
direction to the gate a couple ahead, falling back to the cave tangent when
nearly still, with a cosine-bell reach from axis to rim. Two extra rays
stay world-up and world-down for the ceiling and the floor. Inputs, in
order:

1. each ray's normalized reading
2. each ray's surface class: -1 obstacle, +1 coin, 0 ground or miss
3. normalized speed, forward velocity, lateral velocity, grounded
4. feature block: airborne, on-platform, on-coin, platform-ahead,
   coin-ahead, column-proximity, column-side, gate-delta, gate-heading,
   gate-pitch

Outputs: `moveX`, `moveY`, `jump`.
