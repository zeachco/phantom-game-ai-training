/**
 * The trainer panel's group-actions block, shared by all four games. It is
 * inserted between the follow-keys and the network readout and is only
 * visible while a brain group (1-9 or mixed) is followed. It re-wires the
 * old long-press "reset brain saves" action to a plain button, adds remote
 * reload / remote delete, the trainer readouts (seed best, cross-seed global
 * best, server snapshot score, last sync time) and the live loss graph of the
 * followed student's distiller, refreshed on follow change and every ~500 ms
 * while the panel is open. Deleting the local saves immediately reloads the
 * group's stored model from the server, so the group keeps running on the
 * community best instead of a fresh random brain.
 */
import { MIXED_KIND, MIXED_LEVELS } from '../ai/Mixed';
import {
  baseScores,
  deleteRemoteModels,
  fetchRemoteModel,
  lastSyncAt,
} from '../ai/serverSync';
import { showToast } from './toast';

/** The server group key for a follow value: '1'..'9' or 'mixed'. */
export function groupKeyFor(game: string, value: number | 'mixed'): string {
  return value === 'mixed'
    ? `${game}_${MIXED_KIND}_${MIXED_LEVELS}`
    : `${game}_${value}`;
}

/** A sync timestamp as a short relative age, or 'never' when absent. */
export function relativeTime(
  ts: number | null,
  now: number = Date.now(),
): string {
  if (ts === null) return 'never';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const fmt = (n: number | null | undefined): string =>
  n === null || n === undefined || !Number.isFinite(n)
    ? '—'
    : String(Math.round(n));

export interface GroupActionsOptions {
  game: string;
  io: {
    importModels(models: Record<string, unknown> | null): string[];
    discardModel(layers: number, kind?: string): void;
    discardGameModels(): void;
  };
  /** display label for a follow value, e.g. 'brain 3' or 'mixed' */
  label: (value: number | 'mixed') => string;
  /** live best on the group's current simulation seed, null when none */
  seedBest: (groupKey: string) => number | null;
  /** cross-seed global best, null when none (highway: same as seedBest) */
  globalBest: (groupKey: string) => number | null;
  /** reset the local saves for the value; the confirm happens inside, and
   *  false is returned when it is cancelled so the remote reload is skipped */
  resetLocal: (value: number | 'mixed') => boolean;
  /** restart the race so an imported remote brain is picked up */
  reinitialize: () => void;
  /** every group value the game runs, e.g. [1..9, 'mixed'] */
  groups: (number | 'mixed')[];
  /** the group's stored distillation target, null for free training */
  trainFrom: (value: number | 'mixed') => number | 'mixed' | null;
  /** point the group at a teacher brain group, or null to free it */
  setTrainFrom: (
    value: number | 'mixed',
    target: number | 'mixed' | null,
  ) => void;
  /** score of the brain the group distills from, null for free or none yet */
  teacherScore: (value: number | 'mixed') => number | null;
  /** the group's accent color, used to color-code the train-from options */
  groupColor?: (value: number | 'mixed') => string;
  /**
   * The group whose brain the visualizer is drawing right now, null when no
   * brain is shown. Only used while "all" is followed, to report on the model
   * currently on screen instead of hiding the readouts.
   */
  displayedGroup?: () => number | 'mixed' | null;
}

export interface GroupActions {
  /** the <hr> + actions + readouts root, append once after .follow-keys */
  el: HTMLElement;
  /** show actions for all or a brain group; readouts are group-specific */
  apply(value: number | 'mixed'): void;
  /** start/stop the ~500 ms refresh, driven by the panel open state */
  setOpen(open: boolean): void;
  /** force an immediate readout refresh */
  refresh(): void;
  /**
   * Redraw the loss graph from the followed student's recent frame losses,
   * the games call it from their loop like the brain preview; null or empty
   * hides the row, so it only shows while a teacher is driving.
   */
  drawLossGraph(history: number[] | null): void;
}

export function createGroupActions(options: GroupActionsOptions): GroupActions {
  const {
    game,
    io,
    label,
    seedBest,
    globalBest,
    resetLocal,
    reinitialize,
    groups,
    trainFrom,
    setTrainFrom,
    teacherScore,
    groupColor,
    displayedGroup,
  } = options;

  const el = document.createElement('div');
  el.className = 'group-panel';
  el.hidden = true;

  const hr = document.createElement('hr');
  hr.className = 'group-panel-divider';
  el.appendChild(hr);

  const actions = document.createElement('div');
  actions.className = 'group-panel-actions';

  const mkBtn = (text: string, title: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'group-panel-btn';
    b.textContent = text;
    b.title = title;
    actions.appendChild(b);
    return b;
  };
  const localBtn = mkBtn(
    'Delete local',
    'Delete this group\u2019s saved brains from this browser, then reload the stored model from the server',
  );
  const reloadBtn = mkBtn(
    'Reload remote',
    'Download the group\u2019s best stored model from the server (overwrites local)',
  );
  const deleteBtn = mkBtn(
    'Delete remote',
    'Delete the group\u2019s stored models from the server',
  );
  deleteBtn.classList.add('group-panel-btn-danger');
  el.appendChild(actions);

  const readouts = document.createElement('div');
  readouts.className = 'group-panel-readouts';
  const mkRow = (text: string) => {
    const row = document.createElement('div');
    row.className = 'group-panel-row';
    const name = document.createElement('span');
    name.className = 'group-panel-name';
    name.textContent = text;
    const val = document.createElement('span');
    val.className = 'group-panel-value';
    row.appendChild(name);
    row.appendChild(val);
    readouts.appendChild(row);
    return val;
  };
  // the distillation control: which other group's champion brain drives this
  // group while its own brains backpropagate toward it
  const trainRow = document.createElement('div');
  trainRow.className = 'group-panel-row';
  const trainName = document.createElement('span');
  trainName.className = 'group-panel-name';
  trainName.textContent = 'train from';
  const trainSelect = document.createElement('select');
  trainSelect.className = 'group-panel-select';
  trainRow.appendChild(trainName);
  trainRow.appendChild(trainSelect);
  // in the "all" view the train-from control has no single group to point at:
  // the same row is recycled to name the group the visualizer is showing
  const shownVal = document.createElement('span');
  shownVal.className = 'group-panel-value';
  shownVal.hidden = true;
  trainRow.appendChild(shownVal);
  readouts.appendChild(trainRow);
  const teacherVal = mkRow('teacher');
  const teacherRow = teacherVal.parentElement as HTMLElement;
  const seedVal = mkRow('seed best');
  const globalVal = mkRow('global');
  const remoteVal = mkRow('remote');
  const syncVal = mkRow('last sync');
  // the live loss of the followed student's distiller, where the old
  // "learn per step" slider row used to be: it shows only while training
  const lossRow = document.createElement('div');
  lossRow.className = 'group-panel-row group-panel-loss-row';
  lossRow.hidden = true;
  const lossName = document.createElement('span');
  lossName.className = 'group-panel-name';
  lossName.textContent = 'loss';
  const lossCanvas = document.createElement('canvas');
  lossCanvas.className = 'group-panel-loss';
  const lossCtx = lossCanvas.getContext('2d');
  const lossVal = document.createElement('span');
  lossVal.className = 'group-panel-value';
  lossRow.append(lossName, lossCanvas, lossVal);
  readouts.appendChild(lossRow);
  el.appendChild(readouts);

  let value: number | 'mixed' = 0;
  let open = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  /** the select value for a stored target, '' standing for free training */
  const targetValue = (target: number | 'mixed' | null): string =>
    target === null ? '' : target === 'mixed' ? 'mixed' : String(target);

  function refresh(): void {
    if (el.hidden) return;
    // "all" reports on the brain currently drawn: its group has no train-from
    // control, so the row names it and the teacher row is dropped
    const all = value === 0;
    const group = all ? (displayedGroup?.() ?? null) : value;
    if (all) {
      shownVal.textContent = group === null ? '—' : label(group);
    } else {
      // a run ending resets the group to free training without a follow change
      const stored = targetValue(trainFrom(value));
      if (trainSelect.value !== stored) trainSelect.value = stored;
      // the closed select wears the color of the group it points at
      const target = trainFrom(value);
      trainSelect.style.color =
        target === null ? '' : (groupColor?.(target) ?? '');
      teacherVal.textContent = fmt(teacherScore(value));
    }
    if (group === null) {
      seedVal.textContent = '—';
      globalVal.textContent = '—';
      remoteVal.textContent = '—';
    } else {
      const key = groupKeyFor(game, group);
      seedVal.textContent = fmt(seedBest(key));
      globalVal.textContent = fmt(globalBest(key));
      remoteVal.textContent = fmt(baseScores(game)[key]);
    }
    syncVal.textContent = relativeTime(lastSyncAt(game));
  }

  function stopTimer(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function ensureTimer(): void {
    if (timer !== null || !open || el.hidden) return;
    timer = setInterval(refresh, 500);
  }

  /**
   * Fetches the stored models of the given targets into localStorage and
   * re-initializes the race so the imported brains are picked up. The
   * re-initialization only runs when at least one model landed; otherwise an
   * error toast names the group with nothing on the server (or an offline
   * request).
   */
  async function reloadFromServer(
    targets: (number | 'mixed')[],
    successPrefix: string,
    errorPrefix: string,
  ): Promise<void> {
    const keys = targets.map((target) => groupKeyFor(game, target));
    const results = await Promise.all(
      keys.map((key) => fetchRemoteModel(game, key, io)),
    );
    const loaded = results.filter((score) => score !== null);
    if (loaded.length === 0) {
      showToast(
        `${errorPrefix} ${targets.length > 1 ? game : keys[0]} model on the server (or offline)`,
        { tone: 'error' },
      );
      return;
    }
    reinitialize();
    showToast(
      targets.length > 1
        ? `${successPrefix} ${loaded.length} of ${keys.length} ${game} models from the server`
        : `${successPrefix} ${keys[0]} from the server (score ${fmt(loaded[0])})`,
      { tone: 'success' },
    );
  }

  localBtn.addEventListener('click', async () => {
    // the confirm and the discard happen inside; when the user backs out the
    // local saves are kept and nothing is reloaded
    if (!resetLocal(value)) return;
    localBtn.disabled = true;
    try {
      await reloadFromServer(
        value === 0 ? groups : [value],
        'Deleted local and reloaded',
        'Deleted local, but no',
      );
    } finally {
      localBtn.disabled = false;
      refresh();
    }
  });

  reloadBtn.addEventListener('click', async () => {
    const targets = value === 0 ? groups : [value];
    const keys = targets.map((target) => groupKeyFor(game, target));
    if (
      !confirm(
        value === 0
          ? `Reload all ${game} models from the server? This overwrites local saves for ${keys.join(', ')}.`
          : `Reload ${label(value)} from the server? This overwrites the local save of ${keys[0]}.`,
      )
    )
      return;
    reloadBtn.disabled = true;
    try {
      await reloadFromServer(targets, 'Reloaded', 'No');
    } finally {
      reloadBtn.disabled = false;
      refresh();
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const targets = value === 0 ? groups : [value];
    const keys = targets.map((target) => groupKeyFor(game, target));
    if (
      !confirm(
        value === 0
          ? `Delete all ${game} models from the server and remove all local saves?`
          : `Delete ${keys[0]} from the server? This removes the publicly stored models of the group and the local save.`,
      )
    )
      return;
    deleteBtn.disabled = true;
    try {
      const results = await Promise.all(
        keys.map((key) => deleteRemoteModels(game, key)),
      );
      if (results.every((deleted) => deleted === null)) {
        showToast(
          `Could not delete ${value === 0 ? game : keys[0]} models from the server (offline?)`,
          { tone: 'error' },
        );
      } else {
        if (value === 0) {
          io.discardGameModels();
        } else {
          for (let i = 0; i < targets.length; i++) {
            if (results[i] !== null) {
              const target = targets[i];
              if (target === 'mixed') {
                io.discardModel(MIXED_LEVELS, MIXED_KIND);
              } else {
                io.discardModel(target);
                io.discardModel(MIXED_LEVELS, MIXED_KIND);
              }
            }
          }
        }
        reinitialize();
        const deleted = results.reduce<number>(
          (sum, count) => sum + (count ?? 0),
          0,
        );
        showToast(
          value === 0
            ? `Deleted ${deleted} stored ${game} model(s) and removed local saves`
            : `Deleted ${deleted} stored model(s) of ${keys[0]} and removed local save`,
          { tone: 'success' },
        );
      }
    } finally {
      deleteBtn.disabled = false;
      refresh();
    }
  });

  /**
   * Rebuild the selector's options, disabling only the current group as its own
   * target, then restore the stored selection. Every other group can teach it,
   * the mixed brain included, and the options wear their group's color.
   */
  function rebuildTrainOptions(): void {
    trainSelect.length = 0;
    const free = document.createElement('option');
    free.value = '';
    free.textContent = 'free (own brains)';
    trainSelect.appendChild(free);
    for (const group of groups) {
      const option = document.createElement('option');
      option.value = group === 'mixed' ? 'mixed' : String(group);
      option.textContent = label(group);
      option.disabled = group === value;
      const color = groupColor?.(group);
      if (color) option.style.color = color;
      trainSelect.appendChild(option);
    }
    trainSelect.value = targetValue(trainFrom(value));
  }

  trainSelect.addEventListener('change', () => {
    // the pick is made: drop focus so the dropdown stops eating key input
    trainSelect.blur();
    if (value === 0) return;
    const raw = trainSelect.value;
    setTrainFrom(
      value,
      raw === '' ? null : raw === 'mixed' ? 'mixed' : Number(raw),
    );
    refresh();
  });

  /** the graph's line wears the panel accent, matching the readout values */
  const ACCENT = '#56dcf5';

  function drawLossGraph(history: number[] | null): void {
    const data = history && history.length > 0 ? history : null;
    if (data === null) {
      if (lossRow.hidden) return;
      lossRow.hidden = true;
      lossVal.textContent = '';
      return;
    }
    if (lossRow.hidden) lossRow.hidden = false;
    const latest = data[data.length - 1];
    lossVal.textContent = Number.isFinite(latest) ? latest.toPrecision(2) : '—';
    const ctx = lossCtx;
    if (!ctx) return;
    const w = lossCanvas.clientWidth;
    const h = lossCanvas.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.max(1, globalThis.devicePixelRatio || 1);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (lossCanvas.width !== pw || lossCanvas.height !== ph) {
      lossCanvas.width = pw;
      lossCanvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    let max = 0;
    for (const sample of data) if (sample > max) max = sample;
    max = Math.max(max, 1e-9);
    const pad = 3;
    const x = (i: number) =>
      pad + (i / Math.max(1, data.length - 1)) * (w - 2 * pad);
    const y = (sample: number) => h - pad - (sample / max) * (h - 2 * pad);
    // oldest at the left edge, newest at the right: the graph scrolls as the
    // window fills, and the scale follows the window's own peak
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      if (i === 0) ctx.moveTo(x(i), y(data[i]));
      else ctx.lineTo(x(i), y(data[i]));
    }
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // a faint fill under the same samples, closed down to the baseline
    ctx.lineTo(x(data.length - 1), h - pad);
    ctx.lineTo(x(0), h - pad);
    ctx.closePath();
    ctx.fillStyle = 'rgba(86, 220, 245, 0.12)';
    ctx.fill();
  }

  return {
    el,
    apply(v: number | 'mixed'): void {
      value = v;
      el.hidden = false;
      readouts.hidden = false;
      hr.hidden = false;
      const all = v === 0;
      // the "all" view shows the displayed group in place of the train-from
      // selector, and drops the teacher row that only fits one group
      trainName.textContent = all ? 'showing' : 'train from';
      trainSelect.hidden = all;
      shownVal.hidden = !all;
      teacherRow.hidden = all;
      // nothing to train from while no group is followed, and the games create
      // this panel before their race exists: don't call back into them yet
      if (!all) rebuildTrainOptions();
      refresh();
      ensureTimer();
    },
    setOpen(o: boolean): void {
      open = o;
      if (o) {
        refresh();
        ensureTimer();
      } else {
        stopTimer();
      }
    },
    refresh,
    drawLossGraph,
  };
}
