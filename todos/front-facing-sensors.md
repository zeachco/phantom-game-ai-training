# TODO: Front-concentrated, longer sensors (circuit game)

Status: spec only — not implemented.

## Intent

The circuit's sensor fan is a near-full-circle sweep (17 rays over ~315°
around the car) inherited from the highway game, where side collisions are a
real threat: traffic, lane changes, cars brushing each other sideways. On the
circuit that threat profile is different — the road is wide, obstacles sit on
the road ahead of the car, and the way to die is running the wall or an
obstacle *in front*, not being clipped from the side.

So the sensor budget should be spent on the front: move the whole fan towards
the front, make the forward rays substantially longer (~50%) and let the side
rays be a little shorter (~10%) in exchange. Side collisions are less likely than in
`src/games/highway/`; seeing far ahead is what matters.

Written as intent + rules, not an implementation plan.

## 1. Geometry

- The fan is **front-concentrated**: all rays live within a limited spread
  centered on the car's heading (a front-facing arc), instead of the current
  symmetric near-360° sweep. The rear of the car gets no (or minimal)
  coverage — a car never needs to see what hit it from behind.
- Ray length is a **profile over angle**: longest straight ahead (~50% above
  the current range) and tapering to ~10% *below* it at the fan's edges. The
  forward gain is what matters — "longer" means the reach of the wall an
  upcoming turn is about to bring into the car; the brain should see it
  before it is beside it. The sides, which matter less (see §3), pay for it.
- Ray endpoints follow that **smooth profile** rather than the current
  box-shaped endpoints (width-scaled x vs depth-scaled y), so reach is one
  honest function of where a ray points: how far it reaches.
- The **ray count stays the same** (17). What changes is the angular layout
  and the length, not the number.

## 2. Invariants (must hold)

- **Brain I/O shape is unchanged**: inputs are still one reading per ray plus
  the existing scalar inputs (speed, angle to next gate). Same input count →
  saved brains keep their shape and load without the "does not fit its save"
  fallback.
- **Reading semantics are unchanged**: each ray still reports the nearest
  touch (road boundary segment or obstacle) or "no hit"; the values fed to the
  brain keep their current scale/normalization conventions.
- Scoring, death rules, gates, everything else in the other two specs is
  untouched.
- **Re-adaptation is expected**: existing trained brains were shaped on the
  all-around fan. Same weights, different world (front arc instead of full
  circle, longer reach) — the ladder/mutation machinery (see
  `continous-learning-and-map-seed.md`) is how they recover, no special
  handling is required for this change.

## 3. Why this shape (intent, so it survives tuning)

- Forward reach is the lever: on a circuit the decision that kills is "is
  there wall/obstacle where my turn is going", which is a question about the
  next few hundred units ahead, not about what is beside the car. That is why
  the center ray earns the +50%.
- Lateral coverage is the sacrifice: a wide road plus the angle-to-next-gate
  input already tells the brain roughly where the center of the road is;
  fine side-wall detail is low value compared to forward detail. The −10% on
  the edge rays is the same trade applied to the length budget: side detail is
  already the low-value axis, so it funds the forward reach.
- The fan should be wide enough that a car at full throttle cannot turn into
  a wall that no ray saw (i.e. spread and range are tuned together against
  max speed and turn rate — with the drift physics from
  `drift-and-steering-ui.md`, a drifting car sweeps wider, so the spread must
  cover the drift envelope, not just the heading).

## 4. Decision points (defaults chosen, confirm before implementing)

1. **Spread**: total fan angle centered on the heading. Default: ~120° (was
   ~315°). Wide enough to cover a hard turn + drift envelope at top speed.
2. **Range / length profile**: ray length as a function of angle from the
   heading. Defaults: center ray ~240 (≈ +50% vs the current 160), edge rays
   ~144 (≈ −10%); the taper in between (linear vs cosine) is a tuning knob.
   Must be re-checked against max speed so the brain gets at least ~1 s of
   lookahead at full throttle on the forward ray.
3. **Rear gap**: no rear rays at all (default) vs. a couple of short rear
   rays kept as a "something is behind me" hint. Default: none.
4. Exact values are config knobs; the rules above (front arc, angle-profiled
   length — longest forward, shortest at the edges — same ray count, same
   reading semantics) are the contract, the numbers are tuning.

## 5. Removed / replaced (checklist for the implementing pass)

- [ ] Symmetric ~315° fan → front-centered arc.
- [ ] Box-shaped ray endpoints (width/depth scaled) → smooth length profile
      over the fan.
- [ ] Short all-around reach (160) → center ray ~240 (+50%), edge rays ~144
      (−10%).
- [ ] Ray count, reading semantics, and brain input count: **unchanged**.
