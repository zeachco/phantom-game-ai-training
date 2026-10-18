/**
 * Sync between the browser games and the phantom-ai-training server.
 *
 * Base models flow down: at boot (and via the "Load base models" buttons)
 * the best community-submitted brain per group is fetched from the server
 * and written to localStorage; base models are ranked by globalScore (a
 * cross-track aggregate for circuit, plain score elsewhere). Trained brains
 * flow up: a submit only lands when its global score beats the group's stored
 * best, and circuit submits need at least MIN_TRACKS distinct tracks backing
 * the globalScore.
 */
import { showToast } from '../utilities/toast';
import type { ModelsByLayerCount } from './utils';

// circuit eligibility gate — must match the server's MIN_CIRCUIT_TRACKS (server/src/acceptance.ts)
export const MIN_TRACKS = 10;

/** Live server (Railway, see .railway/railway.ts). The games are served from
 *  GitHub Pages, so these fetches cross origins (CORS is open on the server). */
export const SERVER_URL =
  'https://phantom-game-ai-training-production.up.railway.app';

const CLIENT_ID_KEY = 'phantom_client_id';
const LOAD_TIMEOUT_MS = 5000;
const SUBMIT_TIMEOUT_MS = 30000;
const SUBMITTED_CAP = 500;

/** Submit pacing: one POST in flight at a time, at most one per group per
 * cooldown, and exponential backoff (30s..5min) while the server fails. */
const PACE = {
  cooldownMs: 60_000,
  backoffStartMs: 30_000,
  backoffCapMs: 5 * 60_000,
};
export function setPaceForTests(p: Partial<typeof PACE>): void {
  Object.assign(PACE, p);
}

/** Clears all submit-machinery state (timers, queue, backoff) between tests. */
export function resetSubmitStateForTests(): void {
  chain = Promise.resolve();
  backoffUntil = 0;
  backoffStep = 0;
  lastSubmitAt.clear();
  inFlightSigs.clear();
  latestPending.clear();
  for (const t of retryTimers.values()) clearTimeout(t);
  retryTimers.clear();
}

/** Stable browser identity for this visitor, per the server's client protocol. */
export function clientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

function timedFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = LOAD_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

