import type { Group } from '../utilities';

/** Shows per-group saved, cumulative, and current-track scores. */
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
    for (const heading of ['brain', 'saved', 'total', 'now']) {
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

  #savedScore(group: Group) {
    return Object.values(group.scores.history).reduce(
      (total, score) => total + score,
      0,
    );
  }

  update(currentSeed: number) {
    const scores = this.#groups
      .map((group) => {
        const saved = this.#savedScore(group);
        const current =
          group.scores.current === currentSeed ? group.scores.seed : 0;
        return { group, saved, current, total: saved + current };
      })
      .sort((a, b) => b.total - a.total || b.current - a.current);
    const renderKey = scores
      .map(({ group, saved, current, total }) =>
        [group.key, saved, current, total, group.pool[0]?.color].join('|'),
      )
      .join('||');
    if (renderKey === this.#lastRender) return;
    this.#lastRender = renderKey;

    this.#rows.replaceChildren(
      ...scores.map(({ group, saved, current, total }) => {
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
        row.append(name, savedCell, totalCell, currentCell);
        return row;
      }),
    );
  }
}
