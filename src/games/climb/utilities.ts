import { MixedNetwork } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';
import {
  brainId,
  type GroupBase,
  type GroupScores,
  loadScores as loadScoresForGame,
  saveScores as saveScoresForGame,
  scoreKey as scoreKeyForGame,
} from '../../utilities/groupScores';
import type { ScoreBoardRow } from '../../utilities/scoreBoard';
import { scoreBoardRows as sharedScoreBoardRows } from '../../utilities/scoreBoard';
import { MIXED_COLOR } from '../../utilities/ai/colors';
import { config } from './classes/Config';
import type { Player } from './classes/Player';
import type { Tower } from './classes/Tower';

export { brainId };
/** The shared group-score store, parameterized by the game prefix. Each game
 *  keeps these thin wrappers so call sites and storage keys stay unchanged. */
export const scoreKey = (group: Group): string =>
  scoreKeyForGame('climb', group);
export const loadScores = (group: Group, seed: number): GroupScores =>
  loadScoresForGame('climb', group, seed);
export const saveScores = (group: Group, scores?: GroupScores): void =>
  saveScoresForGame('climb', group, scores ?? group.scores);

/** a training group: the shared group shape plus the climb's own fields */
export interface Group extends GroupBase<Player> {
  /** the brain that set the current tower's high score, kept for progress */
  seedBest: { brain: NeuralNetwork; score: number } | null;
}

/** the human driven player, exists while the game runs */
export const defaultState = {
  /** alive players and the corpses still in the tower, both draw and score */
  players: [] as Player[],
  sortedPlayers: [] as Player[],
  /** live player count: dips while a group's corpses linger, climbs back when
   *  that whole group respawns */
  living: 0,
  /** live players at the start of the seed, the cap the board reports */
  population: 0,
  /** world x/y at the follow point, exposed for debugging the camera */
  camX: 0,
  camY: 0,
  /** highest feet y among the living, the camera's climb target */
  highestY: 0,
  tower: undefined as Tower | undefined,
  human: undefined as Player | undefined,
  sortedModels: [] as ModelsByLayerCount[],
  sortedMixed: [] as ModelsByLayerCount[],
  playing: false,
  /** the live groups (pools + bests + scores), rebuilt on every seed change */
  groups: [] as Group[],
};

/**
 * The shared left scoreboard rows, best first: group record ghosts plus the
 * live climbers, current tower only. The row logic lives in the shared
 * scoreBoard component; this adapter only extracts the climb's data.
 */
export function scoreBoardRows(state: typeof defaultState): ScoreBoardRow[] {
  return sharedScoreBoardRows({
    sorted: state.sortedPlayers,
    groups: state.groups,
    topCount: config.SCORES_NB,
    trainees: state.groups.flatMap((group) =>
      group.distillRun ? group.pool.slice(0, 1) : [],
    ),
    human: state.human,
    brainKeyOf: (player) =>
      player.brain instanceof MixedNetwork
        ? 'mixed'
        : String(player.brainLayers),
    maxLayers: config.MAX_NETWORK_LAYERS,
    mixedColor: MIXED_COLOR,
  });
}
