import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';
import {
  brainId,
  brainKey,
  type GroupBase,
  type GroupScores,
} from '../../utilities/groupScores';
import type { ScoreBoardRow } from '../../utilities/scoreBoard';
import { scoreBoardRows as sharedScoreBoardRows } from '../../utilities/scoreBoard';
import type { Ball } from './classes/Ball';
import type { Cave } from './classes/Cave';
import { config } from './classes/Config';

export type { GroupScores };
export { brainId };

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
    brainKeyOf: (ball) => brainKey(ball.brain, ball.brainLayers),
    maxLayers: config.MAX_NETWORK_LAYERS,
    mixedColor: config.MIXED_COLOR,
  });
}
