# Cave arcade follow-ups (audit findings, 2026-10-18)

The original `plan-cave-arcade-driving.md` was executed with the documented
car→ball pivot (`specs/cave-arcade-driving.md` is the contract of record) and
was deleted as implemented. This plan collects the remaining gaps found by
the audit against the original plan's intent, plus one external docs fix.
Execute in order, one commit per item, commit + push after each.

## 1. `feat(cave): debugPath overlay`

The original plan §6 asked for a `cave.debugPath()` dev-flag overlay drawing
the validated drivable line; nothing of the kind exists.

- PathCheck already samples the centerline/band and computes the validated
  line — store its result (sample points, ramp extents, landing-zone spans)
  on the PathCheck instance instead of only mutating cells.
- Expose it via a `debugPath()` draw method in `Cave.ts` (bright line along
  the validated centerline, brackets at ramp + landing zones, red markers
  where a fixer ran), gated by a `?path=1` URL flag read in
  `src/games/cave/main.ts` (same pattern as `?clear`, see Config.ts).
- Draw-only: no gameplay, no AI input, no mesh changes.

## 2. `feat(cave): explicit coin/boost reward`

Original plan §4.3: "small explicit reward bonus for taking a boost (helps
training start)". Today a coin pickup pays only `COIN_SCORE = 1`
(`Ball.ts:346`); the boost (`COIN_BOOST_ACCEL`/`COIN_SPEED_BONUS`,
`Ball.ts:690-696`) is rewarded only indirectly through progress.

- New `COIN_BOOST_REWARD = 5` in `Config.ts` (half a gate; keep it well under
  `GATE_SCORE`'s weight in the overall score, tune in playtest).
- Add it to `brain.score` alongside `COIN_SCORE` at the pickup site
  (`Ball.ts:346`) so "take the coin" is directly selectable pressure, not
  just a by-product of speed.
- Note in `STREAM.md` score section.

## 3. `refactor(cave): name the landing-zone runout`

`PathCheck.ts:83` hardcodes the landing runout:
`cell.ramp.centerS + cell.ramp.height / 0.35 + 60`.

- Extract `CAVE_LANDING_RUNOUT = 60` in `Config.ts` (the original plan called
  this the landing-zone minimum) and use it in PathCheck.
- No behavior change; guarantee tests must stay green untouched.

## 4. `feat(cave): difficulty scales band width and ramp frequency`

`CAVE_DIFFICULTY` (0..1, `Config.ts:323`) currently scales wave amplitude
(`Cave.ts:196-197`), column/depth density (`Cave.ts:985, 1113`) and turn
growth (`Cave.ts:322`) only. Original plan §5 also wanted band width (wider
band = easier) and jump frequency in the knob so training can anneal from
easy maps.

- Scale `CAVE_BAND_HALF_WIDTH` down with difficulty (e.g.
  `band * lerp(1.25, 1, d)`) and scale the ramp/jump placement chance up
  with difficulty, both in the FeatureCell generation path.
- Keep the path guarantee intact: the band feeds PathCheck's gap math, so
  run `tests/cave-path.test.ts` + `tests/cave-terrain.test.ts` (drivable-line
  assertions) at `CAVE_DIFFICULTY` 0, 0.5 and 1 in a new test case.

## 5. `docs: AGENTS.md routing wording` (outside this repo)

`~/.pi/agent/AGENTS.md` routing table still says "no thinking" for the
scout/completion/code typing tier. Since 2026-10-18 the OpenRouter GLM
endpoint rejects thinking-off requests (400 "Reasoning is mandatory"), and
the agent files now use `openrouter/z-ai/glm-5.3-flash:low`.

- Update the table rows + the "typing tier" rule: "no thinking" →
  "minimal thinking (`:low`)".
- No repo files affected; do this step last, no commit.

## Verification

- `bun test`, `npm run ci` (tsc + vite build), `npm run lint` after every
  commit.
- Manual: `npm run dev` → `?game=cave&path=1` shows a continuous validated
  line across a few seeds; coin pickup is visible as a score jump.
- Item 4: smoke-run training at low `CAVE_DIFFICULTY` — maps stay drivable
  and easier (wider band, fewer ramps).
