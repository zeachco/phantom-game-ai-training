import { MixedNetwork } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';
import { layerColor } from '../../utilities/ai/colors';
import { getColorScale } from '../../utilities/colors';
import { Car } from './classes/Car';
import type { Circuit } from './classes/Circuit';
import { config } from './classes/Config';
import type { Obstacle } from './classes/Obstacle';

/** summarized score per group: the seed entry is the live high score on the
 *  map the group is driving. `total` and `phantom` are retained only for
 *  storage compatibility and are never used for display, ordering or
 *  promotion: the board is only about the current track. */
export interface GroupScores {
  /** the seed of the map the group is scoring on now */
  current: number;
  /** legacy cross-map bar, kept for storage compat, never gates anything */
  total: number;
  /** live high score on the current seed */
  seed: number;
  /** last finished map's high, kept as a record only, never shown as ghost */
  phantom: number;
  /** one frozen high score per finished seed, keyed by the seed number */
  history: Record<string, number>;
}

export interface Group {
  key: string; // '1'..'9' or 'mixed'
  layer: number;
  isMixed: boolean;
  pool: Car[];
  /** a finisher demotes the group to a small mutation-only swarm on slots 1..N;
   *  it stays reduced until the group is rebuilt by a map change or a reset */
  mutationOnly: boolean;
  /** snapshot of the champion brain + the score that promoted it */
  best: { brain: NeuralNetwork; score: number } | null;
  /** the brain that set the current map's high score, kept for progress */
  seedBest: { brain: NeuralNetwork; score: number } | null;
  /** score frozen when the record holder died, shown for this group's ghost */
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

export function brainId(layer: number, mutationIndex?: number) {
  const id = String(layer);
  return typeof mutationIndex !== 'number' ? id : `${id}:${mutationIndex}`;
}

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
  // Ghosts are frozen dead records: a ghost is only saved when the record
  // holder dies, and it stays hidden while a board car already shows that
  // score, so the leader is never doubled by its own ghost.
  const topCars = state.sortedCars.slice(0, config.SCORES_NB);
  const shownScores = new Set(topCars.map((car) => car.brain.score));
  const displayedScoreCars: (Car | Group)[] = [
    ...state.groups.filter(
      (group) => group.ghostScore > 0 && !shownScores.has(group.ghostScore),
    ),
    ...topCars,
  ].sort((a, b) => {
    // Current track only: running cars use their live score, ghosts use the
    // frozen dead record. Previous maps and the cross-map total never
    // take part in scoreboard ordering.
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
      // Current track only: a car leads when it holds its group's live
      // current-map high. History lives in the weights, not in the board.
      const groupHigh = group?.scores.seed || 0;
      const leads =
        groupHigh > 0 && ref.brain.score >= groupHigh - Number.EPSILON;
      let emoji = '';
      if (leads) {
        emoji = ref.damaged ? '🏆' : '💚';
      } else {
        emoji = ref.damaged ? '💀' : '💜';
      }

      ctx.fillStyle = ref.damaged ? '#def' : ref.color;
      ctx.fillText(
        `${emoji} ${ref.label} ${Math.round(ref.brain.score)}`,
        TL,
        FH * 4 + index * FH,
      );
    } else {
      ctx.fillStyle = ref.isMixed
        ? config.MIXED_COLOR
        : layerColor(ref.layer, config.MAX_NETWORK_LAYERS);

      const emoji = '👻';
      const name = brainId(ref.layer, undefined);
      ctx.fillText(
        `${emoji} ${name} ${Math.round(ref.ghostScore)}`,
        TL,
        FH * 4 + index * FH,
      );
    }
  });
}
