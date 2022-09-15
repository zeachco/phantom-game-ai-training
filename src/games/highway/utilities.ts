import { ModelsByLayerCount } from '../../ai/utils';
import { getColorScale } from '../../utilities/colors';
import { Car } from './classes/Car';
import { config } from './classes/Config';

export const defaultState = {
  cars: [] as Car[],
  sortedCars: [] as Car[],
  livingCars: [] as Car[],
  traffic: [] as Car[],
  player: new Car(),
  sortedModels: [] as ModelsByLayerCount[],
};

const FH = 12;
const TL = 0;

export function drawScores(
  state: typeof defaultState,
  ctx: CanvasRenderingContext2D,
) {
  ctx.fillStyle = getColorScale(
    state.livingCars.length / state.sortedCars.length,
  );
  ctx.font = `bold ${FH}px serif`;
  ctx.fillText(
    `${state.livingCars.length}/${state.sortedCars.length} cars`,
    TL,
    FH * 3,
  );

  const displayedScoreCars: (Car | ModelsByLayerCount[number])[] = [
    ...state.sortedModels.map((m) => m[0]).filter(Boolean),
    ...state.sortedCars.filter(
      (c, i) => i < config.SCORES_NB || c === state.player,
    ),
  ].sort((a, b) => {
    const scoreA = a instanceof Car ? a.brain.score : a.score;
    const scoreB = b instanceof Car ? b.brain.score : b.score;
    return scoreB - scoreA;
  });

  displayedScoreCars.forEach((ref, index) => {
    if (ref instanceof Car) {
      const models = state.sortedModels[ref.brain.levels.length];
      const previousScore = (models[0] && models[0].score) || 0;
      const diff = ref.brain.score - previousScore;
      let emoji = '';
      let add = '';
      if (diff > 0) {
        emoji = ref.damaged ? '📈' : '🏆';
        add = ` +${diff.toFixed(2)}`;
      } else {
        emoji = ref.damaged ? '💀' : '💗';
      }

      ctx.fillStyle = ref.damaged ? '#def' : ref.color;
      ctx.fillText(
        `${emoji} ${ref.label} ${Math.round(ref.brain.score)}${add}`,
        TL,
        FH * 4 + index * FH,
      );
    } else {
      ctx.fillStyle = getColorScale(
        ref.levels.length / config.MAX_NETWORK_LAYERS,
      );

      const symb = ref.diff > 0 ? '+' : '';
      ctx.fillText(
        `👻 ${ref.levels.length}-${ref.version}-${
          ref.mutationIndex
        } ${Math.round(ref.score)} ${symb}${ref.diff.toFixed(2)}`,
        TL,
        FH * 4 + index * FH,
      );
    }
  });
}
