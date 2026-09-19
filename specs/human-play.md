# Human play (circuit)

The human car is always in the race — there is no toggle. It is driven
with the arrow keys or WASD (up/W throttle, down/S brake-reverse,
left/A and right/D steer — the same four outputs a brain produces).

The car lives in the same world as the AI cars: same physics (drift
included), death rules (off-road / obstacle), scoring, top speed and
respawn — a crash spawns a fresh human car. It appears in the live score
list with a 🕹 marker, and the bottom controls overlay mimics its inputs
like any followed car's. It renders last, above every other car, and
never draws its sensor fan.

Starting to drive it (the first arrow/WASD input) takes the camera to
the player car; the camera stays with it until the player crashes or a
follow key is pressed manually.

It is a watcher, not a participant in training: no group, no saves, no
promotion — it reads the world but writes nothing into the AI pipeline.
