# TODO: Drift physics + steering wheel / pedals UI (circuit game)

Status: spec only — not implemented.

## Intent

Two related changes:

1. **Physics** — stop faking the car with a scalar speed along the heading.
   Mimic real car physics: turning is relative to the current speed, and when
   the car turns too much at full throttle it loses lateral grip and drifts —
   it slides, with its direction of travel diverging from the direction it
   points.
2. **UI** — show a steering wheel and gas / brake (reverse) pedals at the
   bottom of the screen that mimic the live outputs of the followed car. The
   controls disappear while that car is dead.

Written as intent + rules, not an implementation plan.

## 1. Physics model

- A car has two independent directions: its **heading** (where it points) and
  its **velocity vector** (where it actually goes). Today they are fused into
  one scalar speed; that fusion is what gets replaced.
- **Steering is relative to speed.** The yaw rate produced by a steering input
  is a function of the car's current speed:
  - at low speed the car turns sharply (a real car pivots on the spot);
  - as speed approaches the car's maximum, the same steering input produces a
    progressively wider, lazier turn.
- **Throttle / brake (reverse).** Forward force acts along the heading; the
  reverse channel first brakes (cancels forward velocity) and, when at rest,
  drives in reverse. These map 1:1 onto the existing brain outputs
  (`forward`, `left`, `right`, `reverse`) — **the brain's inputs and outputs
  do not change**; drift is purely a physics-layer change under the same
  interface.
- **Grip / drift.** Each frame the velocity is decomposed into a forward
  component (along the heading) and a lateral component (sideways):
  - tire grip cancels a portion of the lateral component — that is the car
    "following" its nose;
  - the lateral force a turn demands grows with speed and steering; when the
    car turns too much at (near) full throttle, the demand exceeds the grip
    limit, the lateral component is no longer fully canceled, and it persists
    — the car **drifts**: it slides sideways, and the angle between heading
    and velocity (slip angle) stays visibly nonzero until the car straightens
    out or loses speed.
- **Drift state** (for feedback/visuals): the car is "drifting" while the
  lateral component (or slip angle) is above a small threshold. While drifting,
  forward grip is also reduced, so a full-throttle drift bleeds speed — a real
  car cannot drift for free.
- All of this is tunable through config values (grip limit, grip recovery
  rate, friction, drift threshold, reverse cap, etc.). The existing feel
  targets — max speed, how quickly a fresh car can leave the start — should be
  approximately preserved by tuning, not by changing the rules.
- **Unchanged by this spec**: sensors, scoring (distance trickle + ordered
  gates), death rules (leaving the road, obstacle contact), the spawn ladder
  and everything in `continous-learning-and-map-seed.md`.
- **Consequence to be aware of**: existing trained brains were shaped on the
  scalar-speed physics; they will need to re-adapt (drifting changes what the
  same outputs do). That is expected — the point is better physics, not
  continuity of old weights.

## 2. Steering wheel + pedals UI

- A fixed overlay at the **bottom of the screen** (does not scroll with the
  world, does not block the map) containing:
  - a **steering wheel** on one side;
  - **gas** and **brake (reverse)** pedals on the other side.
- The overlay **mimics the outputs of the followed car in real time** (the
  same car the camera follows — best overall, a per-group best, or the mixed
  brain, whatever is currently being followed):
  - the steering wheel rotates to match the followed car's current steering
    (left/right outputs combined into one signed angle, clamped to a sane
    wheel range);
  - the gas pedal depresses proportionally to the followed car's `forward`
    output;
  - the brake/reverse pedal depresses proportionally to the followed car's
    `reverse` output.
- The overlay is **display-only**: it renders the AI's (or player's, if a
  human-controlled car is followed) outputs; it is not an input device.
- **Visibility rule**: when the followed car is dead, the controls disappear
  (hidden or faded out) and come back when that car respawns. Switching the
  followed car swaps the values live; a dead followed car always means hidden
  controls, whatever it was doing before.
- If nothing is followable (no cars alive at all), the overlay stays hidden.

## 3. Removed / replaced (checklist for the implementing pass)

- [ ] Scalar `speed`-along-heading movement → heading + 2D velocity with grip.
- [ ] Flat steering response → speed-relative yaw rate.
- [ ] No drift → lateral-grip model with slip and a drifting state.
- [ ] Nothing at the bottom of the screen → steering wheel + gas/brake overlay
      driven by the followed car's outputs, hidden while it is dead.
