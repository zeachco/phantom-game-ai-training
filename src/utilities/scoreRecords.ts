import { MIXED_KIND } from '../ai/Mixed';
import { scoreKey, type ScoreGroup } from './groupScores';
import { readJson } from './storage';

/**
 * Shared per-group score records. Each seed-scoring game (circuit, cave,
 * climb) persists a `GroupScores`-shaped record under the key built by
 * groupScores.scoreKey (e.g. group key 'cave_5' -> 'cave_score_5',
 * 'cave_mixed_2' -> 'cave_score_mixed_2'). The helpers here read that record
 * and derive the trainer-panel readouts, so the three games share one
 * implementation.
 */

/** The persisted per-group score record (the subset the panel cares about). */
export interface ScoreRecord {
  /** the seed the group is scoring on now */
  current: number;
  /** live high score on the current seed */
  seed: number;
  /** one frozen high score per finished seed, keyed by the seed number */
  history: Record<string, number>;
}

/** Sum of the frozen per-seed bests plus the live best on the current seed,
 *  which is only counted when it has not been folded into history yet, and
 *  the number of distinct tracks that total covers. */
export function globalRecordFromScores(scores: {
  current: number;
  seed: number;
  history: Record<string, number>;
}): { globalScore: number; trackCount: number } {
  let globalScore = 0;
  for (const value of Object.values(scores.history)) globalScore += value;
  const currentKey = String(scores.current);
  let trackCount = Object.keys(scores.history).length;
  if (scores.history[currentKey] === undefined) {
    trackCount += 1;
    globalScore += scores.seed;
  }
  return { globalScore, trackCount };
}

/** The frozen high score on one finished seed, or null when the group has
 *  no record, or that seed has not been finished (or its best is 0). */
export function bestOnSeed(
  scores: { history: Record<string, number> } | null | undefined,
  seed: number,
): number | null {
  const value = scores?.history?.[String(seed)];
  return typeof value === 'number' && value > 0 ? value : null;
}

/** The persisted score record for a server group key (e.g. 'cave_5' or
 *  'cave_mixed_2'), or null when the key is foreign, missing or corrupt. The
 *  record key is built with the same scoreKey the writers use, so a mixed
 *  group lands on its mixed-level record. */
export function scoreRecordForGroup(
  game: string,
  groupKey: string,
): ScoreRecord | null {
  const prefix = `${game}_`;
  if (!groupKey.startsWith(prefix)) return null;
  const suffix = groupKey.slice(prefix.length);
  if (!suffix) return null;
  const isMixed = suffix.startsWith(`${MIXED_KIND}_`);
  const group: ScoreGroup = {
    key: suffix,
    layer: Number(suffix.split('_').pop() ?? suffix),
    isMixed,
  };
  const record = readJson<{
    current?: unknown;
    seed?: unknown;
    history?: unknown;
  } | null>(scoreKey(game, group), null);
  if (!record || typeof record !== 'object') return null;
  if (typeof record.current !== 'number' || typeof record.seed !== 'number')
    return null;
  if (!record.history || typeof record.history !== 'object') return null;
  return record as ScoreRecord;
}

/**
 * The best plain `.score` among the saved models stored directly under a
 * group key (games without a seed record, i.e. highway, keep the brain saves
 * under the group key itself). Null when nothing valid is saved.
 */
export function bestSavedModelScore(groupKey: string): number | null {
  let models = readJson<unknown>(groupKey, null);
  // saves from before the multi-model era hold a single network object
  if (models && !Array.isArray(models)) models = [models];
  if (!Array.isArray(models) || !models.length) return null;
  let best: number | null = null;
  for (const model of models) {
    const score =
      model && typeof model === 'object'
        ? (model as { score?: unknown }).score
        : undefined;
    if (typeof score === 'number' && Number.isFinite(score)) {
      if (best === null || score > best) best = score;
    }
  }
  return best;
}
