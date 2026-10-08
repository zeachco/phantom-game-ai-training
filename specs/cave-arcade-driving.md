# Cave arcade driving (Mario Kart / Track Mania feel)

Status: implemented through phases 1-4 (commits 639d987, e84fff2, 9ba98d4,
b4cdd3f). 28/28 tests green (`bun test`). Phase 5 is the human playtest
tuning pass - every number below is a `Config.ts` knob, listed with its role
so tuning is a lookup, not an archaeology dig.

## The three ideas

1. **The map is a track, not a terrain.** The cave floor is a flat driving
   band (`CAVE_BAND_HALF_WIDTH = 0.36` rad, ~64 u wide) with the bumpy rock
   skin removed and the long wave breathing damped to a sliver
   (`CAVE_BAND_WAVE_DAMP = 0.85` keeps 15%). Outside the band the floor
   rises quadratically into steep banks (`CAVE_BANK_RISE = 30`), and the
   wave breathing ramps back over the bank span, so the shoulder between
   plateau and wall is rideable, not a step.
2. **The car absorbs the terrain.** Soft long suspension
   (`SUSP_SPRING 0.09 / SUSP_DAMP 0.45 / SUSP_TRAVEL 2.2 / SUSP_REST 2.3`)
   whose pre-contact zone glues the wheels to the band; landings are
   absorbed (`CAR_LANDING_VEL_ABSORB = 0.85` squats, never bounces); floor
   descents are capped (`CAVE_FLOOR_MAX_DROP = 0.3`) like climbs, so lips
   launch fast cars and never nosedive slow ones.
3. **Mistakes are recoverable.** A too-tight turn understeers instead of
   rolling over (`CAR_LATERAL_FRICTION = 1.2` caps the lateral force below
   the friction circle). A car that flips while fast performs a scripted
   flip back; a slow one rests on its roof, dragged and unpowered, and the
   liveness timer decides.

## Inverted car (the spec, implemented)

- `CAR_INVERT_THRESHOLD = -0.5`: past 120° of tilt the car is out of
  control. Before that it is in control and nothing interferes - the
  driver/AI can tilt and recover on their own.
- Inverted: the roof drags (`ROOF_FRICTION = 0.2`, stronger than the
  wheels' slide) and spin is killed (`ROOF_SPIN_DAMP = 0.9`). No
  propulsion (the existing `uprightTraction` gate).
- `CAR_SELF_RIGHT_SPEED = 3.5`: a car that crossed the threshold while
  moving faster than this performs a scripted flip back over
  `CAR_SELF_RIGHT_SUBSTEPS = 180` substeps (0.75 s) about the shortest-arc
  axis - a roll flip rights about the forward axis, a pitch flip about the
  lateral one. A slower car rests on its roof.

## Features on the band

- **Jump platforms** = the volatility-driven ramp, now a band-wide
  plateaued deck (`#plateauAcross`: flat over the whole band, falls away
  into the banks) with a flat lip and a smooth back slope
  (`height / 0.35` u, ~10°). Tinted cyan (`CAVE_PLATFORM_COLOR`).
  The launch comes from leaving the lip at speed, not from a sharp edge.
- **Boost pads** (`CAVE_BOOST_CHANCE = 0.5` per cell): amber patches
  (`CAVE_BOOST_COLOR`). Triggering sets `BOOST_DURATION = 90` frames of
  `BOOST_ACCEL = 0.3` push along the cave tangent, capped at the lifted
  top speed `CAR_MAX_SPEED + BOOST_SPEED_BONUS = 3` (fading linearly) -
  a burst to ~10 u/f, never a rocket. Pads refresh the timer, never stack.
- **Columns** (`CAVE_COLUMN_CHANCE = 0.6`): half are full-height
  (`CAVE_COLUMN_FULL_HEIGHT_CHANCE`, floor-to-wall, unjumpable), some grow
  inside the band but never on its center
  (`CAVE_COLUMN_IN_BAND_CHANCE`, offset 0.12-0.25 rad) to force weaving.
- **PathCheck** (`src/games/cave/classes/PathCheck.ts`, runs at
  construction): in-band columns must leave `CAVE_PATH_MIN_GAP = 9` u of
  passage on one side; volatile stretches with columns always get a launch
  ramp; every ramp keeps a clear landing zone. An impossible map cannot be
  generated.

## Brain inputs

The 19-ray fan is unchanged; the brain reads 11 scalars after it (rays ×2
history, 4 wheel compressions, speed, velocity delta, gate delta, then):
airborne, inverted, on-platform, on-boost, platform-ahead, boost-ahead,
column-proximity, column-side. Boost pads pay `BOOST_SCORE = 2` on a fresh
trigger. `CAVE_DIFFICULTY` (0..1, default 1) multiplies the seed-derived
difficulty so training can anneal from easy caves.

## Playtest checklist (phase 5 - tune these, in this order)

1. Band cruise: body height steady, no slide, steering rotates on command.
2. Ramp launch at full speed: a long clean arc, steerable mid-air, soft
   landing with squat. Same ramp at walking speed: rolls over the lip.
3. Bank excursion at speed: jumps the edge or slides back; never traps.
4. Full-speed flip: dramatic roof slide, scripted flip back, resume.
5. Boost pad: a visible punch to ~10 u/f that fades in ~1.5 s.
6. Weave section (in-band columns): one clear gap, always passable.
7. If anything feels off: `Config.ts` is the only file to touch.
