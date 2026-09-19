# Speed indicator + left-only controls cluster (circuit)

The fixed bottom overlay is one left-side cluster — steering wheel,
gas/brake pedals, speed — leaving the right of the screen bottom clear
for the map.

- The speed indicator reads the followed car's velocity magnitude
  (hypot of vx, vy), a live digital number with a small "u/f" label.
  Raw value, no extra smoothing, same update cadence as the pedals.
- Everything is display-only and mimics the followed car (AI, mixed or
  human) in real time, swapping when the followed car changes.
- The whole overlay hides while the followed car is dead or nothing is
  followable, back on respawn.

Supersedes the split "pedals on the other side" layout of
drift-and-steering-ui.
