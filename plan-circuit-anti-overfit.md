# Circuit NN: stop over-learning, make finishing beat speed

## Diagnosis

Training loop (per group of 9 brain depths + mixed): slot 0 is a **perfect
clone** of the champion (the brain that set the current-seed high), slots 1..N
mutate from it with factor `maxMut / slot`, where `maxMut` decays linearly
from 0.5 to `Number.MIN_VALUE` over 50 seeds (`MUTATION_LAP_DECAY`). Score
resets to 0 each seed; per seed a car earns +10/checkpoint plus a tiny speed
bonus (10/gate-frames, 120/lap-frames). No reward exists for *completing*
the map. When any car finishes 3 laps the group is demoted to a 5-car swarm
mutating at `maxMut/100`. One saved brain per layer (losers are discarded).
Difficulty rises with the seed (full at seed 100).

That produces the reported failure:

1. **Exploration dies.** After ~50 seeds every slot mutates by ≈ 0; the whole
   pool is a clone cluster of one line. The finished-group swarm (÷100) is
   even more frozen. There is no mechanism left to escape the local optimum.
2. **The ladder degenerates.** Slot 49 mutates by `maxMut/49` ≈ 0, so most of
   the 50-car pool is effectively the champion repeated.
3. **Only one line survives.** `saveBestModels(models, 1)` keeps a single
   champion per layer; the second-best (often more general) line is dropped.
4. **Speed is selected, completion is not.** A car dying at gate 90/96 has
   ~900; a slow finisher has ~960 plus a few speed-bonus points. Selection
   pressure is "fastest to the same gates" — over many seeds that compounds
   into a fast-but-brittle line tuned to the maps it already saw. On a new,
   harder map that line crashes, and with no exploration (points 1–3) the
   group can never finish again → the 3-category seed gate stalls training.

## Plan (one commit per step)

### 1. `feat: completion-dominant rewards`
- `FINISH_BONUS = 600` paid once when a car completes `LAPS_PER_SEED` laps on
  a seed; `LAP_BONUS = 40` per lap (progress toward the finish).
- `LAP_SPEED_BONUS` 120 → 20: keep a weak speed signal (it only breaks ties
  between finishers) but remove the selection pressure toward pace.
- Result: finisher ≈ 1680 vs near-miss crash ≈ 900. Finishing always wins.

### 2. `feat: never-fading mutation schedule`
- `MIN_MUTATION_LVL`: `Number.MIN_VALUE` → `0.1` — exploration keeps a floor
  no matter how many seeds have run.
- `MUTATION_LADDER_CAP = 10`: the slot divisor is capped, so slots 11..50
  mutate at `maxMut/10` instead of ≈ 0 (no clone army).
- Finished swarm: `FINISHED_MUTATION_SCALE` (÷100) → `FINISHED_SWARM_DIVISOR`
  (÷5) — a settled group still hunts genuinely different lines for the next
  track.

### 3. `feat: explorer cars keep novelty alive`
- `EXPLORER_CARS = 1`: the last slot of every full pool drives a **fresh
  fully-random brain** (no mutation from the champion) every seed.
- `FINISHED_EXPLORER_CARS = 1`: a finished swarm keeps one explorer too.
- Guarantees a standing source of new lines even when the champion line is
  overfit and the rest of the pool is stuck.

### 4. `feat: hall of fame — keep recent champion lines per layer`
- `fileUtilities.saveModelList(layers, models, kind)`: writes a full list.
- Promotions now save a rolling window of `HALL_OF_FAME_SIZE = 3` brains
  (newest first) instead of a single champion.
- `scout` slot (second-to-last of a full pool) mutates from the **oldest**
  kept line — a second family of weights to re-explore when the current
  champion fails on a new track, instead of one frozen line.

### 5. `docs: describe the new training dynamics`
- `STREAM.md` score + how-it-works sections.
- Panel "about" text in `main.ts`.

## Verification
`tsc` + `vite build` + biome lint after every commit. The sim runs in the
browser (`npm run dev`), dynamics are observed live; changes are additive
config/logic so old localStorage saves keep loading (single-model saves load
as 1-entry hall of fame; `loadScores`/shape validation untouched).
