# Cave arcade driving plan (Mario Kart / Track Mania feel)

Status: FINAL — strategy + concrete implementation targets. Execute phases in order,
commit + push after each phase. (Repo: this is an AI-training game — sensor/reward
changes are part of scope, §5.)

## 0. Code facts (from recon, 2026-10-08)

- The cave is an **analytic tube**: ground surface = `center(s) + radius(s,a)·normal`,
  `Cave.radius(s,a)` (Cave.ts:551) is the single ground-height query; `frame(s,…)`
  (Cave.ts:594) gives tangent/normal/binormal; `castRay` (Cave.ts:698) and
  `castWheelRay` (Cave.ts:720, binary-search refinement) do collision queries.
  Floor profiles are computed by **backward ray-march** (Cave.ts:509-543) which
  guarantees no hidden spikes — any shaping must preserve this property.
- Features are **cached per FeatureCell** (`Cave.#featureCell`, Cave.ts:337;
  `CAVE_FEATURE_CELL=280`): per cell — volatility, **road lane** (`centerS, halfLen,
  centerA, halfA, rise`), **columns** (1-2, Cave.ts:359-384, height 14-34),
  **jump ramp** (volatility-driven, `CAVE_RAMP_CHANCE=0.85`). `#roadInfluence`
  (Cave.ts:405) raises the lane and damps bump noise; `#featureRadiusDelta`
  (Cave.ts:424) applies columns + ramps; `#bump` (Cave.ts:476) is the value-noise
  skin (`CAVE_BUMP_WAVE=6`), `#rawRadius` (Cave.ts:499) = base + waves + bumps -
  features.
- **Mesh is streamed per frame**: `Cave.update(minS,maxS)` (Cave.ts:900) rebuilds
  chunks in the car's window and disposes old ones → per-frame terrain changes are
  fine as long as FeatureCells stay stable (they do).
- Car (Car.ts, 904 lines): 4 raycast wheels, **world-frame** angular velocity
  (avx/avy/avz — known gotcha: express new torques in world frame), 4 physics
  substeps at 60 Hz (`Car.update`, Car.ts:309). Existing: anti-roll/
  anti-pitch, air-leveling assist (Car.ts:768-807, `CAR_AIR_LEVEL_*`), landing
  spin+velocity damping (Car.ts:570-581), `uprightTraction = max(0, uy)`
  (Car.ts:739) kills inverted propulsion, flip does not kill (liveness
  `SECTION_BUDGET_FRAMES=2200`).
- Sensors (Sensor.ts): 19-ray 120° fan + 2 vertical rays, `#read` → proximity
  0..1, reach 336/202. `config.SENSORS=19` feeds the AI input vector.
- Tests: `bun test` — `tests/cave-physics.test.ts` (280 l),
  `tests/cave-terrain.test.ts` (89 l), `tests/cave-camera.test.ts`.

## 1. Design goals (fun first, realism second)

1. **Always in control.** On the flat band the car is grippy: high lateral
   friction, responsive steering, no sliding. Slip is rare and dramatic, never
   the default state.
2. **Terrain is something to ride, not something that punishes.** The car
   absorbs bumps with soft, well-damped suspension + ground glue and stays on
   the surface. Small undulations are invisible; only intentional features
   (ramps, jumps, banks) are felt.
3. **Speed is preserved.** Landings damp instead of bouncing, the roof slide is
   grippy not slick, and the track always has a line you can hold.
4. **Mistakes are recoverable, not terminal.** A fast flip self-rights
   (speed-gated); a slow flip rests on the roof — recoverable, never an instant
   death (liveness timer kept).
5. **Airtime is controllable.** Steering works in the air at reduced authority +
   the existing auto-leveling → jumps feel steerable, not chaotic.
6. **The map is a game element.** Plateaus (flat road), steep banks, full-height
   column obstacles, colored jump platforms, boost pads — each with a distinct
   visual language and a distinct driving behavior.
