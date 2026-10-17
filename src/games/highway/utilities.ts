import { MIXED_KIND, type MixedNetwork } from '../../ai/Mixed';
import type { ModelsByLayerCount } from '../../ai/utils';
import {
  layerColor,
  mixedNetworkColor,
  savedMixedNetworkColor,
} from '../../utilities/ai/colors';
import type { ScoreBoardRow } from '../../utilities/scoreBoard';
import { Car } from './classes/Car';
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

/** The rows of the scoreboard, best first: saved ghosts plus the live cars. */
export function scoreEntries(state: typeof defaultState): ScoreBoardRow[] {
  const displayedScoreCars: (Car | ModelsByLayerCount[number])[] = [
    ...state.sortedModels.map((m) => m[0]).filter(Boolean),
    ...state.sortedMixed.map((m) => m[0]).filter(Boolean),
    ...state.sortedCars.slice(0, config.SCORES_NB),
  ].sort((a, b) => {
    const scoreA = a instanceof Car ? a.brain.score : a.score;
    const scoreB = b instanceof Car ? b.brain.score : b.score;
    return scoreB - scoreA;
  });

  return displayedScoreCars.map((ref) => {
    if (ref instanceof Car) {
      const previous = previousSave(state, ref.brain);
      const previousScore = previous?.score || 0;
      const diff = ref.brain.score - previousScore;
      let emoji = '';
      let add = '';
      if (diff > 0) {
        emoji = ref.damaged ? '🏆' : '💚';
        add = ` +${diff.toFixed(2)}`;
      } else {
        emoji = ref.damaged ? '💀' : '💜';
      }
      return {
        emoji,
        text: `${ref.label} ${Math.round(ref.brain.score)}${add}`,
        color: ref.damaged ? '#def' : ref.color,
      };
    }

    const symb = ref.diff > 0 ? `+${ref.diff.toFixed(2)}` : '';
    const emoji = isMixed(ref) ? '🧭' : '👻';
    const name = isMixed(ref)
      ? `${ref.version}-${ref.mutationIndex}`
      : `${ref.levels.length}-${ref.version}-${ref.mutationIndex}`;
    return {
      emoji,
      text: `${name} ${Math.round(ref.score)} ${symb}`,
      color: modelColor(ref),
    };
  });
}
