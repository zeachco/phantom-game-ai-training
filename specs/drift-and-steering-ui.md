# Drift physics + steering UI (circuit)

Cars carry a heading plus a 2D velocity (vx, vy) instead of a single
speed scalar: yaw is speed-relative (sharp at speed, lazy when slow) and
lateral motion is grip-limited — when the turn demand outstrips grip the
car drifts, bleeding a little speed while sliding. `speed` (the brain's
I/O and the scoring input) stays the signed forward component of the
velocity, so the brains' interface is unchanged. The camera leads the
followed car by two frames of its true velocity.

The bottom overlay shows a steering wheel and gas/brake pedals that
mimic the followed car's live outputs — display-only, hidden while the
followed car is dead or nothing is followable. The split
wheel-left / pedals-right layout was superseded by
speed-indicator-and-left-controls (one left-side cluster with a speed
indicator).

Tuning lives in Config: CAR_YAW_*, CAR_GRIP, CAR_DRIFT_*, CAR_BRAKE_*,
CAR_REVERSE_*, CAR_ACCELERATION (tripled so the car can actually
drift), STEER_UI_*.