7. **AI-trainability is a first-class constraint.** Every feature must be
   perceivable by the sensors and have a clear reward/penalty interaction; map
   difficulty must be tunable for training annealing (§5).

## 2. Terrain shaping (the map becomes a track)

Target cross-section (per track cut, tube interior — car drives on the floor):

```
        ceiling
   ┌───────────────────────────┐
   │   ██ (columns span here)  │
   │  ░░  steep bank  ░░       │   ← side sections made steeper,
   │  ░░                ░░     │     mostly above wheel reach
   │  ░░   ┌ plateau ┐  ░░     │
   │  ░░   │  FLAT   │  ░░     │   ← wide flat drivable band ("the road"),
   │  ░░   └────────┘  ░░     │     residual slope ≤ ~4°
   └───────────────────────────┘
```

Principles:

- **Flat plateau is the norm.** The drivable band (fixed angular half-width
  around the track centerline / road lane) is flattened: high-frequency bump
  noise removed, residual slope kept small. This is "the road".
- **Steep sides.** Outside the band the floor rises steeply (near-cliff banks)
  so the plateau reads clearly and the car meets a wall at the edge, not a
  slope it can grind along.
- **Roughness moved outward.** Chaotic bump noise kept for outer bands only;
  the band gets only long-wavelength gentle undulation the suspension absorbs.
- **Intentional features only.** Within the band, relief is generated
  deliberately: ramps, jump platforms (phase 3), nothing accidental.
- **Path guarantee (hard constraint).** After generation a sweep verifies every
  stretch is traversable: band flat, or a jump platform covers it; otherwise the
  generator fixes it (flatten or jump). §6.
