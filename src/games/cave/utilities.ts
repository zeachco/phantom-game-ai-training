import { MIXED_KIND, MIXED_LEVELS } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';
import type { Car } from './classes/Car';
import type { Cave } from './classes/Cave';

/** summarized score per group: the seed entry is the live high score on the
 *  cave the group is driving. `total` and `phantom` are retained only for
 *  storage compatibility and are never used for display, ordering or
 *  promotion: the board is only about the current cave. */
export interface GroupScores {
  /** the seed of the cave the group is scoring on now */
  current: number;
  /** legacy cross-cave bar, kept for storage compat, never gates anything */
  total: number;
  /** live high score on the current seed */
  seed: number;
  /** last finished cave's high, kept as a record only */
  phantom: number;
  /** one frozen high score per finished seed, keyed by the seed number */
  history: Record<string, number>;
  /** groups that have completed this seed use mutations when they return */
  finished: Record<string, boolean>;
}

export interface Group {
  key: string; // '1'..'9' or 'mixed'
  layer: number;
  isMixed: boolean;
  pool: Car[];
  /** a finisher demotes the group to a small mutation-only swarm on slots 1..N;
   *  the state is remembered per seed so returning to that cave stays reduced */
  mutationOnly: boolean;
  /** snapshot of the champion brain + the score that promoted it */
  best: { brain: NeuralNetwork; score: number } | null;
  /** the brain that set the current cave's high score, kept for progress */
  seedBest: { brain: NeuralNetwork; score: number } | null;
  /** score frozen when the record holder died, shown for this group's ghost */
  ghostScore: number;
  scores: GroupScores;
  /** per-car gate completion times in simulation frames, one entry per gate */
  gateTimes: Record<string, number[]>;
}

/** the human driven car, exists while the game runs */
export const defaultState = {
  /** alive cars and the corpses still on the cave, both draw and score */
  cars: [] as Car[],
  sortedCars: [] as Car[],
  /** live car count: dips while a group's corpses linger, climbs back when
   *  that whole group respawns */
  living: 0,
  /** live cars at the start of the cave, the cap the board reports */
  population: 0,
  /** world x/y/z at the follow point, exposed for debugging the camera */
  camX: 0,
  camY: 0,
  camZ: 0,
  cave: undefined as Cave | undefined,
  human: undefined as Car | undefined,
  sortedModels: [] as ModelsByLayerCount[],
  sortedMixed: [] as ModelsByLayerCount[],
  playing: false,
  /** the live groups (pools + bests + scores), rebuilt on every cave change */
  groups: [] as Group[],
};

export function brainId(layer: number, mutationIndex?: number) {
  const id = String(layer);
  return typeof mutationIndex !== 'number' ? id : `${id}:${mutationIndex}`;
}

/** scores live under their own key per group, still inside the game prefix */
export function scoreKey(group: Group) {
  return group.isMixed
    ? `cave_score_${MIXED_KIND}_${MIXED_LEVELS}`
    : `cave_score_${group.layer}`;
}

export function loadScores(group: Group, seed: number): GroupScores {
  let scores: GroupScores | null = null;
  try {
    scores = JSON.parse(localStorage.getItem(scoreKey(group)) || 'null');
  } catch {
    scores = null;
  }
  if (!scores || typeof scores.total !== 'number') {
    return {
      current: seed,
      total: 0,
      seed: 0,
      phantom: 0,
      history: {},
      finished: {},
    };
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
    saveScores(group, scores);
  }
  return scores;
}

export function saveScores(group: Group, scores = group.scores) {
  localStorage.setItem(scoreKey(group), JSON.stringify(scores));
}

/** Remove race records without touching any saved neural networks. */
export function clearScoreRecords() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('cave_score_')) localStorage.removeItem(key);
  }
}

/** A new seed records the old cave high and starts a fresh comparison.
 * History lives per cave for HUD reference, never as a goal for the new run. */
export function foldScores(scores: GroupScores, newSeed: number) {
  const previousSeed = String(scores.current);
  scores.history[previousSeed] = Math.max(
    scores.history[previousSeed] || 0,
    scores.seed,
  );
  scores.phantom = scores.seed;
  scores.total = scores.seed;
  scores.current = newSeed;
  // A returning cave is a new training run: its former record is reference
  // data only, so mutations can establish a reachable fresh record.
  scores.seed = 0;
}
