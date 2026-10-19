import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';
import { layerColor } from '../../utilities/ai/colors';
import type { ScoreBoardRow } from '../../utilities/scoreBoard';
import {
  globalRecordFromScores,
  scoreRecordForGroup,
} from '../../utilities/scoreRecords';
import { Car } from './classes/Car';
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
  /** the live teacher brain, refreshed every frame; null while the target
   *  group has no champion yet or the group trains free */
  teacher: NeuralNetwork | null;
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
 * The shared left scoreboard rows, best first: frozen group ghosts plus the
 * live cars, current track only. Running cars use their live score, ghosts
 * use the frozen dead record; a ghost stays hidden while a board car already
 * shows that score, so the leader is never doubled by its own ghost.
 */
export function scoreBoardRows(state: typeof defaultState): ScoreBoardRow[] {
  const entries: (Car | Group)[] = [];
  const topCars = state.sortedCars;
  const topCount = Math.min(topCars.length, config.SCORES_NB);
  for (const group of state.groups) {
    if (group.ghostScore <= 0) continue;
    let shown = false;
    for (let i = 0; i < topCount; i++) {
      if (topCars[i].brain.score === group.ghostScore) {
        shown = true;
        break;
      }
    }
    if (!shown) entries.push(group);
  }
  for (let i = 0; i < topCount; i++) entries.push(topCars[i]);
  entries.sort((a, b) => {
    const scoreA = a instanceof Car ? a.brain.score : a.ghostScore;
    const scoreB = b instanceof Car ? b.brain.score : b.ghostScore;
    return scoreB - scoreA;
  });

  return entries.map((ref): ScoreBoardRow => {
    if (ref instanceof Car) {
      if (ref === state.human)
        return {
          emoji: '🕹',
          text: `${ref.label} ${Math.round(ref.brain.score)}`,
          color: ref.damaged ? '#def' : ref.color,
        };
      const group = state.groups.find(
        (g) =>
          g.key ===
          (ref.brain instanceof MixedNetwork
            ? 'mixed'
            : String(ref.brainLayers)),
      );
      // Current track only: a car leads when it holds its group's live
      // current-map high. History lives in the weights, not in the board.
      const groupHigh = group?.scores.seed || 0;
      const leads =
        groupHigh > 0 && ref.brain.score >= groupHigh - Number.EPSILON;
      const emoji = leads
        ? ref.damaged
          ? '🏆'
          : '💚'
        : ref.damaged
          ? '💀'
          : '💜';
      return {
        emoji,
        text: `${ref.label} ${Math.round(ref.brain.score)}`,
        color: ref.damaged ? '#def' : ref.color,
      };
    }
    return {
      emoji: '👻',
      text: `${brainId(ref.layer, undefined)} ${Math.round(ref.ghostScore)}`,
      color: ref.isMixed
        ? config.MIXED_COLOR
        : layerColor(ref.layer, config.MAX_NETWORK_LAYERS),
    };
  });
}
