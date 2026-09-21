import { MixedNetwork } from '../../ai/Mixed';
import { ModelsByLayerCount } from '../../ai/utils';
import type { NeuralNetwork } from '../../ai/Network';
import { blendColorScale, getColorScale } from '../../utilities/colors';
import { layerColor, mixedNetworkColor } from '../../utilities/ai/colors';
import { Car } from './classes/Car';
import { Circuit } from './classes/Circuit';
import { config } from './classes/Config';
import { Obstacle } from './classes/Obstacle';

/** summarized score per group: the total is the promotion bar, the seed
 *  entry is the live high score on the map the group is driving */
export interface GroupScores {
  /** the seed of the map the group is scoring on now */
  current: number;
  /** cross-map score used only as the promotion gate */
  total: number;
  /** live high score on the current seed */
  seed: number;
  /** high score from the previous map, used as the visible ghost */
  phantom: number;
  /** one frozen high score per finished seed, keyed by the seed number */
  history: Record<string, number>;
}

export interface Group {
  key: string; // '1'..'9' or 'mixed'
  layer: number;
  isMixed: boolean;
  pool: Car[];
  /** snapshot of the champion brain + the score that promoted it */
  best: { brain: NeuralNetwork; score: number } | null;
  /** the brain that set the current map's high score, kept for progress */
  seedBest: { brain: NeuralNetwork; score: number } | null;
  /** score shown for this group's ghost throughout the active map */
  ghostScore: number;
  scores: GroupScores;
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
  /** world x/y at the follow point, exposed for debugging the camera */
  camX: 0,
  camY: 0,
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

export const mixedColor = (brain: MixedNetwork) =>
  mixedNetworkColor(brain, config.MAX_NETWORK_LAYERS, config.MIXED_COLOR);

export function brainId(
  layer: number,
  mutationIndex?: number,
  isMixed = false,
) {
  const id = isMixed ? 'Z' : String.fromCharCode(64 + layer);
  return mutationIndex == null ? id : `${id}${mutationIndex}`;
}

const FH = 12;
const TL = 0;
let gradient;

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
  const displayedScoreCars: (Car | Group)[] = [
    ...state.groups,
    ...state.sortedCars.slice(0, config.SCORES_NB),
  ].sort((a, b) => {
    // Running cars use their current score; ghosts use their fixed map score.
    // The cross-map total is deliberately not part of scoreboard ordering.
    const scoreA = a instanceof Car ? a.brain.score : a.ghostScore;
    const scoreB = b instanceof Car ? b.brain.score : b.ghostScore;
    return scoreB - scoreA;
  });

  drawGradient(ctx, 0, FH * 1.75, 125, (displayedScoreCars.length + 2) * FH);

  ctx.fillStyle = getColorScale(
    Math.min(1, state.living / Math.max(1, state.population)),
  );
  ctx.font = `bold ${FH}px serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`${state.living}/${state.population} cars`, TL, FH * 3);

  displayedScoreCars.forEach((ref, index) => {
    if (ref instanceof Car) {
      if (ref === state.human) {
        ctx.fillStyle = ref.damaged ? '#def' : ref.color;
        ctx.fillText(
          `🕹 ${ref.label} ${Math.round(ref.brain.score)}`,
          TL,
          FH * 4 + index * FH,
        );
        return;
      }
      const group = state.groups.find(
        (g) =>
          g.key ===
          (ref.brain instanceof MixedNetwork
            ? 'mixed'
            : String(ref.brainLayers)),
      );
      const previousScore = group?.ghostScore || 0;
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
      ctx.fillStyle = ref.isMixed
        ? blendColorScale([], config.MIXED_COLOR)
        : layerColor(ref.layer, config.MAX_NETWORK_LAYERS);

      const emoji = '👻';
      const name = brainId(ref.layer, undefined, ref.isMixed);
      ctx.fillText(
        `${emoji} ${name} ${Math.round(ref.ghostScore)}`,
        TL,
        FH * 4 + index * FH,
      );
    }
  });
}
