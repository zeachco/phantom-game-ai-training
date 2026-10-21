import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';
import type { ScoreBoardRow } from '../../utilities/scoreBoard';
import { scoreBoardRows as sharedScoreBoardRows } from '../../utilities/scoreBoard';
import {
  globalRecordFromScores,
  scoreRecordForGroup,
} from '../../utilities/scoreRecords';
import type { Car } from './classes/Car';
import type { Circuit } from './classes/Circuit';
import { config } from './classes/Config';
import type { Obstacle } from './classes/Obstacle';

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

export interface Group {
  key: string; // '1'..'9' or 'mixed'
  layer: number;
  isMixed: boolean;
  pool: Car[];
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
  /** per-car lap completion times in simulation frames, one entry per lap */
  lapTimes: Record<string, number[]>;
}

export const defaultState = {
  /** alive cars and the corpses still on the map, both draw and score */
  cars: [] as Car[],
  sortedCars: [] as Car[],
  /** live car count: dips while a group's corpses linger, climbs back when
   *  that whole group respawns */
  living: 0,
  /** live cars at the start of the map, the cap the board reports */
  population: 0,
  obstacles: [] as Obstacle[],
  circuit: undefined as Circuit | undefined,
  /** the human driven car, exists only while the toggle is on */
  human: undefined as Car | undefined,
  sortedModels: [] as ModelsByLayerCount[],
  sortedMixed: [] as ModelsByLayerCount[],
  playing: false,
  /** the live groups (pools + bests + scores), rebuilt on every map change */
  groups: [] as Group[],
};

export function brainId(layer: number, mutationIndex?: number) {
  const id = String(layer);
  return typeof mutationIndex !== 'number' ? id : `${id}:${mutationIndex}`;
}

/** scores live under their own key per group, still inside the game prefix */
export function scoreKey(group: Group) {
  return group.isMixed
    ? `circuit_score_${MIXED_KIND}_${MIXED_LEVELS}`
    : `circuit_score_${group.layer}`;
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
  try {
    localStorage.setItem(scoreKey(group), JSON.stringify(scores));
  } catch (err) {
    // A full storage budget must not stop the animation frame, the same way
    // the neural saves degrade instead of throwing.
    console.warn(`Could not save scores for ${group.key}`, err);
  }
}

/** Remove race records without touching any saved neural networks. */
export function clearScoreRecords() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('circuit_score_')) localStorage.removeItem(key);
  }
}

/** A new seed records the old map high and starts a fresh comparison.
 * History lives per track for HUD reference, never as a goal for the new run. */
export function foldScores(scores: GroupScores, newSeed: number) {
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

/** Re-exported from the shared score-record helper so the submit hook and
 *  the trainer panel both rank by one implementation. */
export { globalRecordFromScores };

/** globalRecordFromScores read from localStorage for a server group key
 *  like 'circuit_3' or 'circuit_mixed_2'; null when the record is missing
 *  or corrupt. */
export function globalRecordForGroup(
  groupKey: string,
): { globalScore: number; trackCount: number } | null {
  const record = scoreRecordForGroup('circuit', groupKey);
  return record ? globalRecordFromScores(record) : null;
}

/**
 * The shared left scoreboard rows, best first: group record ghosts plus the
 * live cars, current track only. The row logic lives in the shared
 * scoreBoard component; this adapter only extracts the circuit's data.
 */
export function scoreBoardRows(state: typeof defaultState): ScoreBoardRow[] {
  return sharedScoreBoardRows({
    sorted: state.sortedCars,
    groups: state.groups,
    topCount: config.SCORES_NB,
    trainees: state.groups.flatMap((group) =>
      group.distillRun ? group.pool.slice(0, 1) : [],
    ),
    human: state.human,
    brainKeyOf: (car) =>
      car.brain instanceof MixedNetwork ? 'mixed' : String(car.brainLayers),
    maxLayers: config.MAX_NETWORK_LAYERS,
    mixedColor: config.MIXED_COLOR,
  });
}
