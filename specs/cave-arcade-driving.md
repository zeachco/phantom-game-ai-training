# Cave arcade driving (Monkey Ball style)

Status: ball physics implemented. 24/24 tests green (`bun test`). The ball has
no button-triggered jump or airtime timer: valleys, gravity and carried velocity
launch it naturally. Every number below is a `Config.ts` knob, listed with its
role so tuning is a lookup, not an archaeology dig.

## The shape of the game

The `2026-10-08` pass replaced the four-wheel raycast chassis (and the whole
car class) with a single rolling sphere, the Monkey Ball model:

- The cave is a tube. The ball is a point of radius `BALL_RADIUS` that is
  resolved against the same analytic surface the mesh renders
  (`Cave.nearestRadial`), so what the ball hits is exactly what is drawn.
- Gravity (`BALL_GRAVITY`) pulls it down the slopes; it settles on the floor
  band and rolls. There is no suspension, no engine and no tire model.
- Motion preserves momentum: `BALL_ROLL_DRAG = 0.999` on the ground and
  `BALL_AIR_DRAG = 0.9999` in flight let the ball carry valley speed into its
  climb and launch naturally.
- Orientation is purely visual. `Ball.quat` spins by `omega = (n x v) / r`
  (`n` the inward contact normal), so the sphere reads as rolling. Physics
  never reads the quaternion.

## Controls: two analog axes

`Controls` has exactly two outputs, `moveX` (right) and `moveY` (forward),
both in `[-1, 1]` - a GameCube stick. There is no jump button or airtime
state.

- Human: WASD / arrows contribute +/-1 per axis; opposite keys cancel; the
  left stick (axes 0 and 1) drives with a deadzone. The two sources sum and
  clamp.
- AI: the brain writes `moveX`/`moveY` directly, so the network has two output
  channels (`Object.keys(controls)` derives the count).
- The speed cap is horizontal only, preserving vertical launch velocity.
- The stick vector is normalized in `Ball.#move`, so diagonals are not faster
  than the axes.
- `moveY` is forward along the track, `moveX` is the camera-right direction:
  `right = forward x worldUp`, where forward is the horizontal part of the cave
  tangent (falling back to the velocity when the tangent is near vertical).

## Ball physics (`Ball.ts`)

Per frame, `PHYSICS_SUBSTEPS` substeps of:

1. `#refreshFrame`: tangent (forward), tube normal (up) and binormal (right)
   from `Cave.frame`. The sensor fan lives in this plane.
2. Gravity plus `BALL_ACCEL` along the stick direction.
3. A running boost pushes along the cave tangent up to the lifted cap.
4. Speed cap, integration, and `s` advance along the tangent.
5. `Cave.nearestRadial` contact: push out by `radius + hit.dist`, then split
   the normal velocity. Slow contacts settle (`BALL_BOUNCE_SPEED`), hard ones
   bounce (`BALL_RESTITUTION`) and scrub tangential speed
   (`BALL_WALL_SCRUB`). A near head-on hit above `BALL_CRASH_SPEED` is fatal.
6. Rolling drag, then the visual roll.

Key knobs: `BALL_MAX_SPEED 6` (a boost item is the only way past it),
`BALL_RADIUS 1.4`, `BALL_ACCEL 0.17`, `BALL_GRAVITY 0.085`,
`BALL_ROLL_DRAG 0.999`, `BALL_AIR_DRAG 0.9999`,
`BALL_RESTITUTION 0.42`, `BALL_WALL_SCRUB 0.85`, `BALL_CRASH_SPEED 8`.

## Depth: variation compounds as you go deeper

Feature cells are drawn once per seed, then scaled by a depth factor
(`Cave.depthAt(s)`: 0 at the mouth, 1 over `CAVE_DEPTH_RAMP = 2600`). Depth
never adds RNG draws, so every seed keeps the same feature layout and only
its intensity grows:

- columns and walls get taller (`CAVE_DEPTH_HEIGHT`), wider, and more likely
  (`CAVE_DEPTH_CHANCE`); columns pair up more often and more of them land
  inside the driving band;
