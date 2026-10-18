# Fix: 400 "no valid brain found" on mixed-brain submission

## Symptom

`POST /api/models` returns 400:

```
no valid brain found: send "model" or "models" with the saved shape
{ kind, levels: [{ weights: number[][] }] }
```

Repro payload: a mixed brain (`kind: "mixed"`, group `highway_mixed_2`, score
963.47) whose `expertIds` are **string slot ids**:
`["1.1","2.1","3.1","4.1","5.1","6.1","7.1","8.1"]`.

> Note: the report says "pushing into circuit" but the pasted failing payload is
> `game: "highway"`. The failure is game-independent — **any** game submitting a
> `kind: "mixed"` brain fails, so `circuit_mixed_*` hits the same 400.

## Root cause

Server-side shape check `isSavedModel()` in `server/src/validate.ts` (introduced
in `53d7969`, the original API server commit) requires mixed brains to carry
`expertIds` as **finite numbers**:

```ts
// server/src/validate.ts:57-62
if (kind === "mixed") {
  const expertIds = model.expertIds;
  if (
    !Array.isArray(expertIds) ||
    expertIds.length === 0 ||
    expertIds.some((id) => !isFiniteNumber(id))   // <-- rejects strings
  ) {
    return false;
  }
}
```

The client has never sent numbers. Mixed brains persist
`expertIds: string[]` of `layer.rank` slot ids:

- `expertSlotIds()` in `src/ai/Mixed.ts:210` returns strings like `"1.1"`, `"8.1"`.
- `MixedNetwork.expertIds: string[]` (`src/ai/Mixed.ts:31`).
- Client-side type: `expertIds?: string[]` in `src/ai/utils.ts:50`.

So `rawModels.filter(isSavedModel)` in `server/src/index.ts:197` strips every
mixed brain, `models.length === 0`, and the route throws the 400. Neural
(`kind: "neural"`) brains are unaffected — only mixed submissions fail.

### Why the unit test missed it

`server/tests/validate.test.ts:42` tests with `model.expertIds = [0, 1, 2]` —
numbers. The test validates an assumption that never matches the real client
payload, so the suite is green while production 400s.

### Ruled out (checked, not the cause)

- Extra per-level `inputs` / `outputs` arrays in the payload: the validator only
  requires `weights`; extra fields are ignored.
- Level chaining: level 0 is 12×12, level 1 is 12×8 → out(0) === in(1) ✓.
- `game` / `group` / `score` / `x-client-id` all pass their checks.

### String ids are the canonical shape

The server never *consumes* `expertIds` — it only validates and stores
(`insertMany`). On load, the client compares the saved ids as strings against
`expertSlotIds(...).join()` (`src/games/circuit/classes/CircuitRace.ts:244`,
same pattern in highway/climb/cave). Converting ids to numbers on either side
would break that comparison, so the validator is the wrong side — fix the
validator, not the client.

## Fix

### 1. `server/src/validate.ts` — accept string slot ids

Accept a non-empty array of non-empty strings (also keep tolerating finite
numbers, in case anything old exists in the wild):

```ts
function isSlotId(id: unknown): boolean {
  return (typeof id === "string" && id.length > 0) || isFiniteNumber(id);
}
// in isSavedModel():
expertIds.some((id) => !isSlotId(id))
```

Update the doc comment above `isSavedModel` to note that mixed brains carry
`expertIds: string[]` of `layer.rank` slot ids (see `expertSlotIds` in
`src/ai/Mixed.ts`).

### 2. `server/tests/validate.test.ts` — test the real client shape

- Change the "accepts a mixed brain with expertIds" test to the actual shape:
  `expertIds = ["1.1", "2.1", "3.1"]`.
- Keep/adjust: numeric ids still accepted (backward tolerance).
- Add rejects: `expertIds: [""]` (empty string), `expertIds: [null]`,
  `expertIds: [{}]`, plus existing `mixedNoExperts` (missing) stays red.

### 3. Optional: improve the 400 message

`server/src/index.ts:200` — mention the mixed extras so the next shape mismatch
is diagnosable from the message alone, e.g.:

```
no valid brain found: send "model" or "models" with the saved shape
{ kind, levels: [{ weights: number[][] }], expertIds?: string[] (mixed) }
```

## Verify

1. `cd server && bun test` — new/updated cases pass (repo baseline: 111 passing
   in `bun test`; biome lint has ~3392 pre-existing errors and is not a gate).
2. Root gate still green: `bun run build` (`tsc && vite build`) — unaffected,
   but confirms nothing else regressed.
3. **Deploy**: push to the branch Railway deploys
   (`phantom-game-ai-training`, production at
   `phantom-game-ai-training-production.up.railway.app`) — the 400 only goes
   away in production after the new validator ships.
4. Re-run the exact failing `curl` against production → expect
   `{ created: 1, ids: [...] }`.
5. `GET /api/models?game=highway&all=1&limit=5` (or group filter) to confirm
   the doc landed with string `expertIds` intact.
6. Push a `circuit_mixed_*` brain (the original report) to confirm that path too.

No data migration needed: rejected submissions were never stored (the filter
runs before `insertMany`), and the client already resubmits lost models
(`1e83f6b`), so the local mixed champions will re-upload on their next beat.

## Rollback

Revert the commit; behavior returns to the current 400. Nothing is corrupted —
the bug only ever rejected, never stored wrong data.
