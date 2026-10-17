# Follow-group controls (all games)

Scope: circuit, climb, cave and highway. When the camera follows a specific
brain group (a numbered 1–9 button or `mixed`), a controls block appears
directly under the neural-network canvas in the side panel. Following `all`
(0) hides the block. The block is built once by a shared helper and re-shown
per game; the four `main.ts` files keep their own callbacks.

## Follow controls block

The block sits between `netWrap` and the footer in the side panel and is
hidden unless `follow` names a specific group. Contents, in order:

1. **Reset score** button. Performs exactly what the long-press gesture does
   today for this group only (`resetBrainSaves(value)` behind the existing
   confirm dialog): discards the group's saved weights and restarts its
   brains. One group at a time; other groups are untouched.
2. **Leaderboard line** (not a button), updated on the same HUD tick as the
   game's existing board: `#N of M · origin score X`.
   - `N of M` is the followed group's position among all brain groups in the
     game's current leaderboard — the same ordering the existing board uses
     (circuit `TrackScoreBoard` total order, climb seed order, cave
     best-score order, highway scoreboard order). Today the order is implicit
     in the sort; this exposes it as a number.
   - `X` is the group's origin score: the server base reference recorded when
     base models load (`baseScores(game)[group]` from
     `src/ai/serverSync.ts`). Fallbacks: the group's current best live score
     when no server reference exists, and `—` when neither does.
3. **Submit** button (label uses the word *submit*). Sends the group's top
   saved model through the existing `submitModel` POST, bypassing the
   automatic submit-on-beat gates (signature dedupe, 60 s cooldown). The
   server is the authority: it accepts only when the submitted score strictly
   beats the group's current global best (see Server changes). Success reuses
   the existing upload toast; a server rejection toasts the group's current
   global best so the user sees the bar to beat.
4. **Download origin** button. Fetches the server's best document for this
   group only (`GET /api/models?game=&group=&limit=1`) and overwrites the
   group's local storage save, refreshes the group's `baseScores` reference,
   then re-initializes that group's brains. This is the per-group replacement
   for the old global "Load base models" button.

## Removals

- **Long-press reset is gone.** `armReset` (circuit, highway, cave) and
  climb's inlined hold timer in `makeFollowBtn` are deleted; follow buttons
  are plain clicks. Right-click/contextmenu reset handlers go with them.
- **Footer instruction** `'Long press for reset (right-click also works)'` is
  removed from all four side panels (this also deletes climb's inaccurate
  right-click claim).
- **All action buttons above the brain-group list are removed** in every
  game: `Load base models`, `Save models`, `Import archive`, `Clear
  training`, `Clear records`, and highway's `Stats`. Boot-time
  `loadBaseModels(game, io, true)` keeps running silently, so first visits
  still get the server base models without any button.
- **Stats no longer render inside the neural-network canvas.** The
  `renderStats`/`#drawStats` overlay in `src/ai/v2/Visualizer.ts` is removed,
  along with the gamepad `ToggleStats` binding and highway's `Stats` button.
  The HUD's `brainStats` block is the single place per-brain stats are shown.
- **Total frames count moves to the render scene.** The `createFrameMeter`
  element (currently in the side panel, `src/utilities/dom.ts`) is placed in
  the bottom-left of the `.game-stage` overlay (canvas-relative, per the game
  UI stage convention) in all four games, keeping its once-per-second
  repaint. The per-map on-canvas `total Nf` HUDs in circuit and cave are
  untouched by this change.

## Server changes

`POST /api/models` in `server/src/index.ts` (`handleModels`) gains one
authority check after the existing shape validation: compute the group's
current global best as the max `score` across stored `ModelDoc` for
`(game, group)`; reject with `409` and the best score in the body when the
incoming `score` is not strictly greater. The server checks the global score
and nothing else — no client-identity policy, no per-visitor limits.
Consequences:

- The automatic submit-on-beat (`consider` in `src/ai/serverSync.ts`) now
  loses on the server side when a different visitor's submission has already
  raised the group's best; that failure takes the existing backoff path.
- The manual Submit button relies on this check and surfaces the rejection.
- `GET /api/models` and `fetchBaseModels` (best doc per group) are unchanged.

## Client plumbing

- `src/ai/serverSync.ts`: add `submitGroup(game, group)` (manual path: top
  saved model of the group straight to `submitModel`, no `consider` gate) and
  `downloadOrigin(game, io, group)` (single-group fetch, `importModels` for
  that namespace only, `recordBaseScores` refresh).
- New shared helper (next to `src/utilities/dom.ts`) builds the follow
  controls block from a per-game callback bundle: `reset(group)`,
  `submit(group)`, `downloadOrigin(group)`, `position(group) → { rank, total,
  originScore }`. Each `main.ts` supplies its callbacks from its race state
  and the existing board sort.

## Verification

- Server: POST with `score <=` group global best → 409 and no insert;
  `score >` best → 200 and the new best; a second POST at the old best is
  rejected again.
- Client: block visible for 1–9 and `mixed`, hidden for `all`; Reset fires
  the group reset with confirm; Submit toasts success and server rejection;
  Download origin replaces only that group's local save and reference score;
  no long-press/contextmenu handlers remain on follow buttons; footer text
  gone; action row gone in all four games; `#drawStats` never invoked;
  frames meter is a bottom-left child of `.game-stage`.
- Gating: `bun test` (baseline 111, no regressions) and `tsc && vite build`
  pass. Biome lint is not a gate (pre-existing errors).

## Open questions

- **Leaderboard line semantics** — the default ranks by the existing board
  ordering and shows `baseScores(game)[group]` as the origin score. If the
  intent is instead the live position of the group's original car
  (mutationIndex 0) with its live score, only the `position` callback
  changes; the block layout is identical.
- **Dropped capabilities** — with the action row removed, `Save models`
  (archive download), `Import archive`, `Clear training` and `Clear records`
  have no UI entry point. Intentional removal, or should they survive as
  gamepad/keyboard actions?
- **Automatic submit** — kept as is (default), so a manual Submit is an extra
  lever, not a replacement.
- **Mixed group** — treated as a brain group for this spec (it has its own
  storage namespace and server submissions); if "brain group" means numbered
  only, the block simply also hides for `mixed`.
