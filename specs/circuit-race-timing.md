# Circuit race timing

Each car has seven seconds to claim its next checkpoint. The deadline resets
when an in-order checkpoint is claimed; missing it damages the car through the
normal crash path. The followed car currently shows its remaining time in the
bottom HUD.

AI lap splits are measured per car in seconds and stored on its brain group as
an array, one entry per completed lap. Mixed cars use a stable per-slot key;
the human car is not stored in an AI group.

The active backlog item will replace the wall-clock deadline and seconds badge
with an equivalent frame budget and visual gauge.
