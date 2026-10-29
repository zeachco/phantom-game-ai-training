# Complexity-pass verdicts (2026-10-28)

A complexity pass ran over the race code (circuit/cave/climb + `RaceBase`,
commits `8746b6f..fb65daa`): 15 of 18 plan rows executed across 14 commits,
net −51 lines over 14 files, gate 221/0, tsc clean. This file records the
rejections so a future pass treats them as decided, not as fresh candidates.

## Skipped rows (rejected on review, with the verdict)

- **Circuit timing helpers** — inlining the single-use `#recordCheckpointTiming` /
  `#recordLapTiming` / `#recordFinishTiming` was rejected: they are 6–10-line named
  units with why-docs, and inlining would bloat the per-car hot block.
- **Cave timing helpers** — same verdict for `#recordGateTiming` /
  `#recordFinishTiming`.
- **Second climb `groupOf(player)` lookup** — the two lookups sit in two separate
  loops (main + live-promotion), each already minimal; a per-frame map would add an
  abstraction to save one find per player.
- **Per-frame group map for the cave position pass** — saves one find per ball for a
  new abstraction; rejected (see commit `e596eca`).

## Judged not worth pulling up to RaceBase

- The per-game remainders of the unify candidates (the settle/finish paths) were
  judged thin glue: the base class already owns the shared shape (`promote`,
  `#spawnSlots`, `endDistillRun`, `markFinished`), and the adapters are one or two
  lines.
- The circuit guide-pilot force-kill + `guideDriven` taint stays in `CircuitRace` on
  purpose: a guide-driven finish must not count as the student's own, which is
  per-game behaviour, not a shared concept.

## Kept complexity (reasons live as `why:` comments in the code)

- `RaceBase#spawnSlots` — the `distillRun` flag is the spawn contract shared by
  every pool-rebuild site.
- `RaceBase.promote()` — the JSON deep-clone of the champion brain is deliberate.
- `TrackScoreBoard.renderKey` — rebuilt each `update()` to skip DOM writes.
- `CaveRace` `!Number.isFinite(minS)` guard — reachable via `DEAD_LIFETIME`.
- The `brain.mutate` try/catch in the three `spawnEntity` overrides — old-save
  migration path (already commented in code before the pass).