function finiteScore(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * Best submitted brain per group key, or null when the server is
 * unreachable or answers non-OK. An empty record means the server answered
 * but has no (usable) model for this game yet. Each group keeps only its
 * top-scoring model — that is what a fresh visitor should start from.
 */
export async function fetchBaseModels(
  game: string,
): Promise<Record<string, { score: number; model: unknown }> | null> {
  let res: Response;
  try {
    res = await timedFetch(
      `${SERVER_URL}/api/models?game=${encodeURIComponent(game)}&limit=200`,
    );
  } catch {
    return null; // offline, or aborted by the timeout
  }
  if (!res.ok) return null;
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const docs =
    data && typeof data === 'object'
      ? (data as { models?: unknown }).models
      : undefined;
  if (!Array.isArray(docs) || !docs.length) return {};
  const best: Record<string, { score: number; model: unknown }> = {};
  for (const raw of docs) {
    if (!raw || typeof raw !== 'object') continue;
    const doc = raw as {
      group?: unknown;
      score?: unknown;
      globalScore?: unknown;
      model?: unknown;
    };
    const group = doc.group;
    const model = doc.model;
    if (typeof group !== 'string' || !group.startsWith(`${game}_`)) continue;
    if (
      !model ||
      typeof model !== 'object' ||
      !Array.isArray((model as { levels?: unknown }).levels)
    )
      continue;
    const score =
      finiteScore(doc.globalScore) ??
      finiteScore(doc.score) ??
      finiteScore((model as { score?: unknown }).score) ??
      0;
    if (!best[group] || score > best[group].score)
      best[group] = { score, model };
  }
  return best;
}

const baseKey = (game: string): string => `phantom_base_${game}`;
const submittedKey = (game: string): string => `phantom_submitted_${game}`;
const syncKey = (game: string): string => `phantom_sync_${game}`;

/**
 * The server snapshot: the best score known per group key, from the last
 * successful server query or successful submit. `{}` is a valid snapshot —
 * the server was reachable and held nothing (yet), which is exactly the
 * state where a first submit is needed.
 */
export function recordBaseScores(
  game: string,
  scores: Record<string, number>,
): void {
  localStorage.setItem(baseKey(game), JSON.stringify(scores));
  stampSync(game);
}

/**
 * Timestamp (ms) of the last successful server sync for a game: base load,
 * upload, 409-not-better snapshot, remote reload or remote delete. Null when
 * the client never talked to the server for this game.
 */
export function lastSyncAt(game: string): number | null {
  const raw = localStorage.getItem(syncKey(game));
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stampSync(game: string): void {
  localStorage.setItem(syncKey(game), String(Date.now()));
}

export function baseScores(game: string): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(baseKey(game)) || '{}');
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Loads the base models from the server and writes them to localStorage.
 * There is no bundled preset fallback: when the server is unreachable, the
 * visitor's own localStorage saves are left as-is, no snapshot is recorded,
 * and `written` is empty. A reachable-but-empty server records an empty
 * snapshot (so first submits are not blocked) but writes nothing. `onlyMissing`
 * skips groups the visitor already has a save for, which is what the boot
 * call uses so local training is never overwritten.
 */
export async function loadBaseModels(
  game: string,
  io: { importModels(models: Record<string, unknown> | null): string[] },
  onlyMissing = false,
): Promise<{ source: 'server' | 'none'; written: string[] }> {
  const models = await fetchBaseModels(game);
  if (models === null) return { source: 'none', written: [] };
  recordBaseScores(
    game,
    Object.fromEntries(Object.entries(models).map(([g, e]) => [g, e.score])),
  );
  if (!Object.keys(models).length) return { source: 'none', written: [] };
  const keys = onlyMissing
    ? Object.keys(models).filter((key) => !localStorage.getItem(key))
    : Object.keys(models);
  const toImport: Record<string, unknown[]> = {};
  for (const k of keys) {
    toImport[k] = [models[k].model];
  }
  return { source: 'server', written: io.importModels(toImport) };
}

/**
 * Fetches the single best stored model of one group from the server.
 * Null when the server is unreachable, errors, or holds no model for it.
 */
async function fetchGroupModel(
  game: string,
  group: string,
): Promise<{ score: number; model: unknown } | null> {
  let res: Response;
  try {
    res = await timedFetch(
      `${SERVER_URL}/api/models?game=${encodeURIComponent(game)}&group=${encodeURIComponent(group)}&limit=1`,
    );
  } catch {
    return null; // offline, or aborted by the timeout
  }
  if (!res.ok) return null;
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  const docs =
    data && typeof data === 'object'
      ? (data as { models?: unknown }).models
      : undefined;
  if (!Array.isArray(docs)) return null;
  for (const raw of docs) {
    if (!raw || typeof raw !== 'object') continue;
    const doc = raw as {
      group?: unknown;
      score?: unknown;
      globalScore?: unknown;
      model?: unknown;
    };
    if (doc.group !== group) continue;
    const model = doc.model;
    if (
      !model ||
      typeof model !== 'object' ||
      !Array.isArray((model as { levels?: unknown }).levels)
    )
      continue;
    const score =
      finiteScore(doc.globalScore) ??
      finiteScore(doc.score) ??
      finiteScore((model as { score?: unknown }).score) ??
      0;
    return { score, model };
  }
  return null;
}

/**
 * Fetches one group's best stored model from the server and imports it into
 * localStorage, overwriting the local save of that group. Also refreshes the
 * group's snapshot score and the sync stamp. Returns the server-side score,
 * or null when nothing could be imported (offline, no model, bad shape).
 */
export async function fetchRemoteModel(
  game: string,
  group: string,
  io: { importModels(models: Record<string, unknown> | null): string[] },
): Promise<number | null> {
  const found = await fetchGroupModel(game, group);
  if (!found) return null;
  const written = io.importModels({ [group]: [found.model] });
  if (!written.length) return null;
  const snapshot = baseScores(game);
  snapshot[group] = Math.max(finiteScore(snapshot[group]) ?? 0, found.score);
  recordBaseScores(game, snapshot);
  return found.score;
}

/**
 * Deletes all stored models of one group on the server, then clears the
 * group's local snapshot score and submitted signatures so it can be
 * re-uploaded from scratch. The local brain saves are kept. Returns the
 * number of server docs deleted, or null when the request failed.
 */
export async function deleteRemoteModels(
  game: string,
  group: string,
): Promise<number | null> {
  let res: Response;
  try {
    res = await timedFetch(
      `${SERVER_URL}/api/models?game=${encodeURIComponent(game)}&group=${encodeURIComponent(group)}`,
      { method: 'DELETE' },
    );
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let deleted = 0;
  try {
    const data = (await res.json()) as { deleted?: unknown };
    if (typeof data.deleted === 'number' && data.deleted >= 0)
      deleted = data.deleted;
  } catch {
    // the server always answers JSON; treat an unparseable body as 0 docs
  }
  const snapshot = baseScores(game);
  if (group in snapshot) {
    delete snapshot[group];
    localStorage.setItem(baseKey(game), JSON.stringify(snapshot));
  }
  const prefix = `${group}@`;
  const sigs = readSubmittedSigs(game);
  const kept = sigs.filter((sig) => !sig.startsWith(prefix));
  if (kept.length !== sigs.length)
    localStorage.setItem(submittedKey(game), JSON.stringify(kept));
  stampSync(game);
  return deleted;
}

export type SubmitResult =
  | { ok: true; notBetter?: false; best?: undefined }
  | { ok: false; notBetter: boolean; best: number };

/** Submits one brain to the server. */
export async function submitModel(
  game: string,
  group: string,
  model: ModelsByLayerCount[number],
  score: number,
  globalScore?: number,
  trackCount?: number,
): Promise<SubmitResult> {
  try {
    const payload: Record<string, unknown> = { game, group, model, score };
    if (globalScore !== undefined) payload.globalScore = globalScore;
    if (trackCount !== undefined) payload.trackCount = trackCount;

    const res = await timedFetch(
      `${SERVER_URL}/api/models`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-id': clientId(),
        },
        body: JSON.stringify(payload),
      },
      SUBMIT_TIMEOUT_MS,
    );
    if (res.ok) return { ok: true };
    if (res.status === 409) {
      let best = 0;
      try {
        const data = await res.json();
        if (typeof (data as { best?: unknown })?.best === 'number') {
          best = (data as { best: number }).best;
        }
      } catch {
        // default 0
      }
      return { ok: false, notBetter: true, best };
    }
    return { ok: false, notBetter: false, best: 0 };
  } catch {
    return { ok: false, notBetter: false, best: 0 };
  }
}

