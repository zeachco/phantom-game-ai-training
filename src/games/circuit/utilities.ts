import { MixedNetwork } from '../../ai/Mixed';
import type { ModelsByLayerCount } from '../../ai/utils';
import {
  brainId,
  clearScoreRecords as clearScoreRecordsForGame,
  foldScores,
  type GroupBase,
  type GroupScores,
  loadScores as loadScoresForGame,
  saveScores as saveScoresForGame,
  scoreKey as scoreKeyForGame,
} from '../../utilities/groupScores';
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

/** The shared group-score store, parameterized by the game prefix. Each game
 *  keeps these thin wrappers so call sites and storage keys stay unchanged. */
export type { GroupScores };
export { brainId, foldScores };
export const scoreKey = (group: Group): string =>
  scoreKeyForGame('circuit', group);
export const loadScores = (group: Group, seed: number): GroupScores =>
  loadScoresForGame('circuit', group, seed);
export const saveScores = (group: Group, scores?: GroupScores): void =>
  saveScoresForGame('circuit', group, scores ?? group.scores);
export const clearScoreRecords = (): void =>
  clearScoreRecordsForGame('circuit');

/** a training group: the shared group shape plus the circuit's own fields */
export interface Group extends GroupBase<Car> {
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
