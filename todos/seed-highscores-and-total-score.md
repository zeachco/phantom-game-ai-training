# TODO: Seed high scores + summarized total score (circuit game)

Status: implemented (2026-09-18), defaults per §6.

Depends on `continous-learning-and-map-seed.md` (the map seed, the full-lap
seed advance, and per-group persistence). This spec **modifies** that spec:
the promotion bar is no longer the raw per-map best score — it is the
summarized total score defined here.

## Intent

Per-map scores are not comparable across maps: a lap on seed 554 means
nothing next to a lap on seed 555, because the maps are different (different
length, different turns, different obstacles). So the "score" a brain category
carries must be a **summarized overall score** that aggregates the high scores
of the maps it has driven, with recent maps weighted more heavily than old
ones.

That summary is built from per-map high scores, each stored under the seed of
the map it was achieved on. It is what decides whether a neural network
records progress (is written as the group's new best brain).

Written as intent + rules, not an implementation plan.

## 1. The scores object

Each brain category (group) persists exactly one scores object, alongside its
best brain. Shape (the keys are the contract):

```
scores: {
  current_seed_reference: 555,   // the seed of the map the group is scoring on now
  total_score: 12345,            // the summarized overall score (see §3)
  seed_score: 1224,              // live high score on the CURRENT seed
  // ... one entry per finished seed:
  554: 24690,
  553: 24011,
  // ...
}
```

- `seed_score` is the only live number while the current seed is active.
- The `...` entries are the **finished** maps: high score keyed by seed
  number. Once a seed is finished its entry is frozen.
- `total_score` is the summarized overall score: the running aggregate of all
  finished seeds' high scores, discounted so that each map's contribution
  halves on every subsequent map.

## 2. While a map is active: only the current map updates

- While the group drives seed `S`, scoring updates **only** `seed_score`
  (the high score on `S`). It is the max over the scores achieved by any of
  the group's cars on this seed, refreshed as cars score (same "max over the
  pool" rule as the continuous-learning spec).
- The entries for previous seeds are never touched again.
- Whenever a car sets a new `seed_score`, the brain that achieved it is
  snapshotted with that score (the car may be long dead by the time the map
  ends; the snapshot is what progress recording uses, see §4).

## 3. When a new seed is detected: fold + halve

A new seed is detected whenever the active seed changes — both triggers from
the map-seed spec: any car completing a full lap, and the user applying a seed
in the input field. Both run the same fold:

1. The finished seed's `seed_score` is finalized as its own entry, keyed by
   that seed number (the `...` history).
2. **`total_score = (total_score + finishedSeedHighScore) / 2`** — add the
   previous high score to the total, then divide the total by 2.
3. `current_seed_reference` becomes the new seed, `seed_score` resets to 0.

Properties of the halving (why it is the "summarized overall score"):

- A map's contribution decays by ½ on every later map, so **recent maps
  dominate** the total.
- The total is bounded: if every map scores around `H`, the total converges to
  `H` (fixed point of `T = (T + H) / 2`). The bar therefore
  **self-calibrates to the group's recent performance** instead of growing
  without bound.
- A map nobody scores on folds as 0, so a failed map **shrinks** the total —
  the next map's progress becomes easier to record. That is intended.

## 4. Recording progress: the total is the bar

- The promotion rule of the continuous-learning spec stands, but the bar it
  compares against is the group's **`total_score`**, not a raw per-map best:
  the moment a car's live score strictly exceeds the group's current
  `total_score`, that car's brain is written as the group's new best brain
  (progress recorded), with the same snapshot semantics.
- Rationale: a raw per-map score can look huge on an easy map and tiny on a
  hard one; the summarized total is the cross-map-comparable measure of how
  well a brain does, so it is what "progress" is measured against.
- Consequence: a brain that records progress is, in effect, one that outdid
  the group's summarized recent performance on the map it drove.
- Strictly-greater only: a tie records nothing (consistent with the
  continuous-learning spec).

## 5. What this changes in `continous-learning-and-map-seed.md`

- §4/§5: "best score" as the promotion bar → replaced by `total_score` (§4
  here). The per-seed high score is still tracked (as `seed_score`), but it is
  bookkeeping for the total, not the bar.
- §7: "each group's `bestScore` resets to 0 on map change" → **superseded**:
  nothing resets to 0. The finished seed's high score is folded into
  `total_score` with the halving formula, and the total persists across maps
  and reloads.
- §6 (persistence): the per-group save is now **best brain + scores object**
  (not "best brain + best score"). Saved live (throttled) whenever
  `seed_score` or the total changes, and on unload, so a reload mid-map
  resumes the same `current_seed_reference` and live `seed_score`.
- Reload edge case: if the URL seed on load differs from the saved
  `current_seed_reference`, the saved object's pending seed is folded (step 2
  of §3) and the new seed started — same as if the seed had changed while
  playing.

## 6. Decision points (defaults chosen, confirm before implementing)

1. **Scope of the scores object**: per group / brain category (default,
   consistent with "only the best survives per category") vs. one global
   object for the whole game.
2. **History retention**: keep every finished seed's entry (default — one
   number each, the total already summarizes) vs. keep only the last N.
3. **Revisiting a seed**: if the user types a seed that already has an entry,
   keep the max of the two (default — a high score is a high score) vs.
   overwrite with the new run.
4. **Display**: the score panel should show the summarized `total_score`
   (it is now the meaningful number); per-seed `seed_score` can be shown as
   the current-map line. Optional, but recommended.

## 7. Removed / replaced (checklist for the implementing pass)

- [x] Raw per-map best score as promotion bar → `total_score` (summarized
      overall score).
- [x] Single "best score" persisted per group → scores object
      (`current_seed_reference`, `total_score`, `seed_score`, per-seed
      history).
- [x] "Reset bestScore to 0 on map change" → fold: `(total + finishedHigh) / 2`,
      then start the new seed with `seed_score` = 0.
- [x] Brain that sets a new `seed_score` → snapshot its weights with the score.
