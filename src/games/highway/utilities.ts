import { ModelsByLayerCount } from '../../ai/utils';
import { Car } from './classes/Car';
import { config } from './Config';

export const defaultState = {
  cars: [] as Car[],
  sortedCars: [] as Car[],
  livingCars: [] as Car[],
  traffic: [] as Car[],
  player: new Car(),
  sortedModels: [] as ModelsByLayerCount[],
};

const FH = 16;
const TL = 0;

export function drawScores(
  state: typeof defaultState,
  ctx: CanvasRenderingContext2D,
) {
  ctx.fillStyle = 'black';
  ctx.font = 'bold 14px serif';
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
    const scoreA = a instanceof Car ? a.neural.score : a.score;
    const scoreB = b instanceof Car ? b.neural.score : b.score;
    return scoreB - scoreA;
  });

  displayedScoreCars.forEach((ref, index) => {
    if (ref instanceof Car) {
      const emoji = ref.damaged ? '💀' : '❤️';
      ctx.fillStyle = ref.damaged ? '#def' : ref.color;
      ctx.fillText(
        `${emoji} ${ref.label} ${Math.round(ref.neural.score)}`,
        TL,
        FH * 5 + index * FH,
      );
    } else {
      ctx.fillStyle = 'white';
      ctx.fillText(
        `👻 ${ref.levels.length}-${ref.version}-${
          ref.mutationIndex
        } ${Math.round(ref.score)}`,
        TL,
        FH * 5 + index * FH,
      );
    }
  });
}
