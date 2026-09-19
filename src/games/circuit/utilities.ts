import { MixedNetwork } from '../../ai/Mixed';
import { ModelsByLayerCount } from '../../ai/utils';
import type { NeuralNetwork } from '../../ai/Network';
import { blendColorScale, getColorScale } from '../../utilities/colors';
import { Car } from './classes/Car';
import { Circuit } from './classes/Circuit';
import { config } from './classes/Config';
import { Obstacle } from './classes/Obstacle';

/** summarized score per group: the total is the promotion bar, the seed
 *  entry is the live high score on the map the group is driving */
export interface GroupScores {
  /** the seed of the map the group is scoring on now */
  current: number;
  /** the summarized overall score: each finished map halves the running total */
  total: number;
  /** live high score on the current seed */
  seed: number;
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
  scores: GroupScores;
}

export const defaultState = {
  /** alive cars and the corpses still on the map, both draw and score */
  cars: [] as Car[],
  sortedCars: [] as Car[],
  /** live car count, a corpse is replaced the frame it dies so it only dips */
  living: 0,
  /** live cars at the start of the map, the cap the board reports */
  population: 0,
  /** world x/y at the follow point, exposed for debugging the camera */
  camX: 0,
  camY: 0,
  obstacles: [] as Obstacle[],
  circuit: undefined as Circuit | undefined,
  /** the human driven car, only exists when a compatible death car model loads */
  player: undefined as Car | undefined,
  sortedModels: [] as ModelsByLayerCount[],
  sortedMixed: [] as ModelsByLayerCount[],
  playing: false,
  /** the live groups (pools + bests + scores), rebuilt on every map change */
  groups: [] as Group[],
};

/** color a layer depth gets on the scale shared by every brain of the game */
const layerColor = (layer: number) =>
  getColorScale(layer / config.MAX_NETWORK_LAYERS);

const mixedColors = new Map<string, string>();
export function mixedColor(brain: MixedNetwork) {
  const shares = brain.selectionShares;
  const layers = brain.expertLayers;
  const key =
    layers.join() + ':' + shares.map((s) => Math.round(s * 20)).join();
  let color = mixedColors.get(key);
  if (!color) {
    color = blendColorScale(
      layers.map((layer, i) => ({
        ratio: layer / config.MAX_NETWORK_LAYERS,
        weight: shares[i],
      })),
      config.MIXED_COLOR,
    );
    if (mixedColors.size > 512) mixedColors.clear();
    mixedColors.set(key, color);
  }
  return color;
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
    const scoreA = a instanceof Car ? a.brain.score : a.scores.total;
    const scoreB = b instanceof Car ? b.brain.score : b.scores.total;
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
      const group = state.groups.find(
        (g) => g.key === (ref.brain instanceof MixedNetwork ? 'mixed' : String(ref.brainLayers)),
      );
      const previousScore = group ? group.scores.total : 0;
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
        : layerColor(ref.layer);

      const emoji = ref.isMixed ? '🧭' : '👻';
      const name = ref.isMixed ? 'mixed' : `brain ${ref.layer}`;
      ctx.fillText(
        `${emoji} ${name} Σ ${Math.round(ref.scores.total)} · map ${Math.round(ref.scores.seed)}`,
        TL,
        FH * 4 + index * FH,
      );
    }
  });
}
