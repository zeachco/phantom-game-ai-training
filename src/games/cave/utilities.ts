import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';
import { layerColor } from '../../utilities/ai/colors';
import type { ScoreBoardRow } from '../../utilities/scoreBoard';
import { config } from './classes/Config';
import { Ball } from './classes/Ball';
import type { Cave } from './classes/Cave';

/** summarized score per group: the seed entry is the live high score on the
 *  cave the group is driving. `total` and `phantom` are retained only for
 *  storage compatibility and are never used for display, ordering or
 *  promotion: the board is only about the current cave. */
export interface GroupScores {
  /** the seed of the cave the group is scoring on now */
  current: number;
  /** legacy cross-cave bar, kept for storage compat, never gates anything */
  total: number;
  /** live high score on the current seed */
  seed: number;
  /** last finished cave's high, kept as a record only */
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
  pool: Ball[];
  /** a finisher demotes the group to a small mutation-only swarm on slots 1..N;
   *  the state is remembered per seed so returning to that cave stays reduced */
  mutationOnly: boolean;
  /** snapshot of the champion brain + the score that promoted it */
  best: { brain: NeuralNetwork; score: number } | null;
  /** the brain that set the current cave's high score, kept for progress */
  seedBest: { brain: NeuralNetwork; score: number } | null;
  /** score frozen when the record holder died, shown for this group's ghost */
  ghostScore: number;
  /** distillation target: the group whose champion brain drives this one
   *  while its own brains backpropagate; null for free training */
  trainFrom: number | 'mixed' | null;
  /** true while this group's run is teacher-driven: the student score is
   *  frozen and the result is disqualified from promotion and saves. Cleared
   *  with trainFrom when the run ends */
  distillRun: boolean;
  /** the live teacher brain, refreshed every frame; null while the target
   *  group has no champion yet or the group trains free */
  teacher: NeuralNetwork | null;
  /** the hydrated copy of a champion loaded from the saves (plain data, no
   *  methods), cached while the same raw save stays champion */
  hydratedTeacher: { champion: NeuralNetwork; brain: NeuralNetwork } | null;
  scores: GroupScores;
  /** per-car gate completion times in simulation frames, one entry per gate */
  gateTimes: Record<string, number[]>;
}

/** the human driven car, exists while the game runs */
export const defaultState = {
  /** alive balls and the corpses still on the cave, both draw and score */
  balls: [] as Ball[],
  /** the balls sorted by score, rebuilt on HUD ticks for the board */
  sortedBalls: [] as Ball[],
  /** live car count: dips while a group's corpses linger, climbs back when
   *  that whole group respawns */
  living: 0,
  cave: undefined as Cave | undefined,
  human: undefined as Ball | undefined,
  sortedModels: [] as ModelsByLayerCount[],
  sortedMixed: [] as ModelsByLayerCount[],
  /** the live groups (pools + bests + scores), rebuilt on every cave change */
  groups: [] as Group[],
};

export function brainId(layer: number, mutationIndex?: number) {
  const id = String(layer);
  return typeof mutationIndex !== 'number' ? id : `${id}:${mutationIndex}`;
}

/** scores live under their own key per group, still inside the game prefix */
export function scoreKey(group: Group) {
  return group.isMixed
    ? `cave_score_${MIXED_KIND}_${MIXED_LEVELS}`
    : `cave_score_${group.layer}`;
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

export function saveScores(group: Group, scores = group.scores) {
  try {
    localStorage.setItem(scoreKey(group), JSON.stringify(scores));
  } catch (err) {
    // A full storage budget must not stop the animation frame, the same way
    // the neural saves degrade instead of throwing.
    console.warn(`Could not save scores for ${group.key}`, err);
  }
}

/** Remove race records without touching any saved neural networks. */
export function clearScoreRecords() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('cave_score_')) localStorage.removeItem(key);
  }
}

/** A new seed records the old cave high and starts a fresh comparison.
 * History lives per cave for HUD reference, never as a goal for the new run. */
export function foldScores(scores: GroupScores, newSeed: number) {
  const previousSeed = String(scores.current);
  scores.history[previousSeed] = Math.max(
    scores.history[previousSeed] || 0,
    scores.seed,
  );
  scores.phantom = scores.seed;
  scores.total = scores.seed;
  scores.current = newSeed;
  // A returning cave is a new training run: its former record is reference
  // data only, so mutations can establish a reachable fresh record.
  scores.seed = 0;
}

/**
 * The shared left scoreboard rows, best first: frozen group ghosts plus the
 * live balls, current cave only. Running balls use their live score, ghosts
 * the frozen dead record; a ghost stays hidden while a board ball already
 * shows that score, so the leader is never doubled by its own ghost.
 */
export function scoreBoardRows(state: typeof defaultState): ScoreBoardRow[] {
  const entries: (Ball | Group)[] = [];
  const topBalls = state.sortedBalls;
  const topCount = Math.min(topBalls.length, config.SCORES_NB);
  const displayedBalls = Array.from(
    new Set([
      ...topBalls.slice(0, topCount),
      ...state.groups.flatMap((group) =>
        group.distillRun ? group.pool.slice(0, 1) : [],
      ),
    ]),
  );
  for (const group of state.groups) {
    if (group.ghostScore <= 0) continue;
    const shown = displayedBalls.some(
      (ball) => ball.brain.score === group.ghostScore,
    );
    if (!shown) entries.push(group);
  }
  entries.push(...displayedBalls);
  entries.sort((a, b) => {
    const scoreA = a instanceof Ball ? a.brain.score : a.ghostScore;
    const scoreB = b instanceof Ball ? b.brain.score : b.ghostScore;
    return scoreB - scoreA;
  });

  return entries.map((ref): ScoreBoardRow => {
    if (ref instanceof Ball) {
      if (ref === state.human)
        return {
          emoji: '🕹',
          text: `${ref.label} ${Math.round(ref.brain.score)}`,
          color: ref.damaged ? '#def' : ref.color,
        };
      const group = state.groups.find(
        (g) =>
          g.key ===
          (ref.brain instanceof MixedNetwork
            ? 'mixed'
            : String(ref.brainLayers)),
      );
      // Current cave only: a ball leads when it holds its group's live
      // current-cave high. History lives in the weights, not in the board.
      const groupHigh = group?.scores.seed || 0;
      const leads =
        groupHigh > 0 && ref.brain.score >= groupHigh - Number.EPSILON;
      const emoji = leads
        ? ref.damaged
          ? '🏆'
          : '💚'
        : ref.damaged
          ? '💀'
          : '💜';
      return {
        emoji,
        text: `${ref.label} ${Math.round(ref.brain.score)}`,
        color: ref.damaged ? '#def' : ref.color,
      };
    }
    return {
      emoji: '👻',
      text: `${brainId(ref.layer, undefined)} ${Math.round(ref.ghostScore)}`,
      color: ref.isMixed
        ? config.MIXED_COLOR
        : layerColor(ref.layer, config.MAX_NETWORK_LAYERS),
    };
  });
}
