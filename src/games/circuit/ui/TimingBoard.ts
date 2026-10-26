import type { Car } from '../classes/Car';
import { config } from '../classes/Config';
import { brainId, type Group } from '../utilities';

type TimingEntry = {
  group?: Group;
  human?: boolean;
  color: string;
  laps: number;
  totalFrames: number;
  finished: boolean;
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
    this.#raceLabel.textContent = `race ${seed} (difficulty ${Math.round(
      difficulty,
    )}%)`;
  }

  #formatFrames(frames: number) {
    return `${Math.max(0, Math.round(frames))} f.`;
  }

  update() {
    const ranked: TimingEntry[] = this.#groups
      .map((group): TimingEntry | null => {
        let car: Car | undefined;
        for (const candidate of group.pool) {
          if (candidate.laps <= 0) continue;
          if (
            !car ||
            candidate.laps > car.laps ||
            (candidate.laps === car.laps &&
              candidate.totalRaceFrames < car.totalRaceFrames)
          )
            car = candidate;
        }
        const finish = this.#completedFinishes.get(group.key);
        if (!car && !finish) return null;
        if (finish)
          return {
            group,
            color: group.pool[0]?.color || 'rgba(255, 255, 255, 0.82)',
            laps: config.LAPS_PER_SEED,
            totalFrames: finish.totalFrames,
            finished: true,
          };
        if (!car) return null;
        return {
          group,
          color: group.pool[0]?.color || 'rgba(255, 255, 255, 0.82)',
          laps: car.laps,
          totalFrames: car.totalRaceFrames,
          // a guide-driven car can pass the final lap without finishing: it
          // stays a leader, never a finisher
          finished: car.finished,
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
        finished: !!humanFinish,
      });
    }

    const compare = (a: TimingEntry, b: TimingEntry) =>
      b.laps - a.laps ||
      a.totalFrames - b.totalFrames ||
      (a.group?.isMixed ? 1 : 0) - (b.group?.isMixed ? 1 : 0) ||
      (a.group?.layer ?? -1) - (b.group?.layer ?? -1);
    const finishers = ranked.filter((entry) => entry.finished);
    const leaders = ranked
      .filter((entry) => !entry.finished)
      .sort(compare)
      .slice(0, 3);
    const visible = [...finishers, ...leaders].sort(compare);

    while (this.#rows.length < Math.max(3, visible.length)) {
      const row = document.createElement('div');
      row.className = 'timing-board-row';
      this.#rows.push(row);
      this.element.appendChild(row);
    }
    while (this.#rows.length > Math.max(3, visible.length)) {
      this.#rows.pop()?.remove();
    }

    this.#rows.forEach((row, index) => {
      const entry = visible[index];
      row.style.color = entry?.color || 'rgba(255, 255, 255, 0.82)';
      const name = entry?.human
        ? '🕹 human'
        : entry?.group
          ? brainId(entry.group.layer)
          : '';
      row.textContent = entry
        ? `${index + 1}. ${name}  ${entry.laps}/${config.LAPS_PER_SEED}${
            entry.finished ? ' finished' : ''
          }  ${this.#formatFrames(entry.totalFrames)}`
        : `${index + 1}. —`;
    });
  }
}
