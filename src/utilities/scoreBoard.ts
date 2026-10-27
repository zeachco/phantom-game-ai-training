import { layerColor } from './ai/colors';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface ScoreBoardRow {
  emoji: string;
  text: string;
  color: string;
}

/** The fields the shared scoreboard needs from a live racing entity (a car,
 *  a ball or a climber). Car, Ball and Player all satisfy this shape. */
export interface ScoreBoardEntity {
  brain?: { score: number } | null;
  label: string;
  color: string;
  damaged: boolean;
  brainLayers: number;
}

/** The fields the shared scoreboard needs from a brain group. Each game's
 *  Group satisfies this shape. */
export interface ScoreBoardGroup {
  key: string;
  layer: number;
  isMixed: boolean;
  ghostScore: number;
  scores: { seed: number };
}

/**
 * The engine behind every top-left scoreboard: ghost rows and live rows are
 * merged and sorted best first, and a ghost stays hidden while a live row
 * already shows that score, so a record holder is never doubled by its own
 * ghost (disable with `dedupeGhosts` for boards whose ghosts are not
 * duplicates of live scores, like the highway's saved models).
 */
export function buildScoreBoardRows<G, L>(options: {
  ghosts: G[];
  ghostScore: (ghost: G) => number;
  ghostRow: (ghost: G) => ScoreBoardRow;
  lives: L[];
  liveScore: (live: L) => number;
  liveRow: (live: L) => ScoreBoardRow;
  dedupeGhosts?: boolean;
}): ScoreBoardRow[] {
  const {
    ghosts,
    ghostScore,
    ghostRow,
    lives,
    liveScore,
    liveRow,
    dedupeGhosts = true,
  } = options;
  const rows: { score: number; row: ScoreBoardRow }[] = [];
  for (const ghost of ghosts) {
    const score = ghostScore(ghost);
    if (dedupeGhosts && lives.some((live) => liveScore(live) === score))
      continue;
    rows.push({ score, row: ghostRow(ghost) });
  }
  for (const live of lives)
    rows.push({ score: liveScore(live), row: liveRow(live) });
  rows.sort((a, b) => b.score - a.score);
  return rows.map(({ row }) => row);
}

/**
 * The rows the seed-based games (circuit, climb, cave) show in their shared
 * top-left board, best first: one 👻 ghost per group with a record — its
 * best recorded score, hidden while a displayed entity already shows that
 * score — plus the live entities: the top `topCount` by score and one
 * trainee per distilling group. A live entity leads (💚, or 🏆 if crashed)
 * while it holds its group's live high score; the human keeps the 🕹 row.
 */
export function scoreBoardRows(options: {
  /** every live entity, best first (the race's sorted leaderboard) */
  sorted: ScoreBoardEntity[];
  /** the brain groups, in any order */
  groups: ScoreBoardGroup[];
  /** how many top entities make the board, e.g. config.SCORES_NB */
  topCount: number;
  /** one trainee per distilling group, forced onto the board */
  trainees?: ScoreBoardEntity[];
  /** the human-driven entity, shown with the 🕹 emoji */
  human?: ScoreBoardEntity;
  /** the group key of an entity's brain: 'mixed' or the layer number */
  brainKeyOf: (entity: ScoreBoardEntity) => string;
  /** the layer count for brain colors, e.g. config.MAX_NETWORK_LAYERS */
  maxLayers: number;
  /** the mixed-brain color, the shared MIXED_COLOR */
  mixedColor: string;
}): ScoreBoardRow[] {
  const { sorted, groups, topCount, human, brainKeyOf, maxLayers, mixedColor } =
    options;
  const displayed = Array.from(
    new Set([...sorted.slice(0, topCount), ...(options.trainees ?? [])]),
  );
  return buildScoreBoardRows({
    ghosts: groups.filter((group) => group.ghostScore > 0),
    ghostScore: (group) => group.ghostScore,
    ghostRow: (group) => ({
      emoji: '👻',
      text: `${String(group.layer)} ${Math.round(group.ghostScore)}`,
      color: group.isMixed ? mixedColor : layerColor(group.layer, maxLayers),
    }),
    lives: displayed,
    liveScore: (entity) => entity.brain?.score ?? 0,
    liveRow: (entity) => {
      const score = entity.brain?.score ?? 0;
      if (entity === human)
        return {
          emoji: '🕹',
          text: `${entity.label} ${Math.round(score)}`,
          color: entity.damaged ? '#def' : entity.color,
        };
      const group = groups.find((g) => g.key === brainKeyOf(entity));
      // The entity leads while it holds its group's live high score.
      const groupHigh = group?.scores.seed || 0;
      const leads = groupHigh > 0 && score >= groupHigh - Number.EPSILON;
      const emoji = leads
        ? entity.damaged
          ? '🏆'
          : '💚'
        : entity.damaged
          ? '💀'
          : '💜';
      return {
        emoji,
        text: `${entity.label} ${Math.round(score)}`,
        color: entity.damaged ? '#def' : entity.color,
      };
    },
  });
}

/**
 * The shared live scoreboard: a DOM panel that floats at the stage's left
 * edge, small-caps title, a bold alive/total count line, then one row per
 * entry with its emoji and the entry's color. Every game feeds its own rows
 * (live cars, ghosts, group records) but the design is the one the highway
 * settled on. `update` only rewrites the DOM when the rendered markup
 * changed, so it is cheap enough to call every frame.
 */
export function createScoreBoard(title = 'Score board') {
  const el = document.createElement('div');
  el.className = 'track-score-board score-board-left';
  const titleEl = document.createElement('div');
  titleEl.className = 'track-score-title';
  titleEl.textContent = title;
  const count = document.createElement('div');
  count.className = 'score-board-cars';
  const rows = document.createElement('div');
  rows.className = 'score-board-rows';
  el.append(titleEl, count, rows);

  let lastCount = '';
  let lastCountColor = '';
  let lastRows = '';

  const update = (
    countText: { text: string; color?: string } | null,
    entries: ScoreBoardRow[],
  ) => {
    const text = countText?.text ?? '';
    const color = countText?.color ?? '';
    if (text !== lastCount || color !== lastCountColor) {
      lastCount = text;
      lastCountColor = color;
      count.textContent = text;
      count.style.color = color;
    }
    const html = entries
      .map(
        ({ emoji, text, color }) =>
          `<div class="score-board-row" style="color:${color}">${
            emoji ? `${emoji} ` : ''
          }${escapeHtml(text)}</div>`,
      )
      .join('');
    if (html !== lastRows) {
      lastRows = html;
      rows.innerHTML = html;
    }
  };

  return { el, update };
}
