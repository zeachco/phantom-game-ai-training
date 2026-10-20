/**
 * The trainer aside, shared by all four games: a slide-out panel holding the
 * follow buttons, the group-actions block, a fixed 4:3 brain preview canvas
 * and a collapsible "more" section at the bottom.
 *
 * The games pass their group-action callbacks and panel content, then drive
 * the follow state (onFollow), the button running/dead classes (setRunning)
 * and the canvas (network + their visualizer) from their own loop.
 */
import { layerColor } from './ai/colors';
import { contrastText } from './colors';
import {
  bindSidePanelToggle,
  createCollapsibleSection,
  resizeCanvas,
} from './dom';
import { bindFollowKeys } from './followKeys';
import {
  createGroupActions,
  type GroupActions,
  type GroupActionsOptions,
} from './groupActions';

/** a follow target: 0 is "all", 1-9 a brain layer, 'mixed' the mixed brain */
export type FollowValue = number | 'mixed';

/** the open panel takes that share of the screen, capped in width */
const PANEL_RATIO = 0.75;
const PANEL_MAX_WIDTH = 800;
/** the neutral tone 'all' and the canvas frame wear when no brain color fits */
const NEUTRAL_COLOR = '#c4c4c4';

export interface SidePanelOptions {
  /** the group-actions block between the follow keys and the canvas */
  groupActions: GroupActionsOptions;
  /** the collapsible "more" body at the bottom (legend, about, ...) */
  content: HTMLElement;
  /** the numbered brain groups the game runs, default 9 */
  layers?: number;
  /** the initial follow target, default 'all' */
  initialFollow?: FollowValue;
  /** whether the panel starts open, default closed */
  initialOpen?: boolean;
  /**
   * button accent per follow value;
   * default: the brain's color, neutral for 'all'
   */
  buttonColor?: (value: FollowValue) => string | undefined;
  /**
   * canvas frame accent per follow value;
   * default: the brain's color, neutral otherwise
   */
  networkColor?: (value: FollowValue) => string;
  /**
   * the game's own follow state; the panel applies the target (button class,
   * canvas color, group actions) first, then calls this
   */
  onFollow?: (value: FollowValue, origin: 'button' | 'key' | 'program') => void;
}

export interface SidePanel {
  /** the <aside>; attach it to document.body (the demo profile skips that) */
  el: HTMLElement;
  /** true while the panel is open */
  isOpen(): boolean;
  /** the width the open panel takes out of the viewport */
  panelWidth(): number;
  /** point the panel at a follow target; the game does its part in onFollow */
  setFollow(value: FollowValue): void;
  follow(): FollowValue;
  /** paint the running/dead button states; 'all' runs whenever anyAlive */
  setRunning(running: Set<string>, anyAlive: boolean): void;
  /** the 4:3 brain preview, resized to fit its wrapper */
  network(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
  /** the group-actions block, exposed for direct pokes */
  groupPanel: GroupActions;
}

function defaultButtonColor(layers: number) {
  return (value: FollowValue): string =>
    value === 0
      ? NEUTRAL_COLOR
      : layerColor(value === 'mixed' ? 0 : value, layers);
}

function defaultNetworkColor(layers: number) {
  return (value: FollowValue): string =>
    typeof value === 'number' && value > 0
      ? layerColor(value, layers)
      : NEUTRAL_COLOR;
}

export function createSidePanel(options: SidePanelOptions): SidePanel {
  const {
    groupActions,
    content,
    layers = 9,
    initialFollow = 0,
    initialOpen = false,
    buttonColor = defaultButtonColor(layers),
    networkColor = defaultNetworkColor(layers),
    onFollow,
  } = options;

  const el = document.createElement('aside');
  el.className = 'side-panel';
  el.style.width = `${PANEL_RATIO * 100}%`;
  el.style.maxWidth = `${PANEL_MAX_WIDTH}px`;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'side-panel-toggle';
  toggleBtn.textContent = '❮';
  toggleBtn.setAttribute('title', 'F12 to toggle');
  toggleBtn.setAttribute('aria-label', 'Toggle models panel');

  const groupPanel = createGroupActions(groupActions);

  // ---- follow buttons
  const followKeys = document.createElement('div');
  followKeys.className = 'follow-keys';
  const followLabel = document.createElement('span');
  followLabel.textContent = 'Follow';
  followKeys.append(followLabel);

  /** one entry per button; running stays undefined until the first pass so
   *  the classes always paint */
  const buttons = new Map<
    HTMLButtonElement,
    { key: string; running?: boolean }
  >();

  const addFollowBtn = (value: FollowValue, label: string) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.follow = String(value);
    btn.title = 'Click to follow';
    const color = buttonColor(value);
    if (color) {
      btn.style.setProperty('--btn-color', color);
      // black or white, whichever keeps the higher contrast on the brain color
      btn.style.setProperty('--btn-text', contrastText(color));
    }
    btn.onclick = () => applyFollow(value, 'button');
    followKeys.append(btn);
    buttons.set(btn, { key: String(value) });
  };
  for (let layer = 1; layer <= layers; layer++)
    addFollowBtn(layer, `brain ${layer}`);
  addFollowBtn(0, 'all');
  addFollowBtn('mixed', 'mixed');

