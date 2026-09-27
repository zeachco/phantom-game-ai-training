import { config } from '../classes/Config';
import { brainId, type Group } from '../utilities';

/** Renders the small progress board without coupling race simulation to DOM. */
export class TimingBoard {
  readonly element: HTMLElement;
  #rows: HTMLDivElement[];
  #raceLabel: HTMLSpanElement;
  #groups: readonly Group[];
  #completedFinishes: Map<string, { totalFrames: number }>;

  constructor(
    groups: readonly Group[],
    completedFinishes: Map<string, { totalFrames: number }>,
    seed: number,
  ) {
    this.#groups = groups;
    this.#completedFinishes = completedFinishes;

    const board = document.createElement('section');
    board.className = 'timing-board';
    board.setAttribute('aria-label', 'Current race progress');
    const title = document.createElement('div');
    title.className = 'timing-board-title';
    this.#raceLabel = document.createElement('span');
    title.append(this.#raceLabel);
    this.setSeed(seed);

    this.#rows = new Array(3).fill(0).map(() => {
      const row = document.createElement('div');
      row.className = 'timing-board-row';
      return row;
    });
    board.append(title, ...this.#rows);
    document.body.appendChild(board);
    this.element = board;
  }

  appendHeaderControl(control: HTMLElement) {
    const title = this.element.querySelector('.timing-board-title');
    title?.append(control);
  }

  setSeed(seed: number) {
    const difficulty = Math.min(
      100,
      (Math.max(0, seed) / config.CIRCUIT_DIFFICULTY_SEED_BASE) * 100,
    );
    this.#raceLabel.textContent = `race ${seed} (diff. ${Math.round(
      difficulty,
    )}%)`;
  }

  #formatFrames(frames: number) {
    return `${Math.max(0, Math.round(frames))} f.`;
  }

  update() {
    const ranked = this.#groups
      .map((group) => {
        const car = group.pool
          .filter((candidate) => candidate.laps > 0)
          .sort(
            (a, b) => b.laps - a.laps || a.totalRaceFrames - b.totalRaceFrames,
          )[0];
        const finish = this.#completedFinishes.get(group.key);
        if (!car && !finish) return null;
        if (finish)
          return {
            group,
            laps: config.LAPS_PER_SEED,
            totalFrames: finish.totalFrames,
          };
        return {
          group,
          laps: car.laps,
          totalFrames: car.totalRaceFrames,
        };
      })
      .filter((entry) => entry !== null)
      .sort(
        (a, b) =>
          b.laps - a.laps ||
          a.totalFrames - b.totalFrames ||
          (a.group.isMixed ? 1 : 0) - (b.group.isMixed ? 1 : 0) ||
          a.group.layer - b.group.layer,
      )
      .slice(0, this.#rows.length);

    this.#rows.forEach((row, index) => {
      const entry = ranked[index];
      row.style.color =
        entry?.group.pool[0]?.color || 'rgba(255, 255, 255, 0.82)';
      row.textContent = entry
        ? `${index + 1}. ${brainId(entry.group.layer)}  ${entry.laps}/${
            config.LAPS_PER_SEED
          }${
            entry.laps >= config.LAPS_PER_SEED ? ' finished' : ''
          }  ${this.#formatFrames(entry.totalFrames)}`
        : `${index + 1}. —`;
    });
  }
}
