import { MIXED_KIND } from '../ai/Mixed';

/**
 * A group's distillation target ("train from"): which other group's champion
 * brain drives it while its own brains backpropagate. Persisted per game and
 * per group so a refresh keeps every group on its teacher.
 */

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
