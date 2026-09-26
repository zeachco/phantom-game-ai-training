import { brainId, type defaultState, type Group } from '../utilities';

/** Renders the small progress board without coupling race simulation to DOM. */
export class TimingBoard {
  readonly element: HTMLElement;
  #bestLapRows: HTMLDivElement[];
  #finishRows: HTMLDivElement[];
  #state: typeof defaultState;
  #groups: readonly Group[];
  #completedFinishes: Map<
    string,
    { score: number | null; totalFrames: number }
  >;

  constructor(
    state: typeof defaultState,
    groups: readonly Group[],
    completedFinishes: Map<
      string,
      { score: number | null; totalFrames: number }
    >,
  ) {
    this.#state = state;
    this.#groups = groups;
    this.#completedFinishes = completedFinishes;

    const board = document.createElement('section');
    board.className = 'timing-board';
    board.setAttribute('aria-label', 'Best laps and finishers');
    const title = document.createElement('div');
    title.className = 'timing-board-title';
    title.textContent = 'race progress';

    const columns = document.createElement('div');
    columns.className = 'timing-board-columns';
    this.#bestLapRows = this.#makeColumn(columns, 'best laps');
    this.#finishRows = this.#makeColumn(columns, 'finish');
    board.append(title, columns);
    document.body.appendChild(board);
    this.element = board;
  }

  #makeColumn(parent: HTMLElement, heading: string) {
    const column = document.createElement('div');
    column.className = 'timing-board-column';
    const label = document.createElement('div');
    label.className = 'timing-board-heading';
    label.textContent = heading;
    const rows = new Array(3).fill(0).map(() => {
      const row = document.createElement('div');
      row.className = 'timing-board-row';
      column.append(row);
      return row;
    });
    column.prepend(label);
    parent.append(column);
    return rows;
  }

  #formatFrames(frames: number) {
    return `${Math.max(0, Math.round(frames))} f.`;
  }

  #formatScore(score: number) {
    const rounded = Math.round(score);
    if (Math.abs(rounded) >= 1_000_000)
      return `${(rounded / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
    if (Math.abs(rounded) >= 1_000)
      return `${(rounded / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
    return String(rounded);
  }

  #identityLabel(identity: string) {
    if (identity === 'mixed') return brainId(0);
    if (identity === 'human') return 'human';
    return brainId(Number(identity));
  }

  #identityColor(identity: string) {
    if (identity === 'human') return this.#state.human?.color;
    return this.#groups.find((group) => group.key === identity)?.pool[0]?.color;
  }

  update() {
    const ranked = this.#groups
      .map((group) => {
        const times = Object.values(group.lapTimes).flat();
        return { group, best: times.length ? Math.min(...times) : Infinity };
      })
      .filter((entry) => Number.isFinite(entry.best))
      .sort(
        (a, b) =>
          a.best - b.best ||
          (a.group.isMixed ? 1 : 0) - (b.group.isMixed ? 1 : 0) ||
          a.group.layer - b.group.layer,
      );

    this.#bestLapRows.forEach((row, index) => {
      const entry = ranked[index];
      row.style.color =
        entry?.group.pool[0]?.color || 'rgba(255, 255, 255, 0.82)';
      row.textContent = entry
        ? `${index + 1}. ${brainId(entry.group.layer)}  ${this.#formatFrames(entry.best)}`
        : `${index + 1}. —`;
    });

    const finishers = [...this.#completedFinishes.entries()]
      .sort(([, a], [, b]) => a.totalFrames - b.totalFrames)
      .slice(0, this.#finishRows.length);
    this.#finishRows.forEach((row, index) => {
      const entry = finishers[index];
      const identity = entry?.[0];
      const finish = entry?.[1];
      row.style.color =
        (identity && this.#identityColor(identity)) ||
        'rgba(255, 255, 255, 0.82)';
      row.textContent = identity
        ? `${index + 1}. ${this.#identityLabel(identity)}  ${
            finish?.score === null ? '—' : this.#formatScore(finish.score)
          } score  ${finish ? this.#formatFrames(finish.totalFrames) : '—'}`
        : `${index + 1}. —`;
    });
  }
}
