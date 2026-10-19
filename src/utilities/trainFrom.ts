import { MIXED_KIND } from '../ai/Mixed';
import type { NeuralNetwork } from '../ai/Network';

/**
 * A group's distillation target ("train from"): which other group's champion
 * brain drives it while its own brains backpropagate. Persisted per game and
 * per group so a refresh keeps every group on its teacher.
 */

/** the marker shown on a car whose own brain is being trained by a teacher */
export const TRAINING_EMOJI = '🎓';

/**
 * The label of a group's car: a training run appends the training emoji, the
 * same way the first generation carries the baby emoji.
 */
export function studentLabel(label: string, training: boolean): string {
  return training ? `${label} ${TRAINING_EMOJI}` : label;
}

/**
 * The brain a training run hands over to the next generation: the student's
 * trained weights, carrying the score of the group's previous base model. A
 * disqualified run never moves a record, but its learning still carries over.
 */
export function trainedBrain(
  brain: NeuralNetwork,
  previousScore: number,
): NeuralNetwork {
  const clone = JSON.parse(JSON.stringify(brain)) as NeuralNetwork;
  clone.score = previousScore;
  return clone;
}

/**
 * The group's saved brains with the trained one first, so the next generation
 * mutates from it, trimmed to the hall-of-fame window.
 */
export function withTrainedBrain(
  saved: NeuralNetwork[],
  trained: NeuralNetwork,
  size: number,
): NeuralNetwork[] {
  return [
    trained,
    ...saved.filter((model) => model !== trained && model !== undefined),
  ].slice(0, Math.max(1, size));
}

const prefix = (game: string) => `${game}_trainFrom_`;

const parse = (value: string | null): number | 'mixed' | null =>
  value === null ? null : value === MIXED_KIND ? 'mixed' : Number(value);

export function trainFromKey(game: string, value: number | 'mixed'): string {
  return prefix(game) + (value === 'mixed' ? MIXED_KIND : String(value));
}

export function loadTrainFrom(
  game: string,
  value: number | 'mixed',
): number | 'mixed' | null {
  return parse(localStorage.getItem(trainFromKey(game, value)));
}

export function saveTrainFrom(
  game: string,
  value: number | 'mixed',
  target: number | 'mixed' | null,
): void {
  try {
    if (target === null) {
      localStorage.removeItem(trainFromKey(game, value));
    } else {
      localStorage.setItem(
        trainFromKey(game, value),
        target === 'mixed' ? MIXED_KIND : String(target),
      );
    }
  } catch (err) {
    console.warn('Unable to persist the train-from target', err);
  }
}

/**
 * Every persisted distillation target, as [student group, target] pairs.
 * Used to restore the selections right after the race initializes.
 */
export function loadTrainFroms(
  game: string,
): [number | 'mixed', number | 'mixed'][] {
  const pairs: [number | 'mixed', number | 'mixed'][] = [];
  const gamePrefix = prefix(game);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(gamePrefix)) continue;
    const student = key.slice(gamePrefix.length);
    const target = parse(localStorage.getItem(key));
    if (target === null) continue;
    const studentValue: number | 'mixed' =
      student === MIXED_KIND ? 'mixed' : Number(student);
    pairs.push([studentValue, target]);
  }
  return pairs;
}