  // ---- brain preview, a fixed 4:3 shape inside the panel
  const netWrap = document.createElement('div');
  netWrap.style.aspectRatio = '4 / 3';
  netWrap.style.flex = '0 0 auto';
  netWrap.style.position = 'relative';
  const canvas = document.createElement('canvas');
  canvas.className = 'neural-canvas';
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  const ctx = canvas.getContext('2d')!;
  netWrap.append(canvas);

  const panelContent = document.createElement('div');
  panelContent.className = 'side-panel-content';
  panelContent.append(
    followKeys,
    groupPanel.el,
    netWrap,
    createCollapsibleSection(content),
  );
  el.append(toggleBtn, panelContent);

  // ---- open / close
  let open = initialOpen;
  if (open) {
    el.classList.add('open');
    toggleBtn.textContent = '❯';
    groupPanel.setOpen(true);
  }
  const setOpen = (value: boolean) => {
    open = value;
    el.classList.toggle('open', open);
    toggleBtn.textContent = open ? '❯' : '❮';
    groupPanel.setOpen(open);
  };
  toggleBtn.onclick = () => setOpen(!open);
  // F12 or L open the panel like the tab button does
  bindSidePanelToggle(() => setOpen(!open));

  // ---- follow
  let follow: FollowValue = initialFollow;
  const paint = (value: FollowValue) => {
    buttons.forEach((info, btn) => {
      btn.classList.toggle('active', info.key === String(value));
    });
    // mixed colors change every frame, so mixed and "all" keep a neutral DOM
    // accent instead of repainting the panel continuously
    canvas.style.setProperty('--network-color', networkColor(value));
    groupPanel.apply(value);
  };
  const applyFollow = (
    value: FollowValue,
    origin: 'button' | 'key' | 'program',
  ) => {
    follow = value;
    paint(value);
    onFollow?.(value, origin);
  };
  // the initial target paints without side effects: the game's own follow
  // state already starts at the same value
  paint(initialFollow);

  bindFollowKeys({
    digit: (layer) => applyFollow(layer, 'key'),
    all: () => applyFollow(0, 'key'),
    mixed: () => applyFollow('mixed', 'key'),
  });

  return {
    el,
    isOpen: () => open,
    panelWidth: () =>
      Math.round(Math.min(window.innerWidth * PANEL_RATIO, PANEL_MAX_WIDTH)),
    setFollow: (value: FollowValue) => applyFollow(value, 'program'),
    follow: () => follow,
    setRunning(running, anyAlive) {
      buttons.forEach((info, btn) => {
        const isRunning = info.key === '0' ? anyAlive : running.has(info.key);
        if (isRunning === info.running) return;
        info.running = isRunning;
        btn.classList.toggle('running', isRunning);
        btn.classList.toggle('dead', !isRunning);
      });
    },
    network: () => {
      resizeCanvas(canvas, ctx, netWrap.clientWidth, netWrap.clientHeight);
      return { canvas, ctx };
    },
    groupPanel,
  };
}
