import { MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import { downloadModelArchive, pickModelArchive } from '../../ai/modelTransfer';
import type { NeuralNetwork } from '../../ai/Network';
import { loadBaseModels, makeSubmitChecker } from '../../ai/serverSync';
import { fileUtilities } from '../../ai/utils';
import { Visualizer } from '../../ai/v2/Visualizer';
import { layerColor } from '../../utilities/ai/colors';
import { contrastText } from '../../utilities/colors';
import {
  createCanvas,
  createUpdateLimiter,
  resizeCanvas,
} from '../../utilities/dom';
import { GameLoop } from '../../utilities/three/GameLoop';
import { CAMERA_LERP, climbCameraCenterY } from './camera';
import { ClimbRace } from './classes/ClimbRace';
import { config, isDemo } from './classes/Config';
import type { Player } from './classes/Player';
import {
  brainId,
  clearScoreRecords,
  type defaultState,
  drawScores,
} from './utilities';

const neuralVisualizer = new Visualizer(config);

const io = fileUtilities('climb', makeSubmitChecker('climb'));
if (config.CLEAR_STORAGE) io.discardModels();
io.compactSaves();

/** the panel takes that share of the screen while open, capped in width */
const PANEL_RATIO = 0.75;
const PANEL_MAX_WIDTH = 800;
/** world height visible on screen at the reference scale */
const VIEW_HEIGHT = 420;
/** one captured jump sample per pixel column of the jump timeline */
const JUMP_TIMELINE_WIDTH = 110;

export default async (state: typeof defaultState) => {
  // the stage overlays the canvas; the canvas and every HUD element live in
  // it, so they track the canvas edges instead of the viewport
  const stage = document.querySelector<HTMLDivElement>('.game-stage')!;
  const gameCanvas = createCanvas();
  stage.appendChild(gameCanvas);

  const networkCanvas = createCanvas();
  networkCanvas.className = 'neural-canvas';

  const gameCtx = gameCanvas.getContext('2d');
  const networkCtx = networkCanvas.getContext('2d');

  const panel = document.createElement('aside');
  panel.className = `side-panel`;
  panel.style.width = `${PANEL_RATIO * 100}%`;
  panel.style.maxWidth = `${PANEL_MAX_WIDTH}px`;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'side-panel-toggle';
  toggleBtn.textContent = '❮';
  toggleBtn.setAttribute('aria-label', 'Toggle models panel');
  let panelOpen = false;
  toggleBtn.onclick = () => {
    panelOpen = panel.classList.toggle('open');
    toggleBtn.textContent = panelOpen ? '❯' : '❮';
  };

  const importBtn = document.createElement('button');
  importBtn.className = 'model-btn';
  importBtn.textContent = 'Import archive';
  const baseBtn = document.createElement('button');
  baseBtn.className = 'model-btn';
  baseBtn.textContent = 'Load base models';
  baseBtn.title =
    'Load the base climb models: server first, bundled preset fallback. Overwrites the local saves of the groups it brings.';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'model-btn';
  saveBtn.textContent = 'Save models';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'model-btn';
  clearBtn.textContent = 'Clear training';
  const clearScoresBtn = document.createElement('button');
  clearScoresBtn.className = 'model-btn';
  clearScoresBtn.textContent = 'Clear records';

  importBtn.onclick = async () => {
    try {
      const archive = await pickModelArchive();
      if (archive.game && archive.game !== 'climb') {
        alert(`This archive is for \`${archive.game}\`, not "climb"`);
        return;
      }
      const written = io.importModels(archive.models);
      if (!written.length) {
        alert('No compatible model in this archive');
        return;
      }
      console.info(`Loaded models: ${written.join(', ')}`);
      race.initialize();
    } catch (err) {
      if (err && err.message !== 'No file selected') {
        alert(err?.message || 'Unable to load models');
      }
    }
  };
  baseBtn.onclick = async () => {
    try {
      const { source, written } = await loadBaseModels(
        'climb',
        io,
        new URL('./presets/climb_models_default.json', import.meta.url),
      );
      if (!written.length)
        throw new Error('No compatible model in the base archive');
      console.info(`Loaded base models (${source}): ${written.join(', ')}`);
      race.initialize();
    } catch (err) {
      alert(err?.message || 'Unable to load base models');
    }
  };
  saveBtn.onclick = () => downloadModelArchive('climb');
  clearBtn.onclick = () => {
    if (
      !confirm(
        'Clear the current training set? This removes the saved models of this game.',
      )
    )
      return;
    io.discardGameModels();
    console.info('Cleared the training set of this game');
    race.initialize();
  };
  clearScoresBtn.onclick = () => {
    if (!confirm('Clear all saved climb records? Neural networks are kept.'))
      return;
    clearScoreRecords();
    console.info('Cleared all climb records');
    race.initialize();
  };

  const followKeys = document.createElement('div');
  followKeys.className = 'follow-keys';
  const followLabel = document.createElement('span');
  followLabel.textContent = 'Follow';
  /** 0 follows the best score overall, 1-9 the best climber of that brain
   *  layer, 'mixed' the mix */
  let follow: number | 'mixed' = 0;
  /** driving the human player takes the camera; it gives it back on a crash
   *  or a manual follow change */
  let humanFollow = false;
  let camSet = false;

  const setFollow = (value: number | 'mixed') => {
    follow = value;
    humanFollow = false;
    followKeys.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.follow === String(value));
    });
    const color =
      typeof value === 'number' && value > 0
        ? layerColor(value, config.MAX_NETWORK_LAYERS)
        : '#c4c4c4';
    networkCanvas.style.setProperty('--network-color', color);
  };

  const resetBrainSaves = (value: number | 'mixed') => {
    if (value === 'mixed') {
      if (!confirm(`Reset the saved weights of ${brainId(0, undefined)}?`))
        return;
      io.discardModel(MIXED_LEVELS, 'mixed');
    } else {
      if (!confirm(`Reset the saved weights of ${brainId(value, undefined)}?`))
        return;
      io.discardModel(value);
    }
    race.resetBrainGroup(value);
  };

  const followBtns = new Map<
    HTMLButtonElement,
    { key: string; running?: boolean }
  >();
  const makeFollowBtn = (key: string, label: string, title: string) => {
    const btn = document.createElement('button');
    btn.className = 'follow-btn';
    const color =
      key === '0'
        ? '#c4c4c4'
        : key === 'mixed'
          ? config.MIXED_COLOR
          : layerColor(Number(key), config.MAX_NETWORK_LAYERS);
    // the button wears its group's color, like the board rows
    btn.style.setProperty('--btn-color', color);
    btn.style.setProperty('--btn-text', contrastText(color));
    btn.textContent = label;
    btn.title = `${title} (hold to reset its saves)`;
    btn.dataset.follow = key;
    let holdTimer = 0;
    let held = false;
    const start = () => {
      held = true;
      holdTimer = window.setTimeout(
        () => resetBrainSaves(Number(key) || (key === 'mixed' ? 'mixed' : 0)),
        600,
      );
    };
    const stop = (fire: boolean) => {
      if (!held) return;
      held = false;
      window.clearTimeout(holdTimer);
      if (fire) setFollow(key === 'mixed' ? 'mixed' : Number(key) || 0);
    };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', () => stop(true));
    btn.addEventListener('pointerleave', () => stop(false));
    followBtns.set(btn, { key });
    return btn;
  };
  followKeys.append(followLabel);
  for (let layer = 1; layer <= config.MAX_NETWORK_LAYERS; layer++)
    followKeys.append(
      makeFollowBtn(String(layer), `brain ${layer}`, `follow brain ${layer}`),
    );
  followKeys.append(makeFollowBtn('0', 'all', 'follow the best climber'));
  followKeys.append(makeFollowBtn('mixed', 'mixed', 'follow the mixed brain'));

  // Match the circuit/cave panel layout: the wrapper owns the available
  // height and the canvas is absolute, so resizing the canvas cannot enlarge
  // its own parent on the next frame.
  const netWrap = document.createElement('div');
  netWrap.style.flex = '1';
  netWrap.style.position = 'relative';
  netWrap.style.minHeight = '0';
  networkCanvas.style.position = 'absolute';
  networkCanvas.style.left = '0';
  networkCanvas.style.top = '0';
  netWrap.append(networkCanvas);

  const about = document.createElement('div');
  about.className = 'side-panel-about';
  about.textContent =
    'Climb: a seeded Icy Tower-style tower. Every brain line climbs the same ' +
    'tower at once; a line that banks floors saves its brain, and when enough ' +
    'lines hold the seed target the tower gets harder. Arrows / WASD move, ' +
    'Space or the gamepad primary button jumps. 0-9 and M follow a line, R ' +
    'jumps to a random seed, < and > step the seed.';

  const footer = document.createElement('div');
  footer.className = 'side-panel-footer';
  footer.textContent = 'Long press for reset (right-click also works)';

  const actions = document.createElement('div');
  actions.className = 'model-actions';
  actions.append(baseBtn, saveBtn, importBtn, clearBtn, clearScoresBtn);

  const panelContent = document.createElement('div');
  panelContent.className = 'side-panel-content';
  panelContent.append(actions, followKeys, netWrap, about, footer);

  panel.append(toggleBtn, panelContent);
  // the demo profile hides the whole panel instead of starting it collapsed
  if (!isDemo) document.body.appendChild(panel);

  // The output boxes mimic the followed climber, display only.
  const steerOverlay = document.createElement('div');
  steerOverlay.className = 'steer-overlay hidden';
  const controlIndicators = document.createElement('div');
  controlIndicators.className = 'control-indicators';
  const budgetGauge = document.createElement('div');
  budgetGauge.className = 'gate-gauge';
  budgetGauge.title =
    'height frames remaining before the height budget kills the followed climber';
  budgetGauge.setAttribute('role', 'progressbar');
  budgetGauge.setAttribute('aria-label', 'Height budget remaining');
  budgetGauge.setAttribute('aria-valuemin', '0');
  budgetGauge.setAttribute(
    'aria-valuemax',
    String(config.HEIGHT_BUDGET_FRAMES),
  );
  const budgetGaugeFill = document.createElement('div');
  budgetGaugeFill.className = 'gate-gauge-fill';
  budgetGauge.append(budgetGaugeFill);
  const controlCanvas = document.createElement('canvas');
  controlCanvas.className = 'control-axis';
  controlCanvas.width = 110;
  controlCanvas.height = 34;
  const controlCtx = controlCanvas.getContext('2d');
  const jumpCanvas = document.createElement('canvas');
  jumpCanvas.className = 'jump-timeline-canvas';
  jumpCanvas.width = JUMP_TIMELINE_WIDTH;
  jumpCanvas.height = 34;
  const jumpCtx = jumpCanvas.getContext('2d');
  const jumpSamples: number[] = [];
  controlIndicators.append(controlCanvas, jumpCanvas);

  const readout = document.createElement('div');
  readout.className = 'readout';
  const floorEl = document.createElement('div');
  floorEl.className = 'laps';
  floorEl.title = 'floors of personal-best height on this seed';
  floorEl.textContent = 'floor 0';
  const comboEl = document.createElement('div');
  comboEl.className = 'combo-indicator';
  comboEl.title = 'landing and wall-bounce combo';
  comboEl.hidden = true;
  const seedCountdown = document.createElement('div');
  seedCountdown.className = 'finish-countdown';
  seedCountdown.style.color = 'red';
  seedCountdown.hidden = true;
  readout.append(seedCountdown, comboEl, floorEl);
  // The network stays in the sidebar, but its stats travel with the in-game
  // cockpit as inline text after the readout, visible when the panel is
  // closed.
  const brainStats = document.createElement('div');
  brainStats.className = 'brain-stats';
  brainStats.title = 'followed brain stats';
  steerOverlay.append(controlIndicators, budgetGauge, readout, brainStats);
  stage.appendChild(steerOverlay);

  // The map selector stays in the top-left HUD so it remains available while
  // the model panel is closed.
  const seedControls = document.createElement('div');
  seedControls.className = 'seed-controls';
  // standalone: positioned at the stage's top-left corner instead of being
  // embedded in a board header
  seedControls.classList.add('standalone');
  const seedLabel = document.createElement('span');
  seedLabel.className = 'seed-label';
  const previousSeed = document.createElement('button');
  previousSeed.type = 'button';
  previousSeed.textContent = '<';
  previousSeed.title = 'Previous tower';
  const nextSeed = document.createElement('button');
  nextSeed.type = 'button';
  nextSeed.textContent = '>';
  nextSeed.title = 'Next tower';
  const randomSeed = document.createElement('button');
  randomSeed.type = 'button';
  randomSeed.textContent = 'R';
  randomSeed.title = 'Random tower';
  seedControls.append(previousSeed, seedLabel, nextSeed, randomSeed);
  stage.appendChild(seedControls);

  const climbProgress = document.createElement('aside');
  climbProgress.className = 'climb-progress';
  const platformLabel = document.createElement('div');
  platformLabel.className = 'climb-progress-label';
  platformLabel.textContent = 'platform';
  const platformValue = document.createElement('div');
  platformValue.className = 'climb-platform-value';
  platformValue.textContent = '0';
  const groupProgress = document.createElement('div');
  groupProgress.className = 'climb-group-progress';
  climbProgress.append(platformLabel, platformValue, groupProgress);
  stage.appendChild(climbProgress);

  const loop = new GameLoop();
  const shouldUpdateDom = createUpdateLimiter(20);
  let lastCountdownTenths = -1;
  let lastStatsHtml = '';

  function writeSeed(seed: number) {
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#climb=${seed}`,
    );
  }

  const seed = (() => {
    const match = location.hash.match(/climb=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  })();
  writeSeed(seed);

  const race = new ClimbRace(state, io, seed, {
    onReset: () => {
      camSet = false;
      camTop = 0;
    },
    onHumanCrash: () => {
      humanFollow = false;
    },
    onSeedChanged: (nextSeed) => {
      writeSeed(nextSeed);
      camSet = false;
      camTop = 0;
      seedCountdown.hidden = true;
    },
  });

  previousSeed.onclick = () => race.applyUserSeed(Math.max(0, race.seed - 1));
  nextSeed.onclick = () => race.applyUserSeed(race.seed + 1);
  randomSeed.onclick = () =>
    race.applyUserSeed(Math.floor(Math.random() * 1000));

  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t.isContentEditable)
    )
      return;
    if (e.code === 'Digit0') setFollow(0);
    else if (
      e.code.startsWith('Digit') &&
      Number(e.code.slice(5)) <= config.MAX_NETWORK_LAYERS
    )
      setFollow(Number(e.code.slice(5)));
    else if (e.code === 'KeyM') setFollow('mixed');
    else if (e.code === 'KeyR')
      race.applyUserSeed(Math.floor(Math.random() * 1000));
  };
  document.addEventListener('keydown', onKey);

  /** world-space y at the bottom of the view; the camera only ever climbs */
  let camTop = 0;

  // Base models: server first, bundled preset as fallback. onlyMissing so a
  // visitor's own training is never overwritten; imported brains are picked
  // up by the re-initialize.
  void (async () => {
    try {
      const { written } = await loadBaseModels(
        'climb',
        io,
        new URL('./presets/climb_models_default.json', import.meta.url),
        true,
      );
      if (written.length) {
        console.info(`Loaded base models: ${written.join(', ')}`);
        race.initialize();
      }
    } catch (err) {
      console.warn('Unable to load base climb models', err);
    }
  })();
  race.initialize();
  setFollow(0);

  const followedPlayer = (): Player | undefined => {
    const h = state.human;
    if (humanFollow && h && !h.damaged) return h;
    if (follow === 0) return state.sortedPlayers[0];
    const group = race.groups.find((g) =>
      follow === 'mixed' ? g.isMixed : g.layer === follow,
    );
    if (!group) return undefined;
    let best: Player | undefined;
    let bestScore = -1;
    for (const p of group.pool) {
      if (p.damaged) continue;
      const score = p.brain?.score ?? 0;
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    return best;
  };

  loop.play(
    (_es, _dt) => {
      const now = performance.now();
      if (state.playing) {
        race.update(now);
        // the first drive input takes the camera to the human player
        const h = state.human;
        if (h?.controls.playerActive && !h.damaged) humanFollow = true;
      }

      const domUpdateDue = shouldUpdateDom(now);
      if (domUpdateDue) {
        race.refreshLeaderboard();
        updateFollowButtons();
        seedLabel.textContent = `seed ${race.seed}`;
        if (race.seedChangeAt) {
          const remaining = Math.max(0, race.seedChangeAt - now);
          const tenths = Math.floor(remaining / 100);
          seedCountdown.hidden = false;
          if (tenths !== lastCountdownTenths) {
            lastCountdownTenths = tenths;
            seedCountdown.textContent = `next tower in ${(tenths / 10).toFixed(1)}s`;
          }
        } else {
          seedCountdown.hidden = true;
        }
      }

      // the game canvas keeps whatever width the open panel leaves
      const panelWidth = Math.round(
        Math.min(window.innerWidth * PANEL_RATIO, PANEL_MAX_WIDTH),
      );
      const gameWidth = panelOpen
        ? window.innerWidth - panelWidth
        : window.innerWidth;
      resizeCanvas(gameCanvas, gameCtx, gameWidth, window.innerHeight);
      if (panelOpen)
        resizeCanvas(
          networkCanvas,
          networkCtx,
          netWrap.clientWidth,
          netWrap.clientHeight,
        );

      // camera: the whole tower width always fits and centers the followed
      // player's body. It targets location only; velocity never predicts the
      // direction of travel.
      const scale = Math.min(
        gameCanvas.height / VIEW_HEIGHT,
        gameCanvas.width / (config.TOWER_WIDTH + 40),
      );
      const viewH = gameCanvas.height / scale;
      const viewW = gameCanvas.width / scale;
      const followed = followedPlayer();
      if (state.playing) {
        // camTop is the bottom edge of the viewport, so convert the desired
        // centre into its lower edge before applying the world-floor clamp.
        const cameraCenter = followed
          ? climbCameraCenterY(followed, viewH)
          : climbCameraCenterY({ y: state.highestY }, viewH);
        const target = Math.max(0, cameraCenter - viewH * 0.5);
        if (!camSet) {
          camTop = 0;
          camSet = true;
        }
        camTop += (target - camTop) * CAMERA_LERP;
      }
      state.camY = camTop;

      const offsetX = (viewW / 2 - config.TOWER_WIDTH / 2) * scale;
      const offsetY = (camTop + viewH) * scale;

      // sky
      const sky = gameCtx.createLinearGradient(0, 0, 0, gameCanvas.height);
      sky.addColorStop(0, config.SKY_TOP);
      sky.addColorStop(1, config.SKY_BOTTOM);
      gameCtx.fillStyle = sky;
      gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

      // parallax clouds, deterministic per screen position
      drawClouds(
        gameCtx,
        gameCanvas.width,
        gameCanvas.height,
        camTop,
        scale,
        now,
      );

      gameCtx.save();
      gameCtx.setTransform(scale, 0, 0, -scale, offsetX, offsetY);
      const viewMinY = camTop - 40;
      const viewMaxY = camTop + viewH + 40;

      state.tower?.draw(gameCtx, viewMinY, viewMaxY);

      // climbers, the followed one and the human last
      const margin = 30;
      for (const p of state.players) {
        if (p === state.human || p === followed) continue;
        if (
          p.y < viewMinY ||
          p.y > viewMaxY ||
          p.x < -margin ||
          p.x > config.TOWER_WIDTH + margin
        )
          continue;
        p.draw(gameCtx, now, false);
      }
      if (followed) followed.draw(gameCtx, now, true);
      if (state.human && state.human !== followed)
        state.human.draw(gameCtx, now, false);
      gameCtx.restore();

      drawScores(state, gameCtx);

      // the cockpit mimics the followed climber, hidden while it is dead
      if (domUpdateDue) {
        steerOverlay.style.setProperty(
          '--hud-color',
          followed?.color || '#c4c4c4',
        );
        steerOverlay.classList.toggle('hidden', !followed || followed.damaged);
        brainStats.classList.toggle(
          'hidden',
          !neuralVisualizer.renderStats || !followed?.brain,
        );
        platformValue.textContent = String(followed?.bestPlatform ?? 0);
        // group rows are built once and only their text and color refresh each
        // tick, so the 20 Hz board never realigns its DOM nodes
        let groupRows = groupProgress.children;
        if (groupRows.length !== race.groups.length) {
          groupProgress.replaceChildren(
            ...race.groups.map(() => {
              const row = document.createElement('div');
              row.className = 'climb-group-row';
              row.append(document.createElement('span'));
              return row;
            }),
          );
          groupRows = groupProgress.children;
        }
        // ranked by live score, not group number; a stable tie-break keeps
        // equal scores from swapping rows between ticks. The row color
        // identifies the group, so only the score is written
        const ranked = [...race.groups].sort(
          (a, b) =>
            b.scores.seed - a.scores.seed ||
            Number(a.isMixed) - Number(b.isMixed) ||
            a.layer - b.layer,
        );
        for (let i = 0; i < ranked.length; i++) {
          const group = ranked[i];
          const row = groupRows[i] as HTMLElement;
          row.style.color = group.isMixed
            ? config.MIXED_COLOR
            : layerColor(group.layer, config.MAX_NETWORK_LAYERS);
          row.children[0].textContent = String(
            Math.max(0, Math.round(group.scores.seed)),
          );
        }
      }
      if (followed) {
        const c = followed.controls;
        if (controlCtx)
          drawControlAxis(controlCtx, c.left, c.right, followed.color);
        comboEl.hidden = followed.comboValue < 2;
        comboEl.textContent = `x${followed.comboValue}`;
        jumpSamples.push(followed.controls.jumpHeld ? 1 : 0);
        if (jumpSamples.length > JUMP_TIMELINE_WIDTH) jumpSamples.shift();
        if (jumpCtx) drawJumpTimeline(jumpCtx, jumpSamples, followed.color);
        floorEl.textContent = `floor ${Math.round(followed.brain?.score ?? 0)}`;
        if (followed.brain && neuralVisualizer.renderStats)
          updateBrainStats(followed.brain, followed);
        // The gauge drains while the followed climber fails to set a new
        // height record; at zero the stall death hits humans and AIs alike.
        const budget = Math.max(
          0,
          config.HEIGHT_BUDGET_FRAMES - followed.stallFrames,
        );
        const budgetFraction = budget / config.HEIGHT_BUDGET_FRAMES;
        budgetGaugeFill.style.height = `${budgetFraction * 100}%`;
        budgetGauge.setAttribute('aria-valuenow', String(budget));
      }

      const followedBrain = followed?.brain;
      if (panelOpen && followedBrain)
        neuralVisualizer.renderNetwork(networkCtx, followedBrain);
    },
    {
      maxFps: config.HUMAN_FPS_CAP,
      // Cap the simulation whenever the human has taken control, even if the
      // camera has since been switched to an AI player.
      shouldCap: () =>
        config.HUMAN_FPS_CAP_ENABLED &&
        !!state.human?.controls.playerActive &&
        !state.human.damaged,
    },
  );

  /** Rebuild the inline stats block of the followed brain; the DOM is only
   *  touched when the rendered text changes, so a steady frame is cheap. */
  function updateBrainStats(network: NeuralNetwork, player: Player) {
    const groupKey =
      network instanceof MixedNetwork ? 'mixed' : String(player.brainLayers);
    const group = race.groups.find((candidate) => candidate.key === groupKey);
    const previousBest = group?.scores.history[String(race.seed)];
    const best =
      typeof previousBest === 'number' && previousBest > 0
        ? Math.round(previousBest)
        : '—';
    const mutation =
      network.mutationIndex === 0
        ? 'Original model'
        : `Mut ${(network.mutationFactor * 100).toFixed(4)}%`;
    const lines = [
      `Net ${network.id}`,
      mutation,
      `Score ${Math.round(network.score)}`,
      `Best ${best}`,
    ];
    const html = lines.map((line) => `<span>${line}</span>`).join('');
    if (html !== lastStatsHtml) {
      lastStatsHtml = html;
      brainStats.innerHTML = html;
    }
  }

  /** Fill the follow buttons with their running/dead state once per HUD tick. */
  function updateFollowButtons() {
    const running = new Set<string>();
    for (const p of state.players) {
      if (p.damaged || !p.useAI) continue;
      running.add(
        p.brain instanceof MixedNetwork ? 'mixed' : String(p.brainLayers),
      );
    }
    followBtns.forEach((info, btn) => {
      const isRunning =
        info.key === '0' ? state.living > 0 : running.has(info.key);
      if (isRunning === info.running) return;
      info.running = isRunning;
      btn.classList.toggle('running', isRunning);
      btn.classList.toggle('dead', !isRunning);
    });
  }
};

