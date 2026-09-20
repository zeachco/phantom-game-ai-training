# Drift physics + steering UI (circuit)

Cars use a heading plus 2D velocity. Yaw is speed-relative and lateral motion
is grip-limited; excess turn demand produces drift and speed loss. The brain
receives velocity magnitude, velocity angle relative to the front, and the
next-gate angle.

The drive brain has three outputs: signed throttle, left and right steering.
The bottom overlay mirrors the followed car with a steering wheel, throttle
pill and speed display; it hides when nothing is followable.
