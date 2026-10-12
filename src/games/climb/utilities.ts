import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';
import { layerColor } from '../../utilities/ai/colors';
import { getColorScale } from '../../utilities/colors';
import { config } from './classes/Config';
import { Player } from './classes/Player';
import type { Tower } from './classes/Tower';

/** summarized score per group: the seed entry is the live high score on the
 *  tower the group is climbing. `total` and `phantom` are retained only for
 *  storage compatibility and are never used for display, ordering or
 *  promotion: the board is only about the current tower. */
export interface GroupScores {
  /** the seed of the tower the group is scoring on now */
  current: number;
  /** legacy cross-seed bar, kept for storage compat, never gates anything */
  total: number;
  /** live high score on the current seed */
  seed: number;
  /** last finished tower's high, kept as a record only */
  phantom: number;
  /** one frozen high score per finished seed, keyed by the seed number */
  history: Record<string, number>;
  /** groups that have completed this seed use mutations when they return */
  finished: Record<string, boolean>;
}

export interface Group {
  key: string; // '1'..'9' or 'mixed'
  layer: number;
  isMixed: boolean;
  pool: Player[];
  /** a finisher demotes the group to a small mutation-only swarm on slots 1..N;
   *  the state is remembered per seed so returning to that seed stays reduced */
  mutationOnly: boolean;
  /** snapshot of the champion brain + the score that promoted it */
  best: { brain: NeuralNetwork; score: number } | null;
  /** the brain that set the current tower's high score, kept for progress */
  seedBest: { brain: NeuralNetwork; score: number } | null;
  /** score frozen when the record holder died, shown for this group's ghost */
  ghostScore: number;
  scores: GroupScores;
}

/** the human driven player, exists while the game runs */
export const defaultState = {
  /** alive players and the corpses still in the tower, both draw and score */
  players: [] as Player[],
  sortedPlayers: [] as Player[],
  /** live player count: dips while a group's corpses linger, climbs back when
   *  that whole group respawns */
  living: 0,
  /** live players at the start of the seed, the cap the board reports */
  population: 0,
  /** world x/y at the follow point, exposed for debugging the camera */
  camX: 0,
  camY: 0,
  /** highest feet y among the living, the camera's climb target */
  highestY: 0,
  tower: undefined as Tower | undefined,
  human: undefined as Player | undefined,
  sortedModels: [] as ModelsByLayerCount[],
  sortedMixed: [] as ModelsByLayerCount[],
  playing: false,
  /** the live groups (pools + bests + scores), rebuilt on every seed change */
  groups: [] as Group[],
};

export function brainId(layer: number, mutationIndex?: number): string {
  const id = String(layer);
  return typeof mutationIndex !== 'number' ? id : `${id}:${mutationIndex}`;
}

/** scores live under their own key per group, still inside the game prefix */
export function scoreKey(group: Group): string {
  return group.isMixed
    ? `climb_score_${MIXED_KIND}_${MIXED_LEVELS}`
    : `climb_score_${group.layer}`;
}

export function loadScores(group: Group, seed: number): GroupScores {
  let scores: GroupScores | null = null;
  try {
    scores = JSON.parse(localStorage.getItem(scoreKey(group)) || 'null');
  } catch {
    scores = null;
  }
  if (!scores || typeof scores.total !== 'number') {
    return {
      current: seed,
      total: 0,
      seed: 0,
      phantom: 0,
      history: {},
      finished: {},
    };
  }
  // Older saves predate the per-seed history and completion marker.
  if (!scores.history || typeof scores.history !== 'object')
    scores.history = {};
  if (!scores.finished || typeof scores.finished !== 'object')
    scores.finished = {};
  if (typeof scores.phantom !== 'number') scores.phantom = 0;
  if (typeof scores.current !== 'number') scores.current = seed;
  if (typeof scores.seed !== 'number') scores.seed = 0;
  // A newly generated/selected seed folds the old live score, but always
  // starts a fresh comparison. The old score remains in history for the HUD.
  if (scores.current !== seed) {
    foldScores(scores, seed);
    saveScores(group, scores);
  }
  return scores;
}

