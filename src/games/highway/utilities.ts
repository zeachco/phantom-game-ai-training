import { MIXED_KIND, type MixedNetwork } from '../../ai/Mixed';
import type { ModelsByLayerCount } from '../../ai/utils';
import {
  layerColor,
  mixedNetworkColor,
  savedMixedNetworkColor,
} from '../../utilities/ai/colors';
import { getColorScale } from '../../utilities/colors';
import { Car } from './classes/Car';
import { config } from './classes/Config';

export const defaultState = {
  cars: [] as Car[],
  sortedCars: [] as Car[],
  /** number of undamaged cars, cars only die, so it only goes down */
  living: 0,
  /** world y at the follow line, exposed for debugging the camera */
  camY: 0,
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

const FH = 12;
const TL = 0;
let gradient: CanvasGradient | undefined;

function drawGradient(ctx: CanvasRenderingContext2D, x, y, w, h) {
  if (!gradient) {
    gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#333');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
}

export function drawScores(
  state: typeof defaultState,
  ctx: CanvasRenderingContext2D,
) {
  const displayedScoreCars: (Car | ModelsByLayerCount[number])[] = [
    ...state.sortedModels.map((m) => m[0]).filter(Boolean),
    ...state.sortedMixed.map((m) => m[0]).filter(Boolean),
    ...state.sortedCars.slice(0, config.SCORES_NB),
  ].sort((a, b) => {
    const scoreA = a instanceof Car ? a.brain.score : a.score;
    const scoreB = b instanceof Car ? b.brain.score : b.score;
    return scoreB - scoreA;
  });

  drawGradient(ctx, 0, FH * 1.75, 125, (displayedScoreCars.length + 2) * FH);

  ctx.fillStyle = getColorScale(state.living / state.sortedCars.length);
  ctx.font = `bold ${FH}px serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`${state.living}/${state.sortedCars.length} cars`, TL, FH * 3);

  displayedScoreCars.forEach((ref, index) => {
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

      ctx.fillStyle = ref.damaged ? '#def' : ref.color;
      ctx.fillText(
        `${emoji} ${ref.label} ${Math.round(ref.brain.score)}${add}`,
        TL,
        FH * 4 + index * FH,
      );
    } else {
      ctx.fillStyle = modelColor(ref);

      const symb = ref.diff > 0 ? `+${ref.diff.toFixed(2)}` : '';
      const emoji = isMixed(ref) ? '🧭' : '👻';
      const name = isMixed(ref)
        ? `${ref.version}-${ref.mutationIndex}`
        : `${ref.levels.length}-${ref.version}-${ref.mutationIndex}`;
      ctx.fillText(
        `${emoji} ${name} ${Math.round(ref.score)} ${symb}`,
        TL,
        FH * 4 + index * FH,
      );
    }
  });
}