/** two parallax layers of soft ellipses, positioned from a stable hash so the
 *  sky never flickers between frames. Clouds also drift sideways at a
 *  per-layer speed and wrap around once fully offscreen */
function drawClouds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camTop: number,
  scale: number,
  now: number,
) {
  ctx.fillStyle = config.CLOUD_COLOR;
  // half the horizontal wrap slack, wider than a whole cloud so it is fully
  // offscreen before it comes back around
  const margin = 100;
  for (let layer = 0; layer < 2; layer++) {
    const parallax = layer === 0 ? 0.2 : 0.4;
    const drift = camTop * parallax * scale;
    const count = layer === 0 ? 4 : 6;
    const wrapW = width + margin * 2;
    const driftX = (now * 0.001 * (layer === 0 ? 6 : 14)) % wrapW;
    for (let i = 0; i < count; i++) {
      const seedX = (i * 173 + layer * 97) % 1000;
      const seedY = (i * 331 + layer * 61) % 1000;
      const baseX = (seedX / 1000) * width + (layer === 0 ? 0 : width * 0.3);
      const x = ((baseX + driftX) % wrapW) - margin;
      const y =
        ((height - (seedY / 1000) * height * 1.5 + drift) % (height + 120)) -
        60;
      const r = (layer === 0 ? 26 : 16) + (seedX % 14);
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.8, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + r, y - r * 0.4, r * 1.1, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** a horizontal left/right axis: the bar fills from the center toward the
 *  pressed side */
function drawControlAxis(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  color: string,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(25, 52, 94, 0.55)';
  ctx.fillRect(0, 0, w, h);
  // center line
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w / 2, 4);
  ctx.lineTo(w / 2, h - 4);
  ctx.stroke();
  // the drive bar
  const dir = right - left;
  const mag = Math.max(left, right);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = color;
  const bw = (w / 2 - 6) * mag;
  if (dir >= 0) ctx.fillRect(w / 2, 6, bw, h - 12);
  else ctx.fillRect(w / 2 - bw, 6, bw, h - 12);
  ctx.globalAlpha = 0.7;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.globalAlpha = 1;
}

/**
 * A left-scrolling strip of jump input: one 1px column per rendered frame,
 * newest at the right edge. A raised bar means the jump channel was held that
 * frame, so a single-frame tap reads as a needle and a held jump as a plateau.
 */
function drawJumpTimeline(
  ctx: CanvasRenderingContext2D,
  samples: number[],
  color: string,
  width = JUMP_TIMELINE_WIDTH,
  height = 34,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(25, 52, 94, 0.55)';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 5.5);
  ctx.lineTo(width, height - 5.5);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  const offset = width - samples.length;
  for (let i = 0; i < samples.length; i++) {
    if (!samples[i]) continue;
    ctx.fillRect(offset + i, 3, 1, height - 9);
  }

  ctx.globalAlpha = 0.7;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.globalAlpha = 1;
}
