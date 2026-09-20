# Human play (circuit)

A human car is always present and uses arrows or WASD: throttle, brake/reverse,
left and right. It uses the same physics and death rules as AI cars, respawns
after a crash, and takes the camera when the player first drives.

The human is a watcher rather than a training group: it is excluded from
promotions and model saves, but appears in the live score list and can count
as one of the three finish identities required before a map changes.
