# Plan: rework the debug aside panel (all 4 games)

Scope: the `<aside class="side-panel">` debug panel, duplicated inline in all
four `main.ts` files (highway / circuit / cave / climb), plus `serverSync.ts`,
`dom.ts`, `style.css` and one new server route. Line numbers below are as of
`65b9d2d`.

Current panel order (all games): `.model-actions` top buttons → `.follow-keys`
→ `netWrap` (neural canvas) → about/legend → `frameMeter` → long-press footer.

Target order: `.follow-keys` → `<hr>` → **group actions** (new, conditional)
→ `netWrap` (4:3) → **collapsible description** (collapsed by default).
The frame counter leaves the panel and anchors to the bottom-right of the
`.game-stage` render window.

---

## 1. Remove the top action buttons

Delete the `.model-actions` block, its buttons and their handlers from all 4
games. Some of these features will be re-attached elsewhere later, so the
underlying utilities stay in the codebase — only the panel wiring goes.

| Game | Buttons created | Handlers | Container / append |
|---|---|---|---|
| highway `src/games/highway/main.ts` | `:77-90` (Load base models / Save models / Import archive / Clear training), `:272-278` (Stats) | `:91-138` | `:303-305`, append at `:309` |
| circuit `src/games/circuit/main.ts` | `:92-107` (+ Clear records) | `:108-163` | `:358-360`, append at `:368` |
| cave `src/games/cave/main.ts` | `:157-165` helper, `:166-223` (5 buttons) | inline | `:392-400` append |
| climb `src/games/climb/main.ts` | `:77-93` | `:95-143` | `:259-261`, append at `:265` |

Kept (re-attachable later, just no longer referenced from the panel):
`serverSync.loadBaseModels` / `fetchBaseModels`, `modelTransfer.ts`
(`downloadModelArchive`, `pickModelArchive`), `io.discardGameModels`,
per-game `clearScoreRecords`, `Visualizer.renderStats`.

Notes:
- Base models are **still auto-loaded at startup** with `onlyMissing=true`
  (e.g. circuit `main.ts:619-633`) — the removed button was only the manual
  force-overwrite, so no bootstrap path is lost.
- Highway's Stats button was the only toggle for `neuralVisualizer.renderStats`
  — with the button gone, that feature goes dormant (feature stays in
  `Visualizer.ts`, unused).
- Remove the now-dead CSS: `.model-actions` (`style.css:358-363`), `.model-btn`
  (`:326-356`) — first verify nothing else uses `.model-btn`.

## 2. Per-brain-group action block (new)

Insert between `.follow-keys` and `netWrap`: an `<hr>` divider, then a group
actions block that is **shown only when the selected follow target is a brain
group** (`brain 1-9` or `mixed`), hidden when `all` is selected. Re-evaluated
in each game's `setFollow` (highway `:145-150`, circuit `:185-201`,
climb `:159-168`, cave `:230-246`).

### 2a. Three action buttons

| Button | Implementation |
|---|---|
| Delete local | Re-wire the existing `resetBrainSaves(value)` (highway `:159`, circuit `:210`, cave `:251`, climb `:171`) — `io.discardModel` + circuit `race.resetBrainGroup`. `confirm()` first. This replaces long-press (see §3). |
| Reload remote | New `fetchRemoteModel(game, group)` in `serverSync.ts`: `GET /api/models?game=…&group=…` — the server already supports `?group=` (`server/src/index.ts:187-196`), the client has never used it. Import the group's model into localStorage (overwrite local), re-initialize the race. `confirm()` first. |
| Delete remote | **New server route**: `DELETE /api/models?game=…&group=…` in `server/src/index.ts` `handleModels()` (currently GET/POST only; extend the CORS `Access-Control-Allow-Methods` header at `:52` to include `DELETE`). Client: `deleteRemoteModels(game, group)` in `serverSync.ts`. `confirm()` first (it is public DB data). On success: drop the group's entry from the `phantom_base_${game}` snapshot and clear its signatures from `phantom_submitted_${game}` so the group can re-upload, then refresh the display. |

### 2b. Four score/sync readouts (live while the panel is open)

| Readout | Source per game |
|---|---|
| a. Seed best (current sim seed) | circuit/cave/climb: live `scores.seed` of the group's `GroupScores` (circuit `utilities.ts:17-30`, cave `utilities.ts:68`, climb `utilities.ts:76`). highway has **no seeds**: show the saved model's best `.score`, else `—`. |
| b. Global across seeds | circuit: existing `globalRecordFromScores` (`circuit/utilities.ts:150-164`). cave/climb: **does not exist yet** — add the same computation (sum of frozen per-seed `history` bests + live current-seed best if not yet folded); the `GroupScores` shape is identical, so a shared helper is fine. highway (no seeds): plain score, i.e. same as (a). |
| c. Remote saved score | `baseScores(game)[group]` from the `phantom_base_${game}` snapshot (`serverSync.ts:137-162`). Known mismatch, accepted for now: for non-circuit games that number is the plain top `score`, not a cross-seed global (they submit without the `globalScore` hook). `—` if the group was never synced. |
| d. Last sync with remote | **Does not exist yet.** New `phantom_sync_${game}` timestamp, stamped inside `recordBaseScores` (`serverSync.ts:146-151`) — that single writer covers all three paths (base load, submit success, 409-not-better snapshot). Display relative (`"3m ago"`) or `"never"`. |