export function saveScores(group: Group, scores = group.scores): void {
  localStorage.setItem(scoreKey(group), JSON.stringify(scores));
}

/** Remove race records without touching any saved neural networks. */
export function clearScoreRecords(): void {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('climb_score_')) localStorage.removeItem(key);
  }
}

/** A new seed records the old seed high and starts a fresh comparison.
 * History lives per seed for HUD reference, never as a goal for the new run. */
export function foldScores(scores: GroupScores, newSeed: number): void {
  const previousSeed = String(scores.current);
  scores.history[previousSeed] = Math.max(
    scores.history[previousSeed] || 0,
    scores.seed,
  );
  scores.phantom = scores.seed;
  scores.total = scores.seed;
  scores.current = newSeed;
  // A returning seed is a new training run: its former record is reference
  // data only, so mutations can establish a reachable fresh record.
  scores.seed = 0;
}

const FH = 12;
const TL = 0;
let gradient: CanvasGradient | undefined;

/** the board rows are rebuilt in place every tick, no new array per frame */
const displayedScorePlayers: (Player | Group)[] = [];

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
  // holder dies, and it stays hidden while a board player already shows that
  // score, so the leader is never doubled by its own ghost.
  const topPlayers = state.sortedPlayers;
  const topCount = Math.min(topPlayers.length, config.SCORES_NB);
  displayedScorePlayers.length = 0;
  for (let g = 0; g < state.groups.length; g++) {
    const group = state.groups[g];
    if (group.ghostScore <= 0) continue;
    let shown = false;
    for (let i = 0; i < topCount; i++) {
      if (topPlayers[i].brain?.score === group.ghostScore) {
        shown = true;
        break;
      }
    }
    if (!shown) displayedScorePlayers.push(group);
  }
  for (let i = 0; i < topCount; i++) displayedScorePlayers.push(topPlayers[i]);
  displayedScorePlayers.sort((a, b) => {
    // Current tower only: running players use their live score, ghosts use the
    // frozen dead record. Previous seeds and the cross-seed total never
    // take part in scoreboard ordering.
    const scoreA = a instanceof Player ? (a.brain?.score ?? 0) : a.ghostScore;
    const scoreB = b instanceof Player ? (b.brain?.score ?? 0) : b.ghostScore;
    return scoreB - scoreA;
  });

  drawGradient(ctx, 0, FH * 1.75, 125, (displayedScorePlayers.length + 2) * FH);

  ctx.fillStyle = getColorScale(
    Math.min(1, state.living / Math.max(1, state.population)),
  );
  ctx.font = `bold ${FH}px serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`${state.living}/${state.population}`, TL, FH * 3);

  displayedScorePlayers.forEach((ref, index) => {
    if (ref instanceof Player) {
      if (ref === state.human) {
        ctx.fillStyle = ref.damaged ? '#def' : ref.color;
        ctx.fillText(
          `🕹 ${ref.label} ${Math.round(ref.brain?.score ?? 0)}`,
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
      // Current tower only: a player leads when it holds its group's live
      // current-seed high. History lives in the weights, not in the board.
      const groupHigh = group?.scores.seed || 0;
      const leads =
        groupHigh > 0 && (ref.brain?.score ?? 0) >= groupHigh - Number.EPSILON;
      let emoji = '';
      if (leads) {
        emoji = ref.damaged ? '🏆' : '💚';
      } else {
        emoji = ref.damaged ? '💀' : '💜';
      }

      ctx.fillStyle = ref.damaged ? '#def' : ref.color;
      ctx.fillText(
        `${emoji} ${ref.label} ${Math.round(ref.brain?.score ?? 0)}`,
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
