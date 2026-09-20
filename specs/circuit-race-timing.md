# Circuit race timing

Each car receives a 420-frame checkpoint budget, equivalent to seven seconds
at the reference 60 FPS. The budget decrements once per simulation frame and
resets when the car claims its next in-order checkpoint; reaching zero damages
the car through the normal crash path.

The followed car's HUD shows the remaining budget as a progress gauge rather
than a seconds label.

AI lap splits are measured per car in simulation frames and stored on its
brain group as an array, one entry per completed lap. The HUD formats them as
frames, k-frames, or m-frames. Mixed cars use a stable per-slot key; the human
car is not stored in an AI group.