- **Invariant to preserve:** the surface must stay solvable by the backward
  ray-march (single-valued floor along the march direction, no overhangs that
  break `castWheelRay`'s binary search). Steep-but-not-overhanging banks are OK;
  test in `tests/cave-terrain.test.ts`.

## 3. Car physics (arcade traction model)

### 3.1 Suspension + ground absorption (stay glued, no bouncing)

Current: `SUSP_SPRING=0.14`, `SUSP_DAMP=0.22`, `SUSP_TRAVEL=1.5`,
`SUSP_REST=2.0`, `TIRE_FRICTION=2.8` (Config.ts:132-137).

- **Softer spring, higher damping, longer travel**: `SUSP_SPRING` → ~0.09,
  `SUSP_DAMP` → ~0.45 (just under critical), `SUSP_TRAVEL` → ~2.2, `SUSP_REST`
  → ~2.3. Target: on the flat band body-height variance ≈ 0; on a gentle bump
  the body rises a few cm with **no rebound oscillation**.
- **Preload / magnetic glue** (new): when a wheel is within ~1.2 u of the ground
  and not pressed into it, apply a small constant downward force (wheel "sticks"
  to crests). New config: `SUSP_GLUE_RANGE`, `SUSP_GLUE_FORCE`.
- **Landing shock absorber** (extends Car.ts:570-581): on touchdown, damp the
  body velocity component along the ground normal hard (impact → squat, not
  bounce); add a clamp so the body never rebounds off the ground. New config:
  `CAR_LANDING_VEL_ABSORB`.
- Verify in `tests/cave-physics.test.ts`: rest-on-springs test (lines 63-76)
  still passes with no drift/oscillation under the new constants.

### 3.2 Traction (grippy, not slippery)

- `CAR_GRIP=0.75` → ~0.9 (higher lateral grip, car tracks its heading).
- **Speed-sensitive grip curve** (new): grip = lerp(high, slightly lower,
  speed/maxSpeed) — sticky at mid speed, marginally relaxed at top speed for
  straight-line stability. New config: `CAR_GRIP_HIGH`, `CAR_GRIP_AT_TOP`.
- Keep longitudinal/brake limits separate (`CAR_BRAKE_DECEL`, `CAR_REVERSE_ACCEL`)
  so braking hard doesn't spin the car.
- `TIRE_FRICTION=2.8` kept (wheel-surface); distinct coefficients for
  off-road/bank/roof surfaces (§3.4).

### 3.3 Airtime control

- **Steering in the air** (new): while any wheel is off the ground, apply yaw
  torque from steer input at ~50 % ground authority (existing air tests at
  cave-physics.test.ts:107-122 assert no tire forces in air — extend, don't
  break: tire forces stay off, body torques are new). New config:
  `CAR_AIR_STEER_TORQUE`.
- **Auto-leveling kept + tuned**: existing `CAR_AIR_LEVEL_*` assist (Car.ts:768-807)
  already levels the car in the air using the road tangent — verify it composes
  with air steering; tune `CAR_AIR_LEVEL_GAIN` if it fights the player.
- **Landing settle** (existing `CAR_LANDING_SPIN_DAMP=0.7` + new §3.1 clamp):
  a slightly-nosed-down landing settles to level instead of nosing over.
- No engine force in the air (kept).

### 3.4 Inverted state (upside down) — user spec

State: car is **inverted** when body-up `uy < CAR_INVERT_THRESHOLD`
(new, ~-0.5, i.e. past the flip point, roof-down). Between threshold and
upright (e.g. 60° tilt, `uy≈0.5`) the car is **in control**: normal physics,
no interference — so tilting and recovering stays a player/AI skill, and no
auto-righting fights a car that is still driving.

When inverted:

- **Chassis friction > wheel friction** (new): add a chassis contact ray
  (body center → `-bodyUp`, short range). When the roof/side surface touches:
  apply velocity drag with a coefficient **higher** than wheel traction
  (roof slides with drag, doesn't skid) and strong angular damping (no endless
  roof spin). New config: `ROOF_FRICTION`, `ROOF_SPIN_DAMP`.
- **Speed-gated self-righting** (new, user spec: "tempted to flip back if going
  at certain speed"): if inverted AND speed > `CAR_SELF_RIGHT_SPEED` (new,
  start ~3.5 ≈ half of `CAR_MAX_SPEED=7`), apply a **world-frame torque**
  rotating body-up toward world-up: `axis = normalize(cross(bodyUp, worldUp))`,
  `torque = axis · min(cap, k·speed)`. World-frame — safe with the existing
  world-frame angular velocity (avx/avy/avz). Faster = stronger (capped).
- **No propulsion while inverted** (kept: `uprightTraction = max(0, uy)`,
  Car.ts:739) — the flip-back torque is the only thing that rights a car, and
  only above the speed gate. A slow car on its roof stays put (recoverable via
  liveness rules).
- **Liveness timer kept** (`SECTION_BUDGET_FRAMES=2200`): inverted never kills.
- **Re-entry**: back below threshold with wheels touching → normal traction
  immediately; add a small hysteresis only if boundary flapping appears.
- Tests (new, cave-physics): fast inverted car rights itself; slow inverted car
  rests on roof with drag (velocity decays, no spin, no propulsion); tilted
  (uy>threshold) car receives no auto-righting torque.

## 4. Obstacles, jumps, boosts

### 4.1 Obstacles — full-height columns

- Extend existing column features (Cave.ts:359-384, `CAVE_COLUMN_MIN/MAX=14/34`):
  new full-height variant where the feature spans the **entire cross-section**
  (floor to ceiling) so the car cannot jump over it. Collision comes free:
  columns are baked into `#featureRadiusDelta` → wheel raycasts bounce off
  (soft spring contact — arcade setback, not crash; verify pillar impacts
  don't trip `CAR_CRASH_SPEED=5.5` damage — if they do, exclude feature-surface
  impacts from damage).
- Placement: mostly outer bands; some inside the band to force weaving — but the
  **path guarantee** (§6) keeps the remaining gap ≥ `CAR_WIDTH` (6.4) + margin
  (~2-3 u) and never fully blocks the band.
- Visual: distinct material/edge highlight so humans and AI read them instantly.
- New config: `CAVE_COLUMN_FULL_HEIGHT_CHANCE`, `CAVE_OBSTACLE_GAP_MIN`.

### 4.2 Jumps — colored platforms over uneven stretches

- A **jump platform** is a flat, **colored (emissive)** slab laid along the
  track over a stretch too rough to cross on the ground. It is a *straight
  version of the road*: built from the road-lane machinery (`#roadInfluence`,
  Cave.ts:405) but (a) placed over rough stretches by the path guarantee,
  (b) **straight** — fixed entry angle and tangent for its whole length (ignores
  local centerline drift), (c) full drivable-band width, (d) a small **launch
  lip** (a few degrees up) over its last ~6 u so the car is flung over, not
  carried across.
- Landing guarantee: the segment after every platform must be flat (landing
  zone); if not, the path guarantee extends/creates a road lane there.
- Surface behavior: full grip, like road (road-lane blending already damps
  bumps).
- Visual: the platform's mesh vertices get an emissive color (distinct from
  road, boost, column) in `#buildChunk` (Cave.ts:938-1058); color-coding is the
  learnable signal.
