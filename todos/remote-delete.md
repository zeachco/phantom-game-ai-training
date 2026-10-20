# Plan: destructive "Delete remote" button + local saves deleted on server confirm

Status: **planned, not started**

The trainer panel's **Delete remote** button (rightmost of the three action
buttons, circled in the 2026-10-20 screenshot) should look destructive, and a
remote delete confirmed by the server should also remove the local brain
save — mirroring what the **Delete local** button does.

## Background (where things live)

- Panel is shared DOM code for all four games: `src/utilities/groupActions.ts`
  (created via `src/utilities/sidePanel.ts`, options built in each
  `src/games/<game>/main.ts` as `const groupActions: GroupActionsOptions`).
- The three buttons all use the plain class `.group-panel-btn`
  (`groupActions.ts:127-147`, CSS at `style.css:365-394`); no danger style
  exists anywhere in the CSS today.
- Delete handler: `groupActions.ts:358-395` → `deleteRemoteModels(game, key)`
  in `src/ai/serverSync.ts:295-328` (DELETE `/api/models?game=&group=`,
  returns count deleted or `null` on failure; today it only clears the
  server-sync bookkeeping in localStorage, not the brain saves).
- Local brain saves live in `localStorage` under keys that are **identical to
  the server group keys**: `name(layers, kind)` in `src/ai/utils.ts:131-132`
  builds `circuit_4` / `circuit_mixed_3`, exactly what `groupKeyFor(game,
  value)` produces. So the `keys` array in the handler maps 1:1 to local
  save keys.
- Existing local-delete helpers on `io = fileUtilities(game)`
  (`src/ai/utils.ts:323-337`): `discardModel(layers, kind?)`,
  `discardGameModels()`.
- Each game's `resetBrainSaves` (e.g. `src/games/circuit/main.ts:104-118`) is
  wired as `resetLocal` but wraps `io.discardModel(...)` in a `confirm()` and
  race reinit — **not reusable** for a silent local delete.
- Palette reference for the red: `#ff7070` (`.toast[data-tone="error"]`,
  `style.css:1145-1147`).

## Change 1 — destructive style

1. `style.css` — add a `.group-panel-btn-danger` modifier right after the
   existing `.group-panel-btn` rules (~line 365-394):

   ```css
   .group-panel-btn-danger {
     border-color: #7a3a3f;
     background: #3a2226;
     color: #ff9d9d;
   }
   .group-panel-btn-danger:hover:not(:disabled) {
     border-color: #ff7070;
     background: #55292e;
   }
   ```

   (base reds can be tuned to taste; `#ff7070` is the canonical error accent.
   `:disabled` / `:focus-visible` inherit the existing rules.)

2. `src/utilities/groupActions.ts:144` — tag the button:
   `deleteBtn.classList.add('group-panel-btn-danger')` (or extend `mkBtn` to
   take an extra class).

## Change 2 — delete local saves when the server confirms

1. **Widen the `io` option type** in `GroupActionsOptions`
   (`groupActions.ts:50`): from `{ importModels(...) }` to also include
   `discardModel(layers: number, kind?: string): void` and
   `discardGameModels(): void`. All four mains already pass the full
   `fileUtilities` object, so **no per-game wiring changes**.

2. **`deleteBtn` handler** (`groupActions.ts:358-395`): after
   `deleteRemoteModels` resolves, for every key the server confirmed
   (`result !== null`), remove the local brain save using the same
   invalidation rule as each game's `resetBrainSaves`:

   - `value === 0` (all view) → `io.discardGameModels()` once
   - `value === 'mixed'` → `io.discardModel(MIXED_LEVELS, MIXED_KIND)`
   - numeric group → `io.discardModel(value)` **and**
     `io.discardModel(MIXED_LEVELS, MIXED_KIND)` (the mixed selector's output
     width and expert slots are pinned to the saved brains it routes to, so
     dropping one brain invalidates the mixed save)

3. **Text updates** (the confirm currently promises "your local saves are
   kept" — now false):

   - confirm: `Delete <key> from the server and remove the local save?`
     (all view: `Delete all <game> models from the server and remove all
     local saves?`)
   - success toast: mention the local save was also removed
   - offline (all results `null`): no local delete, error toast (unchanged)
   - partial failure: local delete only for the confirmed groups; toast
     reports the deleted count as today

## Open question

- Server confirms with `deleted === 0` (nothing stored for that group):
  plan is to **still delete the local save** (the server did confirm the
  delete). Alternative: treat `0` as "keep local". Decide before coding.

## Tests

Extend the existing suites (`tests/server-sync.test.ts`,
`tests/neural-saves.test.ts` — whichever hosts the panel/delete tests):

- [ ] server confirmed ⇒ local brain save removed
- [ ] all-null (offline) ⇒ local save kept
- [ ] numeric-group delete also removes the mixed save
- [ ] "all" view delete removes every save of the game

## Verify

- [ ] `tsc && vite build` (the real gate — biome is not a gate here)
- [ ] full `bun test` (baseline 111 tests, all green)
- [ ] manual: open a game's trainer panel, follow a group, hit Delete remote
      — button is red, confirm mentions local deletion, after success the
      local save is gone and the readouts refresh
