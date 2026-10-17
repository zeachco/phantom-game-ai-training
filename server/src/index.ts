import { randomUUID } from 'node:crypto';
import { PORT, VERIFY_TOLERANCE } from './config.ts';

// instanceof is unreliable here: Bun can load two copies of the mongodb
// package, so the thrown driver error does not match the imported classes.
// Driver errors all carry a Mongo* name (MongoParseError, MongoServerError,
// MongoServerSelectionError, ...).
function isMongoError(err: unknown): boolean {
  return (
    err instanceof Error &&
    typeof err.name === 'string' &&
    err.name.startsWith('Mongo')
  );
}

import { decideModelAcceptance } from './acceptance.ts';
import {
  type ClientDoc,
  getDb,
  type ModelDoc,
  MongoNotReadyError,
  mongoState,
  type ScoreDoc,
} from './db.ts';
import { bestModelPerVariantPipeline } from './modelsQuery.ts';
import { GAMES, isGame, isSavedModel, isUuid } from './validate.ts';

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function badRequest(message: string, extra?: Record<string, unknown>) {
  return new HttpError(400, message, extra);
}

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-client-id',
  'access-control-max-age': '86400',
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (!text) return {};
    const parsed = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    throw new HttpError(400, 'invalid json body');
  }
}

function clientIdOf(
  req: Request,
  body: Record<string, unknown>,
): string | null {
  const header = req.headers.get('x-client-id');
  if (isUuid(header)) return header;
  if (isUuid(body.clientId)) return body.clientId as string;
  return null;
}

function requireClientId(req: Request, body: Record<string, unknown>): string {
  const id = clientIdOf(req, body);
  if (!id) {
    throw badRequest(
      'missing client id: send a v4 uuid as the x-client-id header (or body.clientId)',
    );
  }
  return id;
}

function clampLimit(raw: string | null): number {
  const n = raw === null ? 50 : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(Math.floor(n), 200);
}

async function bestModelScore(
  db: Awaited<ReturnType<typeof getDb>>,
  game: string,
  group: string,
): Promise<number> {
  const docs = await db
    .collection<ModelDoc>('models')
    .find({ game, group })
    .sort({ globalScore: -1, score: -1, submittedAt: -1 })
    .limit(200)
    .project({ globalScore: 1, score: 1 })
    .toArray();
  return docs.reduce(
    (m, d) => Math.max(m, d.globalScore ?? d.score ?? Number.NEGATIVE_INFINITY),
    Number.NEGATIVE_INFINITY,
  );
}

