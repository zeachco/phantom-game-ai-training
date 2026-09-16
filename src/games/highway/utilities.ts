import { ORCHESTRATOR_KIND, OrchestratorNetwork } from '../../ai/Orchestrator';
import { ModelsByLayerCount } from '../../ai/utils';
import { blendColorScale, getColorScale } from '../../utilities/colors';
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
  sortedOrchestrators: [] as ModelsByLayerCount[],
  playing: false,
};

const isOrchestrator = (model: ModelsByLayerCount[number]) =>
  model.kind === ORCHESTRATOR_KIND;

/** previous best save a model is competing against, kinds have their own saves */
function previousSave(
  state: typeof defaultState,
  model: ModelsByLayerCount[number],
) {
  const saves = isOrchestrator(model)
    ? state.sortedOrchestrators
    : state.sortedModels;
  const models = saves[model.levels.length];
  return (models && models[0]) || undefined;
}

/** color a layer depth gets on the scale shared by every brain of the game */
const layerColor = (layer: number) =>
  getColorScale(layer / config.MAX_NETWORK_LAYERS);

/**
 * Accent of an orchestrator: the colors of the brains it drives with, weighted
 * by how much of the run each of them has been driving. The shares drift a
 * frame at a time while the blend takes trig, so they are quantized and the
 * color cached per car.
 */
const orchestratorColors = new Map<string, string>();
export function orchestratorColor(brain: OrchestratorNetwork) {
  const shares = brain.selectionShares;
  const layers = brain.expertLayers;
  const key =
    layers.join() +
    ':' +
    shares.map((s) => Math.round(s * 20)).join();
  let color = orchestratorColors.get(key);
  if (!color) {
    color = blendColorScale(
      layers.map((layer, i) => ({
        ratio: layer / config.MAX_NETWORK_LAYERS,
        weight: shares[i],
      })),
      config.ORCHESTRATOR_COLOR,
    );
    if (orchestratorColors.size > 512) orchestratorColors.clear();
    orchestratorColors.set(key, color);
  }
  return color;
}

/** same blend for a save, where the experts are only kept as `layer.rank` slots */
const savedOrchestratorColor = (model: ModelsByLayerCount[number]) =>
  blendColorScale(
    (model.expertIds || []).map((slot: string, i: number) => ({
      ratio: parseInt(slot, 10) / config.MAX_NETWORK_LAYERS,
      weight: (model.selectionCounts && model.selectionCounts[i]) || 0,
    })),
    config.ORCHESTRATOR_COLOR,
  );

const modelColor = (model: ModelsByLayerCount[number]) =>
  isOrchestrator(model)
    ? savedOrchestratorColor(model)
    : layerColor(model.levels.length);

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
  const displayedScoreCars: (Car | ModelsByLayerCount[number])[] = [
    ...state.sortedModels.map((m) => m[0]).filter(Boolean),
    ...state.sortedOrchestrators.map((m) => m[0]).filter(Boolean),
    ...state.sortedCars.filter(
      (c, i) => i < config.SCORES_NB || c === state.player,
    ),
  ].sort((a, b) => {
    const scoreA = a instanceof Car ? a.brain.score : a.score;
    const scoreB = b instanceof Car ? b.brain.score : b.score;
    return scoreB - scoreA;
  });

  drawGradient(ctx, 0, FH * 1.75, 125, (displayedScoreCars.length + 2) * FH);

  ctx.fillStyle = getColorScale(state.living / state.sortedCars.length);
  ctx.font = `bold ${FH}px serif`;
  ctx.textAlign = 'left';
  ctx.fillText(
    `${state.living}/${state.sortedCars.length} cars`,
    TL,
    FH * 3,
  );

  displayedScoreCars.forEach((ref, index) => {
    if (ref instanceof Car) {
      const previous = previousSave(state, ref.brain);
      const previousScore = (previous && previous.score) || 0;
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
      const emoji = isOrchestrator(ref) ? '🧭' : '👻';
      const name = isOrchestrator(ref)
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
