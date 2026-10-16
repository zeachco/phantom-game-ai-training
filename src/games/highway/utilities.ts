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

interface ScoreEntry {
  text: string;
  color: string;
}

/** The rows of the scoreboard, best first: saved ghosts plus the live cars. */
function scoreEntries(state: typeof defaultState): ScoreEntry[] {
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
        text: `${emoji} ${ref.label} ${Math.round(ref.brain.score)}${add}`,
        color: ref.damaged ? '#def' : ref.color,
      };
    }

    const symb = ref.diff > 0 ? `+${ref.diff.toFixed(2)}` : '';
    const emoji = isMixed(ref) ? '🧭' : '👻';
    const name = isMixed(ref)
      ? `${ref.version}-${ref.mutationIndex}`
      : `${ref.levels.length}-${ref.version}-${ref.mutationIndex}`;
    return {
      text: `${emoji} ${name} ${Math.round(ref.score)} ${symb}`,
      color: modelColor(ref),
    };
  });
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * A DOM scoreboard that floats at the stage's left edge, so it reads as a
 * screen HUD instead of being painted inside the narrow centered road canvas.
 * `update` is cheap to call every frame: it only rewrites the DOM when the
 * rendered markup changed.
 */
export function createScoreBoard() {
  const el = document.createElement('div');
  el.className = 'track-score-board highway-score-board';
  const title = document.createElement('div');
  title.className = 'track-score-title';
  title.textContent = 'Score board';
  const cars = document.createElement('div');
  cars.className = 'highway-score-cars';
  const rows = document.createElement('div');
  rows.className = 'track-score-rows';
  el.append(title, cars, rows);

  let lastCars = '';
  let lastRows = '';

  const update = (state: typeof defaultState) => {
    const carsText = `${state.living}/${state.sortedCars.length} cars`;
    if (carsText !== lastCars) {
      lastCars = carsText;
      cars.textContent = carsText;
      cars.style.color = getColorScale(
        state.sortedCars.length ? state.living / state.sortedCars.length : 0,
      );
    }

    const html = scoreEntries(state)
      .map(
        ({ text, color }) =>
          `<div class="highway-score-row" style="color:${color}">${escapeHtml(
            text,
          )}</div>`,
      )
      .join('');
    if (html !== lastRows) {
      lastRows = html;
      rows.innerHTML = html;
    }
  };

  return { el, update };
}
