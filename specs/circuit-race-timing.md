# Circuit race timing

Each car receives a 420-frame checkpoint budget, equivalent to seven seconds
at the reference 60 FPS. The budget decrements once per simulation frame and
resets when the car claims its next in-order checkpoint; reaching zero damages
the car through the normal crash path.

The followed car's HUD shows the remaining budget as a progress gauge rather
than a seconds label.

AI lap splits are measured per car in simulation frames and stored on its
brain group as an array, one entry per completed lap. Mixed cars use a stable
per-slot key; the human car is not stored in an AI group.

The focused car's HUD shows the latest completed checkpoint split, lap split,
and final race total. Each value is followed by a delta against the fastest
matching split seen on the current track, for example `1145 (-12)`. A negative
delta means fewer frames and is green; a positive delta means more frames and
is red. The first result for a metric has no delta. The camera keeps a finisher
focused for three seconds so its final result remains visible before normal
leader selection resumes.
