import type { Group } from '../utilities';

/** One row of the global board. */
export interface GlobalRow {
  group: Group;
  saved: number;
  current: number;
  total: number;
  /** tracks this group fully completed, one per finished seed */
  done: number;
}

/** The tracks a group has fully completed: `scores.finished` keeps one
 *  flag per seed the group crossed the line on. */
export function groupCompletions(group: Group): number {
  return Object.values(group.scores.finished).filter(Boolean).length;
}

/**
 * The global board's rows, sorted by completed races first (the board is a
 * leaderboard of groups that finish tracks), then by cumulative score, then
 * by the live score on the current track.
 */
export function globalRows(
  groups: readonly Group[],
  currentSeed: number,
): GlobalRow[] {
  return groups
    .map((group) => {
      const saved = Object.values(group.scores.history).reduce(
        (total, score) => total + score,
        0,
      );
      const current =
        group.scores.current === currentSeed ? group.scores.seed : 0;
      return {
        group,
        saved,
        current,
        total: saved + current,
        done: groupCompletions(group),
      };
    })
    .sort(
      (a, b) =>
        b.done - a.done || b.total - a.total || b.current - a.current,
    );
}

/**
 * Shows per-group saved, cumulative, and current-track scores, plus each
 * group's share of the completed races (`done/total` on the board).
 */
export class TrackScoreBoard {
  readonly element: HTMLElement;
  #groups: readonly Group[];
  #rows: HTMLDivElement;
  #lastRender = '';

  constructor(groups: readonly Group[]) {
    this.#groups = groups;

    const board = document.createElement('section');
    board.className = 'track-score-board';
    board.setAttribute('aria-label', 'Global track scores');

    const title = document.createElement('div');
    title.className = 'track-score-title';
    title.textContent = 'global scores';

    const headings = document.createElement('div');
    headings.className = 'track-score-row track-score-headings';
    for (const heading of ['brain', 'saved', 'total', 'now', 'done']) {
      const cell = document.createElement('span');
      cell.textContent = heading;
      headings.append(cell);
    }

    this.#rows = document.createElement('div');
    this.#rows.className = 'track-score-rows';
    board.append(title, headings, this.#rows);
    document.body.appendChild(board);
    this.element = board;
  }

  #formatScore(score: number) {
    const rounded = Math.round(score);
    const absolute = Math.abs(rounded);
    if (absolute >= 1_000_000)
      return `${(rounded / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}m`;
    if (absolute >= 1_000)
      return `${(rounded / 1_000).toFixed(1).replace(/\.?0+$/, '')}k`;
    return String(rounded);
  }

  update(currentSeed: number) {
    const rows = globalRows(this.#groups, currentSeed);
    const totalDone = rows.reduce((sum, row) => sum + row.done, 0);
    // why: rebuild a renderKey every update and skip the DOM when it is unchanged —
    // guards per-frame DOM churn on a 10-group board; the recompute on a skipped
    // pass is 10 groups × small history, not worth a second cache.
    const renderKey = rows
      .map(({ group, saved, current, total, done }) =>
        [group.key, saved, current, total, done, group.pool[0]?.color].join(
          '|',
        ),
      )
      .join('||');
    if (renderKey === this.#lastRender) return;
    this.#lastRender = renderKey;

    this.#rows.replaceChildren(
      ...rows.map(({ group, saved, current, total, done }) => {
        const row = document.createElement('div');
        row.className = 'track-score-row';
        row.style.color = group.pool[0]?.color || '#c4c4c4';
        const name = document.createElement('span');
        name.className = 'track-score-name';
        name.textContent = group.isMixed ? 'mixed' : `brain ${group.layer}`;
        const savedCell = document.createElement('span');
        savedCell.textContent = this.#formatScore(saved);
        const totalCell = document.createElement('span');
        totalCell.textContent = this.#formatScore(total);
        const currentCell = document.createElement('span');
        currentCell.textContent = this.#formatScore(current);
        const doneCell = document.createElement('span');
        doneCell.textContent = `${done}/${totalDone}`;
        row.append(name, savedCell, totalCell, currentCell, doneCell);
        return row;
      }),
    );
  }
}
