import type { ModelsByLayerCount } from '../../ai/utils';
import {
  brainId,
  brainKey,
  type GroupBase,
  type GroupScores,
} from '../../utilities/groupScores';
import type { ScoreBoardRow } from '../../utilities/scoreBoard';
import { scoreBoardRows as sharedScoreBoardRows } from '../../utilities/scoreBoard';
import {
  globalRecordFromScores,
  scoreRecordForGroup,
} from '../../utilities/scoreRecords';
import { MIXED_COLOR } from '../../utilities/ai/colors';
import type { Car } from './classes/Car';
import type { Circuit } from './classes/Circuit';
import { config } from './classes/Config';
import type { Obstacle } from './classes/Obstacle';

export type { GroupScores };
export { brainId };

/** a training group: the shared group shape plus the circuit's own fields */
export interface Group extends GroupBase<Car> {
  /** per-car lap completion times in simulation frames, one entry per lap */
  lapTimes: Record<string, number[]>;
  /** true while the round that last ended was a training session, so the
   *  following free run is never cut short by a new one */
  lastRoundWasTraining?: boolean;
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
    brainKeyOf: (car) => brainKey(car.brain, car.brainLayers),
    maxLayers: config.MAX_NETWORK_LAYERS,
    mixedColor: MIXED_COLOR,
  });
}
