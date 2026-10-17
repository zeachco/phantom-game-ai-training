# phantom-ai-training server

Bun server, deployed separately from the static game. Games submit their AI
weight configurations here, clients identify with a uuid, and players upload
scores to compete. A score is **unverified** until a separate process in
another browser replays it and confirms it against the best score so far.

## Local run

```sh
cp .env.example .env   # fill MONGO_URL (database name comes from the URL path)
bun install
bun run dev            # or: bun run start
bun test
```

The server boots even without `MONGO_URL`: `/healthz` answers and API routes
return `503 MONGO_URL is not configured on the server`.

## Client protocol (browser side)

Each browser client:

1. Generates a v4 uuid once: `crypto.randomUUID()`.
2. Stores it in `localStorage` (suggested key: `phantom_client_id`) and reuses
   it across sessions.
3. Sends it as the `x-client-id` header on every `/api` request.

## Collections

Mongo database: from the `MONGO_URL` path, defaulting to `phantom-ai-training`.
Created lazily on first use (via `createIndex`).

| Collection | Document |
|---|---|
| `clients` | `{ _id: uuid, firstSeen, lastSeen, userAgent }` |
| `models`  | `{ _id: uuid, game, group, clientId, score?, globalScore?, trackCount?, model, submittedAt }` — `model` is the saved brain shape `{ kind, levels: [{ weights: number[][] }], ... }` (same as the localStorage saves). Ranking is by `globalScore`, falling back to `score`. |
| `scores`  | `{ _id: uuid, game, seed, group?, clientId, score, modelId?, verified, submittedAt, verifiedAt?, verifiedBy?, replayedScore? }` |

`seed` is the normalized seed string (`"live"` for games without a seed),
`group` is the storage key (e.g. `cave_5`, `circuit_mixed_2`).

## API

All responses are JSON. `POST` bodies are JSON; the client id is read from the
`x-client-id` header (or `body.clientId` as fallback).

| Endpoint | Description |
|---|---|
| `GET /healthz` | `{ ok, mongo: "unconfigured" \| "connecting" \| "connected" \| "error" }` |
| `POST /api/clients` | Register/touch the client uuid (`{ firstSeen, lastSeen }` upsert) |
| `GET /api/clients/me` | Fetch the client doc for the `x-client-id` header |
| `POST /api/models` | Submit weight configs: `{ game, group, model \| models: [...], score?, globalScore?, trackCount? }` — accepted only when globalScore beats the group's stored best (circuit: trackCount >= 10) |
| `GET /api/models?game=&group=&limit=&all=1` | Best model per variant (`game`+`group`, e.g. `circuit_4` = 4 hidden layers), ranked by `globalScore`. `all=1` returns the full ranked list (best first) instead |
| `POST /api/scores` | Upload a score to compete: `{ game, score, seed?, group?, modelId? }` → stored with `verified: false` |
| `GET /api/scores?game=&seed=&verified=&limit=` | Leaderboard, best score first (`verified=true\|false` filters) |
| `POST /api/scores/:id/verify` | Verifier process confirms a score: `{ confirmedScore }` |

`game` is one of `highway | circuit | cave | climb`.

### Verification flow

1. A client submits weights (`POST /api/models`) and later a score
   (`POST /api/scores`, referencing the model by `modelId`). The score lands
   with `verified: false`.
2. A **separate process in another browser** replays the run (loads the
   submitted weights, plays the same seed) and reports the score it produced:
   `POST /api/scores/:id/verify` with `{ confirmedScore }` and its own
   `x-client-id`.
3. The server marks the score `verified: true` (with `verifiedAt`,
   `verifiedBy`, `replayedScore`) only when:
   - the claim would stand above the **verified best score so far** for that
     game (otherwise `409 not a record`), and
   - the replay confirms the claim: `confirmedScore >= score * (1 - VERIFY_TOLERANCE)`
     (otherwise `422 replay did not confirm the claimed score`).

## Resetting a game's models

The `models` collection stores one document per submitted brain, and its
`score` field is what a fresh client starts from. After a scoring change or a
game change that makes those stored scores meaningless, wipe that game's
models so every client trains from scratch again:

```sh
cd server
bun run reset:models highway          # delete the game's models
bun run reset:models cave --scores    # also clear its score leaderboard
bun run reset:models circuit --dry-run
```

Run it from `server/` so its `.env` (with `MONGO_URL`) is loaded, or pass
`MONGO_URL=... bun server/scripts/reset-models.ts <game>` from the repo root.

## Migrating legacy models

To backfill `globalScore` on legacy documents where it is not yet present:

```sh
cd server
bun run migrate:models [--dry-run]
```

## Deployment

Deployed on Railway as the `phantom-ai-training` service in "zeachco's main
infra" (see `.railway/railway.ts` at the repo root, `rootDirectory: server`).
Set the `MONGO_URL` variable on the service (dashboard or
`railway variable set MONGO_URL=...`); the service works before that with
Mongo-dependent routes returning 503.
