const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface ScoreBoardRow {
  emoji: string;
  text: string;
  color: string;
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