function signature(
  group: string,
  model: { version?: number; mutationIndex?: number; score?: number },
  globalScore?: number,
): string {
  const score = finiteScore(model.score) ?? 0;
  const gStr = `:g${(finiteScore(globalScore) ?? 0).toFixed(4)}`;
  return `${group}@${model.version ?? 0}:${model.mutationIndex ?? 0}:${score.toFixed(4)}${gStr}`;
}

interface Pending {
  game: string;
  group: string;
  model: ModelsByLayerCount[number];
  score: number;
  globalScore?: number;
  trackCount?: number;
  sig: string;
}

const pairKey = (game: string, group: string): string => `${game}:${group}`;

function readSubmittedSigs(game: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(submittedKey(game)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function recordSubmittedSig(game: string, sig: string): void {
  const sigs = readSubmittedSigs(game);
  if (sigs.includes(sig)) return;
  localStorage.setItem(
    submittedKey(game),
    JSON.stringify([...sigs, sig].slice(-SUBMITTED_CAP)),
  );
}

/** The submit machinery: a single FIFO chain (one POST in flight at a
 * time), a per-group cooldown, and a global backoff after failures. */
let chain: Promise<void> = Promise.resolve();
let backoffUntil = 0;
let backoffStep = 0;
const lastSubmitAt = new Map<string, number>();
const inFlightSigs = new Set<string>();
const latestPending = new Map<string, Pending>();
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleRetry(k: string, delayMs: number): void {
  const existing = retryTimers.get(k);
  if (existing) clearTimeout(existing);
  retryTimers.set(
    k,
    setTimeout(() => {
      retryTimers.delete(k);
      const item = latestPending.get(k);
      if (!item) return;
      consider(item.game, item.group, item);
    }, delayMs),
  );
}

function enqueue(item: Pending): void {
  inFlightSigs.add(item.sig);
  const k = pairKey(item.game, item.group);
  chain = chain
    .then(async () => {
      try {
        const ranking = finiteScore(item.globalScore) ?? item.score;
        const result = await submitModel(
          item.game,
          item.group,
          item.model,
          item.score,
          item.globalScore,
          item.trackCount,
        );
        if (result.ok) {
          backoffUntil = 0;
          backoffStep = 0;
          recordSubmittedSig(item.game, item.sig);
          const snapshot = baseScores(item.game);
          snapshot[item.group] = Math.max(
            finiteScore(snapshot[item.group]) ?? ranking,
            ranking,
          );
          recordBaseScores(item.game, snapshot);
          const toastMsg =
            item.globalScore !== undefined
              ? `☁️ Uploaded ${item.group} · global ${ranking.toFixed(2)}`
              : `☁️ Uploaded ${item.group} · score ${item.score.toFixed(2)}`;
          showToast(toastMsg, { tone: 'success' });
        } else if (result.notBetter) {
          recordSubmittedSig(item.game, item.sig);
          const snapshot = baseScores(item.game);
          snapshot[item.group] = Math.max(
            finiteScore(snapshot[item.group]) ?? Number.NEGATIVE_INFINITY,
            result.best,
            ranking,
          );
          recordBaseScores(item.game, snapshot);
          showToast(
            `☁️ Server already has a better ${item.group} · best ${result.best.toFixed(2)}`,
            { tone: 'info' },
          );
        } else {
          backoffStep = Math.min(backoffStep + 1, 16);
          const wait = Math.min(
            PACE.backoffCapMs,
            PACE.backoffStartMs * 2 ** (backoffStep - 1),
          );
          backoffUntil = Date.now() + wait;
          console.warn(
            `⚠️ submit of ${item.group} failed, retrying in ${Math.round(wait / 1000)}s`,
          );
          scheduleRetry(k, wait);
        }
      } finally {
        // The sig is out of flight before the next item starts, so a newer
        // model for the same group can be enqueued in the meantime.
        inFlightSigs.delete(item.sig);
      }
    })
    .catch(() => undefined);
}

function removeSubmittedSig(game: string, sig: string): void {
  const sigs = readSubmittedSigs(game);
  localStorage.setItem(
    submittedKey(game),
    JSON.stringify(sigs.filter((s) => s !== sig)),
  );
}

function consider(game: string, group: string, item: Pending): void {
  // Re-validate on the way in: the server snapshot may have moved, or the
  // signature may have been recorded in the meantime.
  const ranking = finiteScore(item.globalScore) ?? item.score;
  const serverBest = finiteScore(baseScores(game)[group]);
  if (readSubmittedSigs(game).includes(item.sig)) {
    if (serverBest !== undefined && serverBest >= ranking) return;
    // The server no longer holds this model (e.g. the DB was reset): the
    // recorded signature is stale, drop it so the model can go back up.
    removeSubmittedSig(game, item.sig);
  } else if (serverBest !== undefined && ranking <= serverBest) {
    return; // doesn't beat what the server already has
  }
  // serverBest === undefined here means either "never queried" or "queried
  // and the server has nothing for this group yet": both are legitimate
  // first-submit states, so the model goes up.
  if (inFlightSigs.has(item.sig)) return;
  const k = pairKey(game, group);
  latestPending.set(k, item);
  const now = Date.now();
  if (now < backoffUntil) {
    scheduleRetry(k, backoffUntil - now);
    return;
  }
  const last = lastSubmitAt.get(k) ?? 0;
  if (now - last < PACE.cooldownMs) {
    // Throttled: the current champion is re-checked at the boundary, so the
    // best model still makes it to the server.
    scheduleRetry(k, PACE.cooldownMs - (now - last));
    return;
  }
  lastSubmitAt.set(k, now);
  enqueue(item);
}

export interface SubmitHooks {
  /** Cross-track record for a group; when present the submit is ranked by
   *  this aggregate and gated on MIN_TRACKS distinct tracks (circuit). */
  globalScore?: (
    group: string,
  ) => { globalScore: number; trackCount: number } | null;
}

/**
 * onSaved hook for fileUtilities: when a group's top model beats the base
 * reference score for that group, it is submitted to the server once per
 * (group, version, mutation, score). Submits are serialized (one in flight
 * at a time), rate-limited per group, and back off exponentially on failure;
 * a failed signature is retried, so nothing is lost.
 */
export function makeSubmitChecker(
  game: string,
  hooks?: SubmitHooks,
): (group: string, models: ModelsByLayerCount[number][]) => void {
  return (group, models) => {
    if (!Array.isArray(models) || !models.length) return;
    const top = models.reduce((a, b) =>
      (finiteScore(b.score) ?? 0) > (finiteScore(a.score) ?? 0) ? b : a,
    );
    const topScore = finiteScore(top.score);
    if (topScore === undefined) return;

    let globalScore: number | undefined;
    let trackCount: number | undefined;
    if (hooks?.globalScore) {
      const record = hooks.globalScore(group);
      if (!record || record.trackCount < MIN_TRACKS) return; // not eligible yet: too few distinct tracks
      globalScore = record.globalScore;
      trackCount = record.trackCount;
    }

    consider(game, group, {
      game,
      group,
      model: top,
      score: topScore,
      globalScore,
      trackCount,
      sig: signature(group, top, globalScore),
    });
  };
}
