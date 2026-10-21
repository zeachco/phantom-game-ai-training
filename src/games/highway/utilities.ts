import { MIXED_KIND, type MixedNetwork } from '../../ai/Mixed';
import type { ModelsByLayerCount } from '../../ai/utils';
import {
  layerColor,
  mixedNetworkColor,
  savedMixedNetworkColor,
} from '../../utilities/ai/colors';
import type { ScoreBoardRow } from '../../utilities/scoreBoard';
import { buildScoreBoardRows } from '../../utilities/scoreBoard';
import type { Car } from './classes/Car';
import { config } from './classes/Config';

export const defaultState = {
  cars: [] as Car[],
  sortedCars: [] as Car[],
  /** number of undamaged cars, cars only die, so it only goes down */
  living: 0,
  traffic: [] as Car[],
  /** the human driven car, only exists when a compatible death car model loads */
  player: undefined as Car | undefined,
  sortedModels: [] as ModelsByLayerCount[],
  sortedMixed: [] as ModelsByLayerCount[],
  playing: false,
};

const isMixed = (model: ModelsByLayerCount[number]) =>
  model.kind === MIXED_KIND;

/** previous best save a model is competing against, kinds have their own saves */
function previousSave(
  state: typeof defaultState,
  model: ModelsByLayerCount[number],
) {
  const saves = isMixed(model) ? state.sortedMixed : state.sortedModels;
  const models = saves[model.levels.length];
  return models?.[0] || undefined;
}

export const mixedColor = (brain: MixedNetwork) =>
  mixedNetworkColor(brain, config.MAX_NETWORK_LAYERS, config.MIXED_COLOR);

const modelColor = (model: ModelsByLayerCount[number]) =>
  isMixed(model)
    ? savedMixedNetworkColor(
        model,
        config.MAX_NETWORK_LAYERS,
        config.MIXED_COLOR,
      )
    : layerColor(model.levels.length, config.MAX_NETWORK_LAYERS);

/**
 * The rows of the scoreboard, best first: saved ghosts plus the live cars.
 * The ordering and ghost handling live in the shared scoreBoard component;
 * the highway's saved-model ghosts are records, not duplicates of live
 * scores, so the ghost de-duplication stays off.
 */
export function scoreEntries(state: typeof defaultState): ScoreBoardRow[] {
  const liveCars = Array.from(
    new Set([
      ...state.sortedCars.slice(0, config.SCORES_NB),
      ...state.cars.filter((car) => car.distillRun),
    ]),
  );
  return buildScoreBoardRows({
    ghosts: [
      ...state.sortedModels.map((m) => m[0]).filter(Boolean),
      ...state.sortedMixed.map((m) => m[0]).filter(Boolean),
    ],
    ghostScore: (model) => model.score,
    ghostRow: (model) => {
      const symb = model.diff > 0 ? `+${model.diff.toFixed(2)}` : '';
      const emoji = isMixed(model) ? '🧭' : '👻';
      const name = isMixed(model)
        ? `${model.version}-${model.mutationIndex}`
        : `${model.levels.length}-${model.version}-${model.mutationIndex}`;
      return {
        emoji,
        text: `${name} ${Math.round(model.score)} ${symb}`,
        color: modelColor(model),
      };
    },
    lives: liveCars,
    liveScore: (car) => car.brain.score,
    liveRow: (car) => {
      const previous = previousSave(state, car.brain);
      const diff = car.brain.score - (previous?.score || 0);
      let emoji = '';
      let add = '';
      if (diff > 0) {
        emoji = car.damaged ? '🏆' : '💚';
        add = ` +${diff.toFixed(2)}`;
      } else {
        emoji = car.damaged ? '💀' : '💜';
      }
      return {
        emoji,
        text: `${car.label} ${Math.round(car.brain.score)}${add}`,
        color: car.damaged ? '#def' : car.color,
      };
    },
    dedupeGhosts: false,
  });
}