- Replaces/augments the existing volatility-driven jump ramp
  (`CAVE_RAMP_*`): keep ramps as small terrain hops; platforms are the
  guaranteed crossing over rough stretches.
- New config: `CAVE_JUMP_PLATFORM_LIP`, `CAVE_JUMP_PLATFORM_COLOR`,
  `CAVE_LANDING_ZONE_MIN`.

### 4.3 Boosts — ground arrows

- **Boost pads**: arrow-shaped emissive patches painted on the floor (and on
  platforms), aligned with the track tangent. Generated per FeatureCell with a
  chance (new `CAVE_BOOST_CHANCE`), inside the drivable band.
- Detection: car checks feature overlap via its (s, a) — add
  `Cave.boostAt(s, a)` (or expose the cell list; the car already queries the
  cave every substep).
- Effect on overlap (any throttle, Mario Kart style): **acceleration burst**
  along the track tangent for `BOOST_DURATION` substeps **plus a temporary
  max-speed-cap increase** (`CAR_MAX_SPEED + BOOST_SPEED_BONUS`) that fades over
  ~1-2 s. Re-overlap **refreshes** the timer; the boost effect is capped (no
  indefinite stacking). New config: `BOOST_ACCEL`, `BOOST_SPEED_BONUS`,
  `BOOST_DURATION`, `BOOST_FADE`.
- Visual: bright emissive arrows, distinct from platform color, drawn in
  `#buildChunk` (decals as thin colored geometry hugging the surface).
- AI: small explicit reward bonus for taking a boost (helps training start);
  progress reward already rewards the speed.

## 5. AI / sensor impact (training-repo constraint)

- The AI must perceive: surface type (road / bank / platform / roof / rough),
  jump platform ahead + distance, boost pad ahead + distance, nearest column +
  lateral offset, airborne flag, inverted flag.
- Add a **compact feature block** (~8 scalar inputs) to Sensor.ts; bump
  `config.SENSORS` 19 → ~27 (this changes the AI input vector — the networks in
  `src/ai/` read it; note in commit that saved nets predate the change and will
  be retrained; keep the block at a fixed tail so old nets can be zero-padded
  if we want to compare).
- Feature flags come from the same queries the car uses (boostAt, platform
  classification, column list) — one source of truth, no duplicated logic.
- Difficulty knob (new `CAVE_DIFFICULTY` 0..1): scales bump amplitude in the
  band, column density, jump frequency, band width (wider band = easier) so
  training can anneal from easy maps.

## 6. Path guarantee (always-a-line map check)

New pass after FeatureCell generation (deterministic per seed), before any mesh
is built. Implement in a new file `src/games/cave/classes/PathCheck.ts`:

1. Sample the centerline every ~8 u over the whole track.
2. Classify each sample: **flat** if the drivable band's surface slope (from
   `radius(s, a)` across the band) ≤ `CAVE_PATH_MAX_SLOPE` (new, ~4°), else
   **rough**.
