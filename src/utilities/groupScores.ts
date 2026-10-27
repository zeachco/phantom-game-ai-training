import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../ai/Mixed';
import type { NeuralNetwork } from '../ai/Network';
import { readJson } from './storage';

/**
 * The shared group-score store, parameterized by the game prefix
 * (circuit / climb / cave). Each game's utilities.ts keeps a thin wrapper
 * around these so call sites and storage keys stay unchanged.
 */

/** summarized score per group: the seed entry is the live high score on the
 *  map the group is driving. `total` and `phantom` are retained only for
 *  storage compatibility and are never used for display, ordering or
 *  promotion: the board is only about the current track. */
export interface GroupScores {
  /** the seed of the map the group is scoring on now */
  current: number;
  /** legacy cross-map bar, kept for storage compat, never gates anything */
  total: number;
  /** live high score on the current seed */
  seed: number;
  /** last finished map's high, kept as a record only, never shown as ghost */
  phantom: number;
  /** one frozen high score per finished seed, keyed by the seed number */
  history: Record<string, number>;
  /** groups that have completed this seed use mutations when they return */
  finished: Record<string, boolean>;
}

/** the shared part of a training group; each game extends it with its own
 *  entity pool type and a few extra fields */
export interface GroupBase<TEntity> {
  key: string; // '1'..'9' or 'mixed'
  layer: number;
  isMixed: boolean;
  pool: TEntity[];
  /** a finisher demotes the group to a small mutation-only swarm on slots 1..N;
   *  the state is remembered per seed so returning to that track stays reduced */
  mutationOnly: boolean;
  /** snapshot of the champion brain + the score that promoted it */
  best: { brain: NeuralNetwork; score: number } | null;
  /** score frozen when the record holder died, shown for this group's ghost */
  ghostScore: number;
  /** distillation target: the group whose champion brain drives this one
   *  while its own brains backpropagate; null for free training */
  trainFrom: number | 'mixed' | null;
  /** true while this group's run is teacher-driven: the student score is
   *  frozen and the result is disqualified from promotion and saves. Cleared
   *  with trainFrom when the run ends */
  distillRun: boolean;
  /** the live teacher brain, refreshed every frame; null while the target
   *  group has no champion yet or the group trains free */
  teacher: NeuralNetwork | null;
  /** the hydrated copy of a champion loaded from the saves (plain data, no
   *  methods), cached while the same raw save stays champion */
  hydratedTeacher: { champion: NeuralNetwork; brain: NeuralNetwork } | null;
  scores: GroupScores;
}

/** the minimal group shape the score store needs */
export interface ScoreGroup {
  key: string;
  layer: number;
  isMixed: boolean;
}

/** 'layer' or 'layer:mutationIndex', the id a brain save is stored under */
export function brainId(layer: number, mutationIndex?: number): string {
  const id = String(layer);
  return typeof mutationIndex !== 'number' ? id : `${id}:${mutationIndex}`;
}

/** the group key a brain belongs to: 'mixed' for the selector brain, the
 *  group's layer count otherwise — the one identity the score store, the
 *  boards and the follow buttons all key on. The human's brainless score
 *  holder simply falls into its own layer bucket. */
export function brainKey(
  brain: NeuralNetwork | { score: number } | null | undefined,
  layers: number,
): string {
  return brain instanceof MixedNetwork ? 'mixed' : String(layers);
}

/** scores live under their own key per group, still inside the game prefix */
export function scoreKey(game: string, group: ScoreGroup): string {
  return group.isMixed
    ? `${game}_score_${MIXED_KIND}_${MIXED_LEVELS}`
    : `${game}_score_${group.layer}`;
}

export function defaultGroupScores(seed: number): GroupScores {
  return {
    current: seed,
    total: 0,
    seed: 0,
    phantom: 0,
    history: {},
    finished: {},
  };
}

export function loadScores(
  game: string,
  group: ScoreGroup,
  seed: number,
): GroupScores {
  const scores = readJson<GroupScores | null>(scoreKey(game, group), null);
  if (!scores || typeof scores.total !== 'number') {
    return defaultGroupScores(seed);
  }
  // Older saves predate the per-seed history and completion marker.
  if (!scores.history || typeof scores.history !== 'object')
    scores.history = {};
  if (!scores.finished || typeof scores.finished !== 'object')
    scores.finished = {};
  if (typeof scores.phantom !== 'number') scores.phantom = 0;
  if (typeof scores.current !== 'number') scores.current = seed;
  if (typeof scores.seed !== 'number') scores.seed = 0;
  // A newly generated/selected seed folds the old live score, but always
  // starts a fresh comparison. The old score remains in history for the HUD.
  if (scores.current !== seed) {
    foldScores(scores, seed);
    saveScores(game, group, scores);
  }
  return scores;
}

export function saveScores(
  game: string,
  group: ScoreGroup,
  scores: GroupScores,
): void {
  try {
    localStorage.setItem(scoreKey(game, group), JSON.stringify(scores));
  } catch (err) {
    // A full storage budget must not stop the animation frame, the same way
    // the neural saves degrade instead of throwing.
    console.warn(`Could not save scores for ${group.key}`, err);
  }
}

/** A new seed records the old map high and starts a fresh comparison.
 * History lives per track for HUD reference, never as a goal for the new run. */
export function foldScores(scores: GroupScores, newSeed: number): void {
  const previousSeed = String(scores.current);
  scores.history[previousSeed] = Math.max(
    scores.history[previousSeed] || 0,
    scores.seed,
  );
  scores.phantom = scores.seed;
  scores.total = scores.seed;
  scores.current = newSeed;
  // A returning track is a new training run: its former record is reference
  // data only, so mutations can establish a reachable fresh record.
  scores.seed = 0;
}
