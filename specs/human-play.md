# Human play (circuit)

The "Human play" checkbox in the side panel spawns one brainless car
driven with the arrow keys or WASD (up/W throttle, down/S brake-reverse,
left/A and right/D steer — the same four outputs a brain produces).
Unchecking removes it and unbinds the keys; the toggle is session state
only, not saved.

The car lives in the same world as the AI cars: same physics (drift
included), death rules (off-road / obstacle), scoring and respawn — a
crash spawns a fresh human car. It appears in the live score list with a
🕹 marker, can be followed by the camera, and the bottom controls
overlay mimics its inputs like any followed car's.

It is a watcher, not a participant in training: no group, no saves, no
promotion — it reads the world but writes nothing into the AI pipeline.
