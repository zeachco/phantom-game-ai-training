/**
 * The trainer panel's group-actions block, shared by all four games. It is
 * inserted between the follow-keys and the network readout and is only
 * visible while a brain group (1-9 or mixed) is followed. It re-wires the
 * old long-press "reset brain saves" action to a plain button, adds remote
 * reload / remote delete, and shows the four trainer readouts (seed best,
 * cross-seed global best, server snapshot score, last sync time), refreshed
 * on follow change and every ~500 ms while the panel is open.
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
  io: { importModels(models: Record<string, unknown> | null): string[] };
  /** display label for a follow value, e.g. 'brain 3' or 'mixed' */
  label: (value: number | 'mixed') => string;
  /** live best on the group's current simulation seed, null when none */
  seedBest: (groupKey: string) => number | null;
  /** cross-seed global best, null when none (highway: same as seedBest) */
  globalBest: (groupKey: string) => number | null;
  /** reset the local saves for the value; the confirm happens inside */
  resetLocal: (value: number | 'mixed') => void;
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
}

export interface GroupActions {
  /** the <hr> + actions + readouts root, append once after .follow-keys */
  el: HTMLElement;
  /** show for a brain group, hide for 'all'; always refreshes the readouts */
  apply(value: number | 'mixed'): void;
  /** start/stop the ~500 ms refresh, driven by the panel open state */
  setOpen(open: boolean): void;
  /** force an immediate readout refresh */
  refresh(): void;
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
    'Delete this group\u2019s saved brains from this browser',
  );
  const reloadBtn = mkBtn(
    'Reload remote',
    'Download the group\u2019s best stored model from the server (overwrites local)',
  );
  const deleteBtn = mkBtn(
    'Delete remote',
    'Delete the group\u2019s stored models from the server',
  );
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
  readouts.appendChild(trainRow);
  const teacherVal = mkRow('teacher');
  const seedVal = mkRow('seed best');
  const globalVal = mkRow('global');
  const remoteVal = mkRow('remote');
  const syncVal = mkRow('last sync');
  el.appendChild(readouts);

  let value: number | 'mixed' = 0;
  let open = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  function refresh(): void {
    if (el.hidden || value === 0) return;
    const key = groupKeyFor(game, value);
    teacherVal.textContent = fmt(teacherScore(value));
    seedVal.textContent = fmt(seedBest(key));
    globalVal.textContent = fmt(globalBest(key));
    remoteVal.textContent = fmt(baseScores(game)[key]);
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

  localBtn.addEventListener('click', () => {
    if (value === 0) return;
    resetLocal(value);
    refresh();
  });

  reloadBtn.addEventListener('click', async () => {
    if (value === 0) return;
    const key = groupKeyFor(game, value);
    if (
      !confirm(
        `Reload ${label(value)} from the server? This overwrites the local save of ${key}.`,
      )
    )
      return;
    reloadBtn.disabled = true;
    try {
      const score = await fetchRemoteModel(game, key, io);
      if (score === null) {
        showToast(`No ${key} model on the server (or offline)`, {
          tone: 'error',
        });
      } else {
        reinitialize();
        showToast(`Reloaded ${key} from the server (score ${fmt(score)})`, {
          tone: 'success',
        });
      }
    } finally {
      reloadBtn.disabled = false;
      refresh();
    }
  });

  deleteBtn.addEventListener('click', async () => {
    if (value === 0) return;
    const key = groupKeyFor(game, value);
    if (
      !confirm(
        `Delete ${key} from the server? This removes the publicly stored models of the group; your local saves are kept.`,
      )
    )
      return;
    deleteBtn.disabled = true;
    try {
      const deleted = await deleteRemoteModels(game, key);
      if (deleted === null) {
        showToast(`Could not delete ${key} from the server (offline?)`, {
          tone: 'error',
        });
      } else {
        showToast(`Deleted ${deleted} stored model(s) of ${key}`, {
          tone: 'success',
        });
      }
    } finally {
      deleteBtn.disabled = false;
      refresh();
    }
  });

  /**
   * Rebuild the selector's options: free training plus every other group the
   * game runs (a group cannot distill from itself), then restore the stored
   * selection.
   */
  function rebuildTrainOptions(): void {
    trainSelect.length = 0;
    const free = document.createElement('option');
    free.value = '';
    free.textContent = 'free (own brains)';
    trainSelect.appendChild(free);
    for (const group of groups) {
      if (group === value) continue;
      const option = document.createElement('option');
      option.value = group === 'mixed' ? 'mixed' : String(group);
      option.textContent = label(group);
      trainSelect.appendChild(option);
    }
    const stored = trainFrom(value);
    trainSelect.value =
      stored === null ? '' : stored === 'mixed' ? 'mixed' : String(stored);
  }

  trainSelect.addEventListener('change', () => {
    if (value === 0) return;
    const raw = trainSelect.value;
    setTrainFrom(
      value,
      raw === '' ? null : raw === 'mixed' ? 'mixed' : Number(raw),
    );
    refresh();
  });

  return {
    el,
    apply(v: number | 'mixed'): void {
      value = v;
      el.hidden = v === 0;
      rebuildTrainOptions();
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
  };
}
