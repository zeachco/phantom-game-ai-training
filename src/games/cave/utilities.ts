import { MixedNetwork } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
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
import type { Ball } from './classes/Ball';
import type { Cave } from './classes/Cave';
import { config } from './classes/Config';

/** The shared group-score store, parameterized by the game prefix. Each game
 *  keeps these thin wrappers so call sites and storage keys stay unchanged. */
export type { GroupScores };
export { brainId, foldScores };
export const scoreKey = (group: Group): string =>
  scoreKeyForGame('cave', group);
export const loadScores = (group: Group, seed: number): GroupScores =>
  loadScoresForGame('cave', group, seed);
export const saveScores = (group: Group, scores?: GroupScores): void =>
  saveScoresForGame('cave', group, scores ?? group.scores);
export const clearScoreRecords = (): void => clearScoreRecordsForGame('cave');

/** a training group: the shared group shape plus the cave's own fields */
export interface Group extends GroupBase<Ball> {
  /** the brain that set the current cave's high score, kept for progress */
  seedBest: { brain: NeuralNetwork; score: number } | null;
  /** per-car gate completion times in simulation frames, one entry per gate */
  gateTimes: Record<string, number[]>;
}

/** the human driven car, exists while the game runs */
export const defaultState = {
  /** alive balls and the corpses still on the cave, both draw and score */
  balls: [] as Ball[],
  /** the balls sorted by score, rebuilt on HUD ticks for the board */
  sortedBalls: [] as Ball[],
  /** live car count: dips while a group's corpses linger, climbs back when
   *  that whole group respawns */
  living: 0,
  cave: undefined as Cave | undefined,
  human: undefined as Ball | undefined,
  sortedModels: [] as ModelsByLayerCount[],
  sortedMixed: [] as ModelsByLayerCount[],
  /** the live groups (pools + bests + scores), rebuilt on every cave change */
  groups: [] as Group[],
};

/**
 * The shared left scoreboard rows, best first: group record ghosts plus the
 * live balls, current cave only. The row logic lives in the shared
 * scoreBoard component; this adapter only extracts the cave's data.
 */
export function scoreBoardRows(state: typeof defaultState): ScoreBoardRow[] {
  return sharedScoreBoardRows({
    sorted: state.sortedBalls,
    groups: state.groups,
    topCount: config.SCORES_NB,
    trainees: state.groups.flatMap((group) =>
      group.distillRun ? group.pool.slice(0, 1) : [],
    ),
    human: state.human,
    brainKeyOf: (ball) =>
      ball.brain instanceof MixedNetwork ? 'mixed' : String(ball.brainLayers),
    maxLayers: config.MAX_NETWORK_LAYERS,
    mixedColor: config.MIXED_COLOR,
  });
}
