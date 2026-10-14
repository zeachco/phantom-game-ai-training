/**
 * Sync between the browser games and the phantom-ai-training server.
 *
 * Base models flow down: at boot (and via the "Load base models" buttons)
 * the best community-submitted brain per group is fetched from the server,
 * falling back to the bundled preset file. Trained brains flow up: whenever
 * a group's top model beats the base reference score for that group, it is
 * submitted once, so the next visitors can start from it.
 */
import type { ModelsByLayerCount } from './utils';

/** Live server (Railway, see .railway/railway.ts). The games are served from
 *  GitHub Pages, so these fetches cross origins (CORS is open on the server). */
export const SERVER_URL =
  'https://phantom-game-ai-training-production.up.railway.app';

const CLIENT_ID_KEY = 'phantom_client_id';
const LOAD_TIMEOUT_MS = 5000;
const SUBMIT_TIMEOUT_MS = 30000;
const SUBMITTED_CAP = 500;

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
 * unreachable, answers non-OK, or has nothing for this game yet. Each group
 * keeps only its top-scoring model — that is what a fresh visitor should
 * start from.
 */
export async function fetchBaseModels(
  game: string,
): Promise<Record<string, ModelsByLayerCount[number][]> | null> {
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
  if (!Array.isArray(docs) || !docs.length) return null;
  const best: Record<string, { score: number; model: unknown }> = {};
  for (const raw of docs) {
    if (!raw || typeof raw !== 'object') continue;
    const doc = raw as { group?: unknown; score?: unknown; model?: unknown };
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
      finiteScore(doc.score) ??
      finiteScore((model as { score?: unknown }).score) ??
      0;
    if (!best[group] || score > best[group].score)
      best[group] = { score, model };
  }
  if (!Object.keys(best).length) return null;
  return Object.fromEntries(
    Object.entries(best).map(([group, entry]) => [group, [entry.model]]),
  );
}

const baseKey = (game: string): string => `phantom_base_${game}`;
const submittedKey = (game: string): string => `phantom_submitted_${game}`;

/** Reference scores the last base load saw (server or preset), per group key. */
export function recordBaseScores(
  game: string,
  scores: Record<string, number>,
): void {
  localStorage.setItem(baseKey(game), JSON.stringify(scores));
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

function scoresByGroup(
  models: Record<string, unknown[]>,
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [group, list] of Object.entries(models)) {
    let top = Number.NEGATIVE_INFINITY;
    for (const model of list) {
      const score = finiteScore((model as { score?: unknown } | null)?.score);
      if (score !== undefined && score > top) top = score;
    }
    if (top > Number.NEGATIVE_INFINITY) scores[group] = top;
  }
  return scores;
}

/**
 * Loads the base models: the server first (community submissions), the
 * bundled preset file as fallback. Whichever source answers has its
 * reference scores recorded, so makeSubmitChecker knows what to beat.
 * `onlyMissing` skips groups the visitor already has a save for.
 */
export async function loadBaseModels(
  game: string,
  io: { importModels(models: Record<string, unknown> | null): string[] },
  presetUrl: URL | string,
  onlyMissing = false,
): Promise<{ source: 'server' | 'file'; written: string[] }> {
  let source: 'server' | 'file' = 'server';
  let models: Record<string, unknown[]> | null = await fetchBaseModels(game);
  if (!models) {
    source = 'file';
    const res = await fetch(presetUrl);
    if (!res.ok)
      throw new Error(
        `Base models unavailable: server unreachable, preset ${res.status}`,
      );
    const archive = (await res.json()) as { game?: string; models?: unknown };
    if (archive.game && archive.game !== game)
      throw new Error(`Base archive is for "${archive.game}", not ${game}`);
    models =
      archive.models && typeof archive.models === 'object'
        ? (archive.models as Record<string, unknown[]>)
        : null;
    if (!models || !Object.keys(models).length)
      throw new Error('Base models unavailable: preset has no models');
  }
  recordBaseScores(game, scoresByGroup(models));
  if (onlyMissing)
    models = Object.fromEntries(
      Object.entries(models).filter(([key]) => !localStorage.getItem(key)),
    );
  return { source, written: io.importModels(models) };
}

/** Submits one brain to the server; resolves false on any failure. */
export async function submitModel(
  game: string,
  group: string,
  model: ModelsByLayerCount[number],
  score: number,
): Promise<boolean> {
  try {
    const res = await timedFetch(
      `${SERVER_URL}/api/models`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-client-id': clientId(),
        },
        body: JSON.stringify({ game, group, model, score }),
      },
      SUBMIT_TIMEOUT_MS,
    );
    return res.ok;
  } catch {
    return false;
  }
}

function signature(
  group: string,
  model: { version?: number; mutationIndex?: number; score?: number },
): string {
  const score = finiteScore(model.score) ?? 0;
  return `${group}@${model.version ?? 0}:${model.mutationIndex ?? 0}:${score.toFixed(4)}`;
}

/**
 * onSaved hook for fileUtilities: when a group's top model beats the base
 * reference score for that group, it is submitted to the server once per
 * (group, version, mutation, score). A failed submit simply retries on the
 * next save of the same model.
 */
export function makeSubmitChecker(
  game: string,
): (group: string, models: ModelsByLayerCount[number][]) => void {
  return (group, models) => {
    if (!Array.isArray(models) || !models.length) return;
    const top = models.reduce((a, b) =>
      (finiteScore(b.score) ?? 0) > (finiteScore(a.score) ?? 0) ? b : a,
    );
    const topScore = finiteScore(top.score);
    if (topScore === undefined) return;
    const base = finiteScore(baseScores(game)[group]);
    if (base === undefined || topScore <= base) return;
    let submitted: string[] = [];
    try {
      const parsed = JSON.parse(
        localStorage.getItem(submittedKey(game)) || '[]',
      );
      if (Array.isArray(parsed)) submitted = parsed;
    } catch {
      submitted = [];
    }
    const sig = signature(group, top);
    if (submitted.includes(sig)) return;
    void submitModel(game, group, top, topScore).then((ok) => {
      if (!ok) return; // signature stays out so the next save retries
      localStorage.setItem(
        submittedKey(game),
        JSON.stringify([...submitted, sig].slice(-SUBMITTED_CAP)),
      );
      console.info(
        `☁️ submitted ${group} score ${topScore.toFixed(4)} to the server`,
      );
    });
  };
}
