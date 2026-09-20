# Drift physics + steering UI (circuit)

Cars carry a heading plus a 2D velocity (vx, vy) instead of a single
speed scalar: yaw is speed-relative (sharp at speed, lazy when slow) and
lateral motion is grip-limited — when the turn demand outstrips grip the
car drifts, bleeding a little speed while sliding. `speed` stays the signed
forward component for scoring, while the brain receives total velocity
magnitude and its signed angle relative to the car's front. The camera leads
the followed car by two frames of its true velocity.

The car's longitudinal control is one signed float throttle in
[-1, 1] — the brain has 3 outputs (throttle, left, right), floats
welcome: positive drives, negative brakes or reverses, 0 is neutral.

The bottom overlay shows a steering wheel and a single throttle pill
that mimic the followed car's live outputs — display-only, hidden while
the followed car is dead or nothing is followable. The pill's cap rests
centered: gas lifts it, reverse drops it. The original split
wheel-left / gas-brake-right layout was superseded by
speed-indicator-and-left-controls (one left-side cluster).

Tuning lives in Config: CAR_YAW_*, CAR_GRIP, CAR_DRIFT_*,
CAR_BRAKE_*, CAR_REVERSE_*, CAR_ACCELERATION (tripled so the car can
actually drift), STEER_UI_*.
