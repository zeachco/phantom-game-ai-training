import type { Car } from '../classes/Car';
import { config } from '../classes/Config';
import { brainId, type Group } from '../utilities';

type TimingEntry = {
  group?: Group;
  human?: boolean;
  color: string;
  laps: number;
  totalFrames: number;
};

/** Renders the small progress board without coupling race simulation to DOM. */
export class TimingBoard {
  readonly element: HTMLElement;
  #rows: HTMLDivElement[];
  #raceLabel: HTMLSpanElement;
  #groups: readonly Group[];
  #completedFinishes: Map<string, { totalFrames: number }>;
  #getHuman: () => Car | undefined;

  constructor(
    groups: readonly Group[],
    completedFinishes: Map<string, { totalFrames: number }>,
    seed: number,
    getHuman: () => Car | undefined,
  ) {
    this.#groups = groups;
    this.#completedFinishes = completedFinishes;
    this.#getHuman = getHuman;

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
    const ranked: TimingEntry[] = this.#groups
      .map((group): TimingEntry | null => {
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
            color: group.pool[0]?.color || 'rgba(255, 255, 255, 0.82)',
            laps: config.LAPS_PER_SEED,
            totalFrames: finish.totalFrames,
          };
        return {
          group,
          color: group.pool[0]?.color || 'rgba(255, 255, 255, 0.82)',
          laps: car.laps,
          totalFrames: car.totalRaceFrames,
        };
      })
      .filter((entry): entry is TimingEntry => entry !== null);

    const human = this.#getHuman();
    const humanFinish = this.#completedFinishes.get('human');
    if (human && (human.laps > 0 || humanFinish)) {
      ranked.push({
        human: true,
        color: human.color,
        laps: humanFinish ? config.LAPS_PER_SEED : human.laps,
        totalFrames: humanFinish?.totalFrames ?? human.totalRaceFrames,
      });
    }

    ranked
      .sort(
        (a, b) =>
          b.laps - a.laps ||
          a.totalFrames - b.totalFrames ||
          (a.group?.isMixed ? 1 : 0) - (b.group?.isMixed ? 1 : 0) ||
          (a.group?.layer ?? -1) - (b.group?.layer ?? -1),
      )
      .splice(this.#rows.length);

    this.#rows.forEach((row, index) => {
      const entry = ranked[index];
      row.style.color = entry?.color || 'rgba(255, 255, 255, 0.82)';
      const name = entry?.human
        ? '🕹 human'
        : entry?.group
          ? brainId(entry.group.layer)
          : '';
      row.textContent = entry
        ? `${index + 1}. ${name}  ${entry.laps}/${config.LAPS_PER_SEED}${
            entry.laps >= config.LAPS_PER_SEED ? ' finished' : ''
          }  ${this.#formatFrames(entry.totalFrames)}`
        : `${index + 1}. —`;
    });
  }
}