3. Group consecutive rough samples into stretches. Per stretch:
   - short (≤ N samples) → **flatten** the band in place (extend the road-lane
     influence to that stretch — the lane machinery already flattens + damps);
   - long → **place a jump platform** over it, and ensure a flat **landing
     zone** after it (extend/create a lane if missing).
4. Obstacle pass: for each column, the remaining band gap must be ≥
   `CAVE_OBSTACLE_GAP_MIN` (`CAR_WIDTH` + margin); else shift or drop the column.
5. **Fail closed**: flatten always works and a platform always works → an
   impossible map can never be produced.
6. Tests: classifier + fixer on synthetic profiles (unit); generate many random
   seeds and assert every centerline sample is flat or platform-covered
   (integration, `tests/cave-terrain.test.ts`); `cave.debugPath()` overlay (dev
   flag) drawing the validated line for playtesting.

## 7. Phased implementation

Each phase: implement → `bun test` green → manual play check → `git commit + push`.

**Phase 1 — Terrain shaping** (`Cave.ts`, `Config.ts`, `tests/cave-terrain.test.ts`)
- In `#rawRadius` (Cave.ts:499): carve the cross-section — flat band
  (zero high-freq bump, slope-limited) + steep banks outside
  (`CAVE_BAND_HALF_WIDTH`, `CAVE_BANK_STEEPNESS`, `CAVE_BAND_MAX_SLOPE`,
  `CAVE_ROUGHNESS_OUTSIDE` new config).
- Road lane: default-on for the band (raise `CAVE_ROAD_CHANCE=0.45` → band is
  always flat), lane surface truly flat (bump damping → 0 inside influence).
- Keep the ray-march invariant; extend cave-terrain tests (flat band, steep
  banks, no hidden spikes, ramp/road seam agreement at chunk boundaries).

**Phase 2 — Car feel** (`Car.ts`, `Config.ts`, `tests/cave-physics.test.ts`)
- Suspension retune + glue + landing absorber (§3.1).
- Grip curve (§3.2).
- Air steering + air-leveling compose check (§3.3).
- Inversion: threshold, roof friction + spin damp, speed-gated world-frame
  self-righting torque (§3.4) + new tests.

**Phase 3 — Features + path guarantee** (`Cave.ts`, new `PathCheck.ts`, `Car.ts`,
`Config.ts`, `tests/`)
- Full-height column variant + gap rule (§4.1).
- Jump platforms: straight lane + launch lip + emissive color + landing zone
  (§4.2).
- Boost pads: generation, `boostAt` query, car effect (accel burst + fading
  max-speed cap) (§4.3).
- PathCheck pass + tests (§6), `debugPath` overlay.

**Phase 4 — AI integration** (`Sensor.ts`, `Config.ts`, AI reward)
- Feature sensor block (§5), boost reward bonus, `CAVE_DIFFICULTY` knob.

**Phase 5 — Playtest tuning loop**
- Human play: tune until §8 acceptance feels right; log final constants in a
  spec (`specs/cave-arcade-driving.md`).

## 8. Acceptance criteria (what "done" feels like)

- Driving the flat band at speed: no slide, no bounce, body height steady;
  steering rotates the car on command.
- Gentle bump: invisible. Ramp: clean arc, steerable mid-air, soft landing with
  squat, no rebound.
- Fast flip at speed: roof-slides with drag, flips back onto its wheels, resumes.
  Slow flip: rests on roof, no power, recoverable.
- Every generated map has a drivable line; the guarantee test passes on random
  seeds; `debugPath` overlay shows a continuous validated line.
- Boost pads give a visible, fun speed burst; jump platforms read at a glance
  and clear the rough section in one committed line.
- Existing tests pass; new behaviors (glue, absorber, air steer, righting,
  roof drag, boosts, platforms, path guarantee) have tests.
- AI sensor vector extended compatibly; training smoke-run works.