- the easy road lane fades out (`CAVE_ROAD_CHANCE * (1 - 0.35 * depth)`);
- volatility is multiplied by `1 + 0.4 * depth` (capped 1.6), which in turn
  raises the jump-ramp odds and the path check's forced ramps;
- walls do not exist at all below `depth 0.15`, so the mouth stays an easy
  runway and the obstacles arrive with the rest of the compounding.

## Walls: vertical band obstacles

Each feature cell can carry a vertical wall across the driving band:

- `CAVE_WALL_CHANCE` per cell; the wall's length along the cave is a fraction
  of `CAVE_SEGMENT_LENGTH` between `CAVE_WALL_MIN_FRACTION` (1/8) and
  `CAVE_WALL_MAX_FRACTION` (1/3), so it takes 30-80 of the section's 240 units.
- Height `CAVE_WALL_MIN..CAVE_WALL_MAX` (generator units, world Y = x0.5),
  with a Gaussian falloff over `CAVE_WALL_ANGLE` so it spans the band. The
  raised top is an explicit mesh over the same 1/8..1/3-section interval as
  its collision surface; both end faces are vertical. Walls no longer alter
  the analytic cave floor, which previously caused stray collisions behind
  the visible doorway.
- `Cave.wallAt` and the pre-integration swept check block the visible front
  face; `Cave.wallSurfaceAt` is shared by the top mesh and the ball's landing
  collision. The angular extents also share one width calculation. Valley
  momentum, not a jump button, launches the ball over obstacles.

## Boost items

Boost pads are the trigger and the glowing items are their face:

- `Cave.boostAt(s, a)` still defines the pad influence. Rolling over it starts
  `BOOST_DURATION = 90` frames of `BOOST_ACCEL = 0.32` along the tangent, which
  lifts the top speed by `BOOST_SPEED_BONUS = 4` fading linearly over the
  timer. Overlapping items refresh, never stack. The first AI collection pays
  `BOOST_SCORE = 2`.
- `Cave.#buildChunk` floats a spinning `IcosahedronGeometry` orb
  (`CAVE_BOOST_ITEM_RADIUS`, `CAVE_BOOST_ITEM_COLOR`) above each pad, streamed
  and disposed with its chunk. `Cave.update` spins the orbs. `boostItemCount()`
  reports how many are meshed.

## Gates, score and liveness

Unchanged from the car version and ported into `Ball`:

- Gates are rings across the tube at `GATE_SPACING`; crossing them in order
  pays `GATE_SCORE`, a speed bonus, and `FINISH_BONUS` on the last one.
  Out-of-order entries pay `WRONG_GATE_PENALTY`.
- Forward section progress resets `SECTION_BUDGET_FRAMES`; no progress, or
  staying under `BALL_STALL_SPEED` for the same budget, retires the ball.

## Brain inputs

The 19-ray fan runs in the track plane (forward/right from the cave frame)
plus one ray up and one down the tube normal. After the rays x2 history:

1. normalized speed
2. forward velocity component
3. lateral velocity component
4. grounded (1/0)

then the feature block: airborne, on-platform, on-boost, platform-ahead,
boost-ahead, column-proximity, column-side, gate-delta. Outputs: `moveX`,
`moveY`.

## Files

- `classes/Ball.ts` - sphere physics, gates, score, brain wiring.
- `classes/Controls.ts` - two-axis stick (keyboard + gamepad + AI).
- `classes/Cave.ts` - tube geometry, gates, boost pads and boost-item orbs.
- `classes/ChaseCamera.ts` - follows the ball, frames `BALL_RADIUS`.
- `classes/Sensor.ts` - the analytic ray fan.
- `main.ts` - rendering, HUD, stick display.

## Playtest checklist

1. Roll from spawn: the ball settles on the band and accelerates smoothly.
2. Stick right: moves camera-right; stick back: brakes then reverses.
3. Boost item: a visible punch past `BALL_MAX_SPEED`, fading in ~1.5 s.
4. Bounce off a bank at speed: springs back, not a dead stop.
5. Weave section: one clear gap, always passable.
6. If anything feels off: `Config.ts` is the only file to touch.