Refresh cadence: on follow selection change + every ~500 ms while open (all
sources are localStorage reads except the sync stamp — trivial cost).

## 3. Remove long-press on follow buttons + footer

- Delete the hold-to-reset wiring: `armReset` (highway `~:159-217`,
  circuit `~:210-274`, cave `~:250-309`) and climb's 600 ms hold inside
  `makeFollowBtn` (`:188-223`): `pointerdown`/`pointerup`/`pointerleave`/
  `pointercancel`/`contextmenu` handlers, the 600/650 ms timers,
  `swallowClick`. Buttons become plain click → `setFollow`.
- Tooltips: drop `"long press or right-click to reset"` / `"(hold to reset
  its saves)"` → `"Click to follow"`.
- Delete the `.side-panel-footer` element (`"Long press for reset
  (right-click also works)"`: highway `:297-299`, circuit `:353-355`,
  cave `:382-384`, climb `:253-255`) and its CSS (`style.css:469-476`).

## 4. Panel layout: collapsible description, y-scroll, 4:3 network

- **y-scroll**: `.side-panel-content` (`style.css:317-324`) gets
  `overflow-y: auto` (panel content can now exceed viewport height).
- **4:3 neural canvas**: `netWrap` stops flex-growing — set
  `aspect-ratio: 4 / 3; flex: 0 0 auto;` (the wrapper is built with inline
  `flex:1` per game: highway `:263-270`, circuit `:319-326`, cave `:352-359`,
  climb `:235-242`). Height then follows panel width automatically; the
  existing per-frame `resizeCanvas(…, netWrap.clientWidth,
  netWrap.clientHeight)` keeps working unchanged.
- **Collapsible description (collapsed by default)**: wrap the bottom text in
  a section with a small toggle (`▸ more` / `▾ less`, or clickable header),
  body hidden by default. Per game: circuit + cave have
  `.side-panel-info { about + legend }` (circuit `:328-351`, cave `:361-380`),
  climb has about only (`:244-251`), highway has legend only (`:280-295`).
  Persist nothing (collapsed on every load is the spec).

## 5. Frame counter moves out of the panel

- `createFrameMeter` (`src/utilities/dom.ts:48-64`) is unchanged except its
  element's parent: append `frameMeter.el` to the `.game-stage` element
  instead of `panelContent` (stage refs: highway `:46`, circuit `:58`,
  climb `:48`, cave `:75`; tick call sites stay: circuit `:644`,
  highway `:521`, climb `:471`, cave `:769`).
- CSS: restyle `.side-panel-frames` (`style.css:478-488`) as an
  absolute-positioned chip at the **bottom-right of the stage** (small
  bottom/right offset, `z-index` above the game canvas, translucent dark
  background for readability). The stage already shrinks by exactly
  `min(75vw, 800px)` via `body:has(.side-panel.open)` (`style.css:43-45`), so
  the counter sits at the right edge of the screen when the panel is closed
  and against the panel's left edge when open — matching the annotated
  screenshot.
- Cave's stage also hosts the three.js canvas — the counter div is a sibling,
  z-indexed on top. Highway's canvas is a centered 200 px strip; the counter
  still anchors to the stage (full viewport) corner, i.e. the render window.
- **Demo mode**: the panel is hidden under `?demo=true` (circuit `:378-379`,
  cave `:404-405`, climb `:275-276`). Decision: hide the counter in demo too
  (same guard), since it is an experiment stat.

## Out of scope / flagged

- The server `DELETE /api/models` route is a real server change → deploy to
  Railway with the client.
- Extending the `globalScore` submit hook to cave/climb/highway (so readout
  (c) is a true cross-seed global there) is a separate task.
- Re-attaching the removed top-button features somewhere else is a later
  task.

## Verification

- `tsc && vite build` (the real gate); `bun test` (baseline 111 passing).
- Manual, per game: panel open/close, follow `all` vs each group (actions
  show/hide), delete local / reload remote / delete remote against the live
  server, readouts (a)-(d) sane, description collapsed → expanded, panel
  y-scrolls when viewport is short, network canvas 4:3 at several panel
  widths, frame counter anchored bottom-right with panel open **and** closed,
  no long-press reset anywhere, demo mode clean.

## Suggested commits

1. `feat(server): delete models endpoint for a game group` — route + CORS.
2. `feat(ui): trainer aside rework — group actions, collapsible panel, 4:3
   network, frame counter to stage` — client changes, all 4 games
   (`serverSync` additions: `fetchRemoteModel`, `deleteRemoteModels`,
   `lastSyncAt`).