async function bestVerifiedScore(
  db: Awaited<ReturnType<typeof getDb>>,
  game: string,
): Promise<number> {
  const [top] = await db
    .collection<ScoreDoc>('scores')
    .find({ game, verified: true })
    .sort({ score: -1 })
    .project({ score: 1 })
    .limit(1)
    .toArray();
  return top?.score ?? Number.NEGATIVE_INFINITY;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

async function touchClient(req: Request, id: string): Promise<ClientDoc> {
  const db = await getDb();
  const now = Date.now();
  const doc = await db.collection<ClientDoc>('clients').findOneAndUpdate(
    { _id: id },
    {
      $set: {
        lastSeen: now,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
      $setOnInsert: { firstSeen: now },
    },
    { upsert: true, returnDocument: 'after' },
  );
  if (!doc) throw new Error('client upsert failed');
  return doc;
}

async function handleModels(
  req: Request,
  url: URL,
  body: Record<string, unknown>,
): Promise<unknown> {
  if (req.method === 'GET') {
    const game = url.searchParams.get('game');
    if (game !== null && !isGame(game)) {
      throw badRequest(`game must be one of: ${GAMES.join(', ')}`);
    }
    const group = url.searchParams.get('group');
    const limit = clampLimit(url.searchParams.get('limit'));
    const all = url.searchParams.get('all') === '1';
    const filter: Record<string, unknown> = {};
    if (game) filter.game = game;
    if (group) filter.group = group;
    const db = await getDb();
    if (all) {
      // Full ranked list (debugging/admin): every doc, best first.
      const models = await db
        .collection<ModelDoc>('models')
        .find(filter)
        .sort({ globalScore: -1, score: -1, submittedAt: -1 })
        .limit(limit)
        .toArray();
      return { count: models.length, models };
    }
    // Best per variant: one doc per { game, group } (group encodes the neural
    // architecture, e.g. "circuit_4" = 4 hidden layers), ranked by globalScore
    // (backfilled on legacy docs, see scripts/migrate-models.ts).
    const grouped = await db
      .collection<ModelDoc>('models')
      .aggregate(bestModelPerVariantPipeline(filter, limit))
      .toArray();
    const models = grouped.map((d) => (d as { doc: ModelDoc }).doc);
    return { count: models.length, models };
  }

  // POST: submit one or more weight configurations.
  const game = body.game;
  if (!isGame(game))
    throw badRequest(`game must be one of: ${GAMES.join(', ')}`);
  const group = typeof body.group === 'string' ? body.group.trim() : '';
  if (group.length === 0 || group.length > 64) {
    throw badRequest(
      'group is required (the storage key, e.g. "cave_5" or "circuit_mixed_2")',
    );
  }
  const clientId = requireClientId(req, body);
  const rawModels = Array.isArray(body.models) ? body.models : [body.model];
  const models = rawModels.filter(isSavedModel);
  if (models.length === 0) {
    throw badRequest(
      'no valid brain found: send "model" or "models" with the saved shape { kind, levels: [{ weights: number[][] }] }',
    );
  }
  const score =
    typeof body.score === 'number' && Number.isFinite(body.score)
      ? body.score
      : undefined;
  const globalScore =
    typeof body.globalScore === 'number' && Number.isFinite(body.globalScore)
      ? body.globalScore
      : undefined;
  const trackCount = Number.isInteger(body.trackCount)
    ? (body.trackCount as number)
    : undefined;
  const db = await getDb();
  const currentBest = await bestModelScore(db, game, group);
  const decision = decideModelAcceptance({
    game,
    submittedGlobal: globalScore ?? score,
    trackCount,
    currentBest,
  });
  if (!decision.ok) {
    throw new HttpError(decision.status, decision.reason, {
      accepted: false,
      best: Number.isFinite(currentBest) ? currentBest : undefined,
      submitted: globalScore ?? score,
    });
  }
  const now = Date.now();
  const docs = models.map((model) => ({
    _id: randomUUID(),
    game,
    group,
    clientId,
    score,
    globalScore,
    trackCount,
    model,
    submittedAt: now,
  }));
  const result = await db.collection<ModelDoc>('models').insertMany(docs);
  return { created: docs.length, ids: Object.values(result.insertedIds) };
}

async function handleScores(
  req: Request,
  url: URL,
  body: Record<string, unknown>,
): Promise<unknown> {
  if (req.method === 'GET') {
    const game = url.searchParams.get('game');
    if (game !== null && !isGame(game)) {
      throw badRequest(`game must be one of: ${GAMES.join(', ')}`);
    }
    const seed = url.searchParams.get('seed');
    const verifiedParam = url.searchParams.get('verified');
    const limit = clampLimit(url.searchParams.get('limit'));
    const filter: Record<string, unknown> = {};
    if (game) filter.game = game;
    if (seed) filter.seed = seed;
    if (verifiedParam === 'true') filter.verified = true;
    if (verifiedParam === 'false') filter.verified = false;
    const db = await getDb();
    const scores = await db
      .collection<ScoreDoc>('scores')
      .find(filter)
      .sort({ score: -1 })
      .limit(limit)
      .toArray();
    return { count: scores.length, scores };
  }

  // POST: upload a score to compete. Stored unverified until a separate
  // verifying process confirms it (see POST /api/scores/:id/verify).
  const game = body.game;
  if (!isGame(game))
    throw badRequest(`game must be one of: ${GAMES.join(', ')}`);
  const score = body.score;
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw badRequest('score must be a finite number');
  }
  const clientId = requireClientId(req, body);
  const seed =
    body.seed === undefined || body.seed === null
      ? 'live'
      : typeof body.seed === 'number'
        ? String(body.seed)
        : String(body.seed).slice(0, 64);
  const group =
    typeof body.group === 'string' ? body.group.slice(0, 64) : undefined;
  const modelId = isUuid(body.modelId) ? body.modelId : undefined;
  const db = await getDb();
  const doc: ScoreDoc = {
    _id: randomUUID(),
    game,
    seed,
    group,
    clientId,
    score,
    modelId,
    verified: false,
    submittedAt: Date.now(),
  };
  await db.collection<ScoreDoc>('scores').insertOne(doc);
  return doc;
}

async function handleVerify(
  req: Request,
  scoreId: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const verifierId = requireClientId(req, body);
  const confirmed = body.confirmedScore;
  if (typeof confirmed !== 'number' || !Number.isFinite(confirmed)) {
    throw badRequest(
      'confirmedScore must be a finite number (the score the replay produced)',
    );
  }
  const db = await getDb();
  const doc = await db.collection<ScoreDoc>('scores').findOne({ _id: scoreId });
  if (!doc) throw new HttpError(404, 'score not found');
  if (doc.verified)
    throw new HttpError(409, 'score is already verified', { score: doc });

  // A claim only matters if it would stand above the verified best so far.
  const best = await bestVerifiedScore(db, doc.game);
  if (doc.score < best) {
    throw new HttpError(
      409,
      'not a record: the verified best score is already higher',
      {
        score: doc.score,
        best,
      },
    );
  }

  // The replay from another browser must confirm the claimed score.
  const tolerance = Math.abs(doc.score) * VERIFY_TOLERANCE + 1e-9;
  if (confirmed < doc.score - tolerance) {
    throw new HttpError(422, 'replay did not confirm the claimed score', {
      claimed: doc.score,
      replayed: confirmed,
      tolerance,
    });
  }

  const updated = await db.collection<ScoreDoc>('scores').findOneAndUpdate(
    { _id: doc._id, verified: false },
    {
      $set: {
        verified: true,
        verifiedAt: Date.now(),
        verifiedBy: verifierId,
        replayedScore: confirmed,
      },
    },
    { returnDocument: 'after' },
  );
  return (updated ?? doc) as unknown;
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method === 'GET' && path === '/') {
    return json({
      name: 'phantom-ai-training server',
      endpoints: {
        'GET /healthz': 'liveness + mongo state',
        'POST /api/clients':
          'register/touch a client uuid (x-client-id header)',
        'GET /api/clients/me':
          'fetch the client doc for the x-client-id header',
        'POST /api/models':
          "submit weight configs { game, group, model | models[], score?, globalScore?, trackCount? } — accepted only when globalScore beats the group's stored best (circuit: trackCount >= 10)",
        'GET /api/models?game=&group=&limit=&all=1':
          'best model per variant (game+group); all=1 returns the full ranked list',
        'POST /api/scores':
          'upload a score { game, score, seed?, group?, modelId? }',
        'GET /api/scores?game=&seed=&verified=&limit=':
          'leaderboard (best first)',
        'POST /api/scores/:id/verify':
          'verifier confirms a score { confirmedScore }',
      },
    });
  }

  if (method === 'GET' && path === '/healthz') {
    return json({ ok: true, mongo: mongoState() });
  }

  if (!path.startsWith('/api/')) throw new HttpError(404, 'not found');

  const body: Record<string, unknown> =
    method === 'POST' ? await readJson(req) : {};

  if (method === 'POST' && path === '/api/clients') {
    const id = requireClientId(req, body);
    const doc = await touchClient(req, id);
    return json(doc, 201);
  }

  if (method === 'GET' && path === '/api/clients/me') {
    const id = requireClientId(req, {});
    const db = await getDb();
    const doc = await db.collection<ClientDoc>('clients').findOne({ _id: id });
    return json(doc ?? null);
  }

  if (path === '/api/models' && (method === 'GET' || method === 'POST')) {
    return json(
      await handleModels(req, url, body),
      method === 'POST' ? 201 : 200,
    );
  }

  if (path === '/api/scores' && (method === 'GET' || method === 'POST')) {
    return json(
      await handleScores(req, url, body),
      method === 'POST' ? 201 : 200,
    );
  }

  const verifyMatch = path.match(/^\/api\/scores\/([^/]+)\/verify$/);
  if (method === 'POST' && verifyMatch) {
    const doc = await handleVerify(
      req,
      decodeURIComponent(verifyMatch[1]),
      body,
    );
    return json(doc, 201);
  }

  throw new HttpError(404, 'not found');
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    if (req.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    try {
      return await handle(req);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message, ...(err.extra ?? {}) }, err.status);
      }
      if (err instanceof MongoNotReadyError) {
        return json({ error: err.message }, 503);
      }
      if (isMongoError(err)) {
        return json({ error: `mongo unavailable: ${err.message}` }, 503);
      }
      console.error(err);
      return json({ error: 'internal server error' }, 500);
    }
  },
});

console.log(
  `phantom-ai-training server listening on :${server.port} (mongo: ${mongoState()})`,
);
