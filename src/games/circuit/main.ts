import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import { downloadModelArchive, pickModelArchive } from '../../ai/modelTransfer';
import type { NeuralNetwork } from '../../ai/Network';
import { fileUtilities } from '../../ai/utils';
import { Visualizer } from '../../ai/v2/Visualizer';
import { layerColor } from '../../utilities/ai/colors';
import { contrastText } from '../../utilities/colors';
import {
  createCanvas,
  createUpdateLimiter,
  resizeCanvas,
} from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { GameLoop } from '../../utilities/three/GameLoop';
import type { Car } from './classes/Car';
import { CircuitRace } from './classes/CircuitRace';
import { config } from './classes/Config';
import { drawControlAxes, drawVelocityVector } from './ui/driveIndicators';
import { TimingBoard } from './ui/TimingBoard';
import { TrackScoreBoard } from './ui/TrackScoreBoard';
import {
  brainId,
  clearScoreRecords,
  type defaultState,
  drawScores,
} from './utilities';

const neuralVisualizer = new Visualizer(config);

const io = fileUtilities('circuit');
if (config.CLEAR_STORAGE) io.discardModels();

async function loadDefaultModels(onlyMissing = false): Promise<string[]> {
  const response = await fetch(
    new URL('./presets/circuit_models_default.json', import.meta.url),
  );
  if (!response.ok)
    throw new Error(`Default models not found (${response.status})`);
  const archive = await response.json();
  if (archive.game !== 'circuit' || !archive.models) {
    throw new Error('Invalid circuit default models');
  }
  const models = onlyMissing
    ? Object.fromEntries(
        Object.entries(archive.models).filter(
          ([key]) => !localStorage.getItem(key),
        ),
      )
    : archive.models;
  return io.importModels(models);
}

/** the panel takes that share of the screen while open, capped in width,
 * the map keeps whatever is left */
const PANEL_RATIO = 0.75;
const PANEL_MAX_WIDTH = 800;
/** world-space distance ahead of the car in forced follow mode */
const CAMERA_AHEAD_DISTANCE = 200;

export default async (state: typeof defaultState) => {
  const carCanvas = createCanvas();
  carCanvas.style.position = 'fixed';
  carCanvas.style.left = '0';
  carCanvas.style.top = '0';

  const networkCanvas = createCanvas();
  networkCanvas.className = 'neural-canvas';

  const carCtx = carCanvas.getContext('2d');
  const networkCtx = networkCanvas.getContext('2d');

  const followPad = new GamePad(new Map());
  /** 0 follows the best score overall, 1-9 the best car of that brain layer */
  let follow: number | 'mixed' = 0;
  /** manual/player follow enables the rotating, ahead-of-car camera mode */
  let followForced = false;
  /** world x/y mapped to the screen center, lerps so target switches animate */
  let camX = 0;
  let camY = 0;
  let camAngle = 0;
  let camAngleSet = false;
  let camSet = false;
  let panelOpen = !window.location.href.includes('demo=true');
  /** the race owns simulation state; this function coordinates browser UI. */

  const panel = document.createElement('aside');
  panel.className = `${panelOpen ? 'open ' : ''}side-panel`;
  panel.style.width = `${PANEL_RATIO * 100}%`;
  panel.style.maxWidth = `${PANEL_MAX_WIDTH}px`;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'side-panel-toggle';
  toggleBtn.textContent = '❯';
  toggleBtn.setAttribute('aria-label', 'Toggle models panel');

  const loadBtn = document.createElement('button');
  loadBtn.className = 'model-btn';
  loadBtn.textContent = 'Load models';
  loadBtn.title = 'Load the bundled circuit models';
  const importBtn = document.createElement('button');
  importBtn.className = 'model-btn';
  importBtn.textContent = 'Import archive';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'model-btn';
  saveBtn.textContent = 'Save models';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'model-btn';
  clearBtn.textContent = 'Clear training';
  const clearScoresBtn = document.createElement('button');
  clearScoresBtn.className = 'model-btn';
  clearScoresBtn.textContent = 'Clear race records';
  loadBtn.onclick = async () => {
    try {
      loadBtn.disabled = true;
      const written = await loadDefaultModels();
      if (!written.length) throw new Error('No compatible default models');
      console.info(`Loaded default models: ${written.join(', ')}`);
      race.initialize();
    } catch (err) {
      alert(err?.message || 'Unable to load default models');
    } finally {
      loadBtn.disabled = false;
    }
  };
  importBtn.onclick = async () => {
    try {
      const archive = await pickModelArchive();
      if (archive.game && archive.game !== 'circuit') {
        alert(`This archive is for \`${archive.game}\`, not "circuit"`);
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
  saveBtn.onclick = () => downloadModelArchive('circuit');
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
    if (
      !confirm(
        'Clear all saved circuit race records? Neural networks are kept.',
      )
    )
      return;
    clearScoreRecords();
    console.info('Cleared all circuit race records');
    race.initialize();
  };

  const followKeys = document.createElement('div');
  followKeys.className = 'follow-keys';
  const followLabel = document.createElement('span');
  followLabel.textContent = 'Follow';

  // driving the human car takes the camera; it gives it back on a crash or
  // a manual follow change
  let humanFollow = false;
  /** the AI car the camera currently tracks and when it took it; a new
   *  leader only takes over past FOLLOW_SWITCH_SCORE_GAP or once
   *  FOLLOW_SWITCH_MIN_MS have elapsed, so a close duel stops flickering */
  let followTarget: Car | undefined;
  let followTargetSince = 0;
  const FOLLOW_SWITCH_SCORE_GAP = 5;
  const FOLLOW_SWITCH_MIN_MS = 5_000;
  /** keep the just-finished focus long enough for its timing row to be read */
  const FINISH_FOCUS_MS = 3_000;
  let humanDriving = false;
  let lastCountdownTenths = -1;

  const setFollow = (value: number | 'mixed', forced = true) => {
    follow = value;
    followForced = forced;
    humanFollow = false;
    // a manual change picks the category leader right away
    followTarget = undefined;
    followKeys.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.follow === String(value));
    });
    // Mixed colors change every frame, so mixed and "all" keep a neutral DOM
    // outline instead of repainting the panel continuously.
    const color =
      typeof value === 'number' && value > 0
        ? layerColor(value, config.MAX_NETWORK_LAYERS)
        : '#c4c4c4';
    networkCanvas.style.setProperty('--network-color', color);
  };

  /** car buttons: key 0 any car, 1-9 that brain layer, 'mixed' the mix,
   *  running stays undefined until the first pass so the classes always paint */
  const followBtns = new Map<
    HTMLButtonElement,
    { key: string; running?: boolean }
  >();

  const resetBrainSaves = (value: number | 'mixed') => {
    if (value === 'mixed') {
      if (!confirm(`Reset the saved weights of ${brainId(0, undefined)}?`))
        return;
      io.discardModel(MIXED_LEVELS, MIXED_KIND);
    } else if (value === 0) {
      if (!confirm('Reset all the saved circuit weights?')) return;
      io.discardGameModels();
    } else {
      if (!confirm(`Reset the saved weights of ${brainId(value)}?`)) return;
      io.discardModel(value);
    }
    console.info(
      `Reset saved weights of ${value === 0 ? 'all brains' : value}`,
    );
    if (value === 0) race.initialize();
    else {
      race.resetBrainGroup(value);
      camSet = false;
      followTarget = undefined;
      lastFollowed = undefined;
    }
  };

  /** long press (or right click) a car button to reset its saved weights */
  const armReset = (
    btn: HTMLButtonElement,
    value: number | 'mixed',
    onClick: () => void,
  ) => {
    let timer = 0;
    let swallowClick = false;

    // registered before the follow click, so the click released after a
    // long press never also switches the camera
    btn.addEventListener('click', (e) => {
      if (swallowClick) {
        swallowClick = false;
        e.stopImmediatePropagation();
        return;
      }
      onClick();
    });

    const cancelHold = () => {
      if (timer) window.clearTimeout(timer);
      timer = 0;
    };
    btn.addEventListener('pointerdown', () => {
      timer = window.setTimeout(() => {
        timer = 0;
        swallowClick = true;
        resetBrainSaves(value);
      }, 650);
    });
    btn.addEventListener('pointerup', cancelHold);
    btn.addEventListener('pointerleave', cancelHold);
    btn.addEventListener('pointercancel', cancelHold);
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      cancelHold();
      if (swallowClick) swallowClick = false;
      else resetBrainSaves(value);
    });
  };

  followKeys.append(followLabel);
  (
    [
      [brainId(1), 1],
      [brainId(2), 2],
      [brainId(3), 3],
      [brainId(4), 4],
      [brainId(5), 5],
      [brainId(6), 6],
      [brainId(7), 7],
      [brainId(8), 8],
      [brainId(9), 9],
      ['all', 0],
      [brainId(0, undefined), 'mixed'],
    ] as [string, number | 'mixed'][]
  ).forEach(([label, value]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.follow = String(value);
    btn.title = 'Click to follow, long press or right-click to reset';
    // Numbered brains get a stable group color. Mixed and "all" stay light
    // gray because their effective color can change every frame.
    const color =
      typeof value === 'number' && value > 0
        ? layerColor(value, config.MAX_NETWORK_LAYERS)
        : '#c4c4c4';
    btn.style.setProperty('--btn-color', color);
    // black or white, whichever keeps the higher contrast on the car color
    btn.style.setProperty('--btn-text', contrastText(color));
    followKeys.append(btn);
    followBtns.set(btn, { key: String(value) });
    armReset(btn, value, () => setFollow(value));
  });
  setFollow(0, false);

  // the brain preview lives in the panel, it grows into whatever is left
  const netWrap = document.createElement('div');
  netWrap.style.flex = '1';
  netWrap.style.position = 'relative';
  netWrap.style.minHeight = '0';
  networkCanvas.style.position = 'absolute';
  networkCanvas.style.left = '0';
  networkCanvas.style.top = '0';
  netWrap.append(networkCanvas);

  const legend = document.createElement('div');
  legend.className = 'side-panel-legend';
  [
    'Score board',
    '💀 crashed, fades out over 3s from 50% opacity',
    '🏆 crashed with a higher score',
    '💜 car is racing',
    '💚 car is leading its group on this track',
    '👻 track record, frozen when its holder died',
    '🕹 human car, driven with arrows/WASD or a DualShock (left stick + L2/R2)',
    '🧭 Z',
    '🏁 next checkpoint glows',
    '🚧 gray obstacle (circle or wall)',
  ].forEach((line, i) => {
    const el = document.createElement('span');
    el.textContent = line;
    if (i === 0) el.className = 'legend-title';
    legend.append(el);
  });

  const about = document.createElement('div');
  about.className = 'side-panel-about';
  about.textContent = `It's a competition between ${config.MAX_NETWORK_LAYERS} different brain designs, plus a brain trained to hot-swap the proper one given the road situation of each frame (the mixed brain). They can all be visualized, and you can play against them to compete, or follow / tweak a specific architecture. Each time an instance of a neural network completes ${config.LAPS_PER_SEED} laps, the map is regenerated to a random configuration; each seed keeps its former score as a HUD reference, but every generated track starts a fresh record so mutated brains have a reachable goal, and groups that already finished it continue with mutation runs only. Finishing a track pays a large one-time bonus, so brains are selected for completing the map, not for being fast on one known track; the last car of every pool is a fresh random explorer and a scout re-runs the group's oldest saved line, so the population can never fully converge on one overfit brain.`;

  const footer = document.createElement('div');
  footer.className = 'side-panel-footer';
  footer.textContent = 'Long press for reset (right-click also works)';

  const actions = document.createElement('div');
  actions.className = 'model-actions';
  actions.append(loadBtn, saveBtn, importBtn, clearBtn, clearScoresBtn);

  const info = document.createElement('div');
  info.className = 'side-panel-info';
  info.append(about, legend);

  const panelContent = document.createElement('div');
  panelContent.className = 'side-panel-content';
  panelContent.append(actions, followKeys, netWrap, info, footer);

  panel.append(toggleBtn, panelContent);
  document.body.appendChild(panel);

  // The output box and velocity vector mimic the followed car, display only.
  const steerOverlay = document.createElement('div');
  steerOverlay.className = 'steer-overlay hidden';
  const controlIndicators = document.createElement('div');
  controlIndicators.className = 'control-indicators';
  const controlCanvas = document.createElement('canvas');
  controlCanvas.className = 'control-axis';
  controlCanvas.width = 110;
  controlCanvas.height = 110;
  const controlCtx = controlCanvas.getContext('2d');
  const velocityCanvas = document.createElement('canvas');
  velocityCanvas.className = 'velocity-vector';
  velocityCanvas.width = 110;
  velocityCanvas.height = 34;
  const velocityCtx = velocityCanvas.getContext('2d');
  controlIndicators.append(controlCanvas, velocityCanvas);
  // the race, laps and speed readouts sit together, race on top, laps just
  // above the speed
  const readout = document.createElement('div');
  readout.className = 'readout';
  const lapsEl = document.createElement('div');
  lapsEl.className = 'laps';
  lapsEl.title = 'laps on this map';
  lapsEl.textContent = `lap 0/${config.LAPS_PER_SEED}`;
  const lapFramesEl = document.createElement('div');
  lapFramesEl.className = 'frame-count';
  lapFramesEl.title = 'simulation frames on the current lap';
  lapFramesEl.textContent = 'lap 0f';
  const totalFramesEl = document.createElement('div');
  totalFramesEl.className = 'frame-count';
  totalFramesEl.title = 'simulation frames on this map';
  totalFramesEl.textContent = 'total 0f';

  type TimingLine = {
    element: HTMLDivElement;
    label: HTMLSpanElement;
    value: HTMLSpanElement;
    delta: HTMLSpanElement;
  };
  const makeTimingLine = (label: string, title: string): TimingLine => {
    const element = document.createElement('div');
    element.className = 'timing-line';
    element.title = title;
    const labelEl = document.createElement('span');
    labelEl.className = 'timing-label';
    labelEl.textContent = label;
    const value = document.createElement('span');
    value.className = 'timing-value';
    value.textContent = '—';
    const delta = document.createElement('span');
    delta.className = 'timing-delta';
    element.append(labelEl, value, delta);
    return { element, label: labelEl, value, delta };
  };
  const checkpointTiming = makeTimingLine(
    'cp',
    'latest checkpoint split in simulation frames; delta is against the track best',
  );
  const lapTiming = makeTimingLine(
    'lap',
    'latest completed lap in simulation frames; delta is against the track best',
  );
  const finishTiming = makeTimingLine(
    'finish',
    'final race time in simulation frames; delta is against the track best',
  );
  const timingDeltas = document.createElement('div');
  timingDeltas.className = 'timing-deltas';
  timingDeltas.append(
    checkpointTiming.element,
    lapTiming.element,
    finishTiming.element,
  );
  const finishCountdown = document.createElement('div');
  finishCountdown.className = 'finish-countdown';
  finishCountdown.style.color = 'red';
  finishCountdown.hidden = true;
  const speedo = document.createElement('div');
  speedo.className = 'speedo';
  speedo.title = 'speed';
  const speedoValue = document.createElement('span');
  speedoValue.className = 'speedo-value';
  speedoValue.textContent = '0.0';
  const speedoUnit = document.createElement('span');
  speedoUnit.className = 'speedo-unit';
  speedoUnit.textContent = 'u/f';
  speedo.append(speedoValue, speedoUnit);
  readout.append(
    finishCountdown,
    lapsEl,
    lapFramesEl,
    totalFramesEl,
    timingDeltas,
    speedo,
  );
  // the gate countdown: frame budget left for the followed car to claim its
  // next gate
  const gateGauge = document.createElement('div');
  gateGauge.className = 'gate-gauge';
  gateGauge.title = 'checkpoint frames remaining for the followed car';
  gateGauge.setAttribute('role', 'progressbar');
  gateGauge.setAttribute('aria-label', 'Checkpoint frames remaining');
  gateGauge.setAttribute('aria-valuemin', '0');
  gateGauge.setAttribute(
    'aria-valuemax',
    String(config.CHECKPOINT_BUDGET_FRAMES),
  );
  const gateGaugeFill = document.createElement('div');
  gateGaugeFill.className = 'gate-gauge-fill';
  gateGauge.append(gateGaugeFill);
  // The network stays in the sidebar, but its stats travel with the in-game
  // cockpit as inline text after the gate gauge, visible when the panel is closed.
  const brainStats = document.createElement('div');
  brainStats.className = 'brain-stats';
  brainStats.title = 'followed brain stats';
  steerOverlay.append(controlIndicators, gateGauge, readout, brainStats);
  document.body.appendChild(steerOverlay);

  let lastFollowed: Car | undefined;
  // The loop's first tick is eager, so every state it reads must exist by then.
  let lastStatsHtml = '';
  const shouldUpdateDom = createUpdateLimiter(20);

  toggleBtn.onclick = () => {
    panelOpen = panel.classList.toggle('open');
    toggleBtn.textContent = panelOpen ? '❯' : '❮';
  };

  const loop = new GameLoop();

  /** The race owns simulation state; this function coordinates browser UI. */
  function writeSeed(seed: number) {
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#circuit=${seed}`,
    );
  }

  const seed = (() => {
    const match = location.hash.match(/circuit=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  })();
  writeSeed(seed);
  const race = new CircuitRace(state, io, seed, {
    onReset: () => {
      camSet = false;
      followTarget = undefined;
      lastFollowed = undefined;
    },
    onHumanCrash: () => {
      humanFollow = false;
      humanDriving = false;
    },
    onSeedChanged: (nextSeed) => {
      writeSeed(nextSeed);
      timingBoard.setSeed(nextSeed);
      finishCountdown.hidden = true;
      camSet = false;
    },
  });

  // The map selector stays in the top-left HUD so it remains available while
  // the model panel is closed. Buttons apply immediately and update the hash.
  const seedControls = document.createElement('div');
  seedControls.className = 'seed-controls';
  const previousSeed = document.createElement('button');
  previousSeed.type = 'button';
  previousSeed.textContent = '<';
  previousSeed.title = 'Previous map';
  previousSeed.onclick = () => race.applyUserSeed(Math.max(0, race.seed - 1));
  const nextSeed = document.createElement('button');
  nextSeed.type = 'button';
  nextSeed.textContent = '>';
  nextSeed.title = 'Next map';
  nextSeed.onclick = () => race.applyUserSeed(race.seed + 1);
  seedControls.append(previousSeed, nextSeed);

  const timingBoard = new TimingBoard(
    race.groups,
    race.completedFinishes,
    race.seed,
  );
  timingBoard.appendHeaderControl(seedControls);
  const trackScoreBoard = new TrackScoreBoard(race.groups);
  const topRightHud = document.createElement('div');
  topRightHud.className = 'top-right-hud';
  // Keep global scores in the upper slot and the current race beneath it.
  topRightHud.append(trackScoreBoard.element, timingBoard.element);
  document.body.appendChild(topRightHud);
  const runningCategories = new Set<string>();
  if (new URLSearchParams(window.location.search).get('demo') === 'true') {
    try {
      const written = await loadDefaultModels(true);
      if (written.length)
        console.info(`Loaded default models: ${written.join(', ')}`);
    } catch (err) {
      console.warn('Unable to load default circuit models', err);
    }
  }
  race.initialize();
  timingBoard.update();
  trackScoreBoard.update(race.seed);
  // paint the button states before the first frame, they load with their colors
  updateFollowButtons();

  loop.play(
    (_es, _dt) => {
      const now = performance.now();
      if (followPad.once('Space')) setFollow(0, false);
      for (let digit = 0; digit <= 9; digit++) {
        if (followPad.once(`Digit${digit}`))
          setFollow(digit === 0 ? 'mixed' : digit);
      }

      if (state.playing) {
        race.update(now);

        // The first drive input takes the camera to the human car.
        const h = state.human;
        const driving =
          !!h &&
          (h.controls.throttle !== 0 ||
            h.controls.left !== 0 ||
            h.controls.right !== 0);
        if (driving && !humanDriving) humanFollow = true;
        humanDriving = driving;
      }

      // The simulation and canvases can run at their normal frame rate, but
      // all HUD and other DOM writes share a 20 FPS budget.
      const domUpdateDue = shouldUpdateDom(now);
      if (domUpdateDue) {
        race.refreshLeaderboard();
        timingBoard.update();
        trackScoreBoard.update(race.seed);
        updateFollowButtons();
        if (race.seedChangeAt) {
          const remaining = Math.max(0, race.seedChangeAt - now);
          finishCountdown.hidden = false;
          // the label changes at most once per tenth of a second
          const tenths = Math.floor(remaining / 100);
          if (tenths !== lastCountdownTenths) {
            lastCountdownTenths = tenths;
            finishCountdown.textContent = `next track in ${(tenths / 10).toFixed(1)}s`;
          }
        }
      }

      // the car canvas keeps whatever width the open panel leaves
      const panelWidth = Math.round(
        Math.min(window.innerWidth * PANEL_RATIO, PANEL_MAX_WIDTH),
      );
      const carWidth = panelOpen
        ? window.innerWidth - panelWidth
        : window.innerWidth;
      resizeCanvas(carCanvas, carCtx, carWidth, window.innerHeight);
      if (panelOpen) {
        resizeCanvas(
          networkCanvas,
          networkCtx,
          netWrap.clientWidth,
          netWrap.clientHeight,
        );
      }
      const camTarget = followedCar();
      const carUpFollow = followForced || humanFollow;
      const targetCameraAngle =
        carUpFollow && camTarget
          ? camTarget.vx !== 0 || camTarget.vy !== 0
            ? Math.atan2(-camTarget.vx, -camTarget.vy)
            : camTarget.angle
          : 0;
      if (state.playing && race.seedChangeAt) {
        const spawn = race.circuit.getSpawn();
        camX = spawn.x;
        camY = spawn.y;
        camSet = true;
      } else if (state.playing && camTarget) {
        // Displace the camera along the car's current world-space direction;
        // the view rotation is applied afterward and can lerp independently.
        const followX = carUpFollow
          ? camTarget.x - Math.sin(targetCameraAngle) * CAMERA_AHEAD_DISTANCE
          : camTarget.x - 2 * camTarget.vx;
        const followY = carUpFollow
          ? camTarget.y - Math.cos(targetCameraAngle) * CAMERA_AHEAD_DISTANCE
          : camTarget.y - 2 * camTarget.vy;
        if (!camSet) {
          camX = followX;
          camY = followY;
          camSet = true;
        }
        // Keep the camera ahead of the car in car-up mode so more of the
        // upcoming track is visible. In fixed-world mode, the small velocity
        // lead keeps the target visually centered.
        camX += (followX - camX) * 0.1;
        camY += (followY - camY) * 0.1;
      }
      if (carUpFollow && camTarget) {
        if (!camAngleSet) {
          camAngle = targetCameraAngle;
          camAngleSet = true;
        } else {
          // Interpolate over the shortest arc so the camera never snaps at π.
          const delta = Math.atan2(
            Math.sin(targetCameraAngle - camAngle),
            Math.cos(targetCameraAngle - camAngle),
          );
          camAngle += delta * 0.1;
        }
      } else {
        camAngle = 0;
        camAngleSet = false;
      }
      const cameraAngle = camAngle;
      // the controls mimic the followed car, hidden while it is dead
      if (domUpdateDue) {
        steerOverlay.style.setProperty(
          '--hud-color',
          camTarget?.color || '#c4c4c4',
        );
        steerOverlay.classList.toggle(
          'hidden',
          !camTarget || lastFollowed?.damaged,
        );
      }
      if (camTarget) {
        const c = camTarget.controls;
        if (controlCtx)
          drawControlAxes(
            controlCtx,
            c.left,
            c.right,
            c.throttle,
            camTarget.color,
          );
        if (velocityCtx)
          drawVelocityVector(
            velocityCtx,
            camTarget.angle,
            camTarget.vx,
            camTarget.vy,
            camTarget.maxSpeed,
            camTarget.color,
          );
        if (domUpdateDue) {
          speedoValue.textContent = Math.hypot(
            camTarget.vx,
            camTarget.vy,
          ).toFixed(1);
          lapsEl.textContent = `lap ${Math.min(
            camTarget.laps + 1,
            config.LAPS_PER_SEED,
          )}/${config.LAPS_PER_SEED}`;
          lapFramesEl.textContent = `lap ${camTarget.framesSinceLapStart}f`;
          totalFramesEl.textContent = `total ${
            camTarget.totalRaceFrames + camTarget.framesSinceLapStart
          }f`;
          updateFocusedTiming(camTarget);
          const gateFraction = Math.max(
            0,
            Math.min(
              1,
              camTarget.checkpointFramesRemaining /
                config.CHECKPOINT_BUDGET_FRAMES,
            ),
          );
          gateGaugeFill.style.height = `${gateFraction * 100}%`;
          gateGauge.setAttribute(
            'aria-valuenow',
            String(camTarget.checkpointFramesRemaining),
          );
        }
      }
      lastFollowed = camTarget;
      state.camX = camX;
      state.camY = camY;
      carCtx.save();
      // Paint the screen-space background before rotating the world, otherwise
      // the corners of a rotated viewport can expose the old frame.
      carCtx.fillStyle = config.PLANE_COLOR;
      carCtx.fillRect(0, 0, carCanvas.width, carCanvas.height);
      carCtx.translate(carCanvas.width / 2, carCanvas.height / 2);
      carCtx.rotate(cameraAngle);
      carCtx.translate(-camX, -camY);

      race.circuit.draw(carCtx);
      const nextCheckpoint = camTarget
        ? race.circuit.checkpoints[camTarget.nextCheckpoint]
        : undefined;
      for (let i = 0; i < race.circuit.checkpoints.length; i++) {
        race.circuit.checkpoints[i].draw(
          carCtx,
          race.circuit.checkpoints[i] === nextCheckpoint,
        );
      }
      for (let i = 0; i < race.circuit.obstacles.length; i++) {
        race.circuit.obstacles[i].draw(carCtx);
      }
      // Show the predictive collision radius only when the followed car's
      // current sensor fan can see the moving obstacle.
      const followedSensor = camTarget?.sensor;
      if (followedSensor) {
        for (const obstacle of race.circuit.obstacles) {
          if (
            obstacle.type !== 'moving' ||
            !followedSensor.isObstacleInView(obstacle)
          ) {
            continue;
          }
          const distance = Math.hypot(
            obstacle.x - followedSensor.car.x,
            obstacle.y - followedSensor.car.y,
          );
          obstacle.drawCollisionRadius(carCtx, distance);
        }
      }
      // the human car draws last, above every other car, no sensor fan
      const corpseNow = performance.now();
      // off-screen cars cost a transform and two blits for nothing
      const viewMargin = 50;
      // A rotated screen rectangle has a larger axis-aligned world bounding
      // box. Keep this culling conservative so cars never pop in at corners.
      const sinCamera = Math.abs(Math.sin(cameraAngle));
      const cosCamera = Math.abs(Math.cos(cameraAngle));
      const viewHalfWidth =
        (carCanvas.width * cosCamera + carCanvas.height * sinCamera) / 2;
      const viewHalfHeight =
        (carCanvas.width * sinCamera + carCanvas.height * cosCamera) / 2;
      const viewMinX = camX - viewHalfWidth - viewMargin;
      const viewMaxX = camX + viewHalfWidth + viewMargin;
      const viewMinY = camY - viewHalfHeight - viewMargin;
      const viewMaxY = camY + viewHalfHeight + viewMargin;
      for (let i = 0; i < state.cars.length; i++) {
        const car = state.cars[i];
        if (car === state.human) continue;
        const box = car.aabb;
        if (
          box.maxX < viewMinX ||
          box.minX > viewMaxX ||
          box.maxY < viewMinY ||
          box.minY > viewMaxY
        )
          continue;
        if (car.damaged) {
          // fade from 50% opacity to 0 over DEAD_LIFETIME
          carCtx.globalAlpha =
            0.5 *
            Math.max(0, 1 - (corpseNow - car.deathTime) / config.DEAD_LIFETIME);
        } else {
          carCtx.globalAlpha = i === 0 || !car.useAI ? 1 : 0.3;
        }
        car.draw(carCtx, car === camTarget);
      }
      if (state.human) {
        carCtx.globalAlpha = 1;
        state.human.draw(carCtx, false);
      }
      carCtx.globalAlpha = 1;

      carCtx.restore();

      drawScores(state, carCtx);

      const followed = camTarget?.brain;
      if (panelOpen && followed) {
        neuralVisualizer.renderNetwork(networkCtx, followed);
      }
      // The KeyS shortcut toggles the stats, now an inline DOM block in the cockpit.
      if (domUpdateDue) {
        const statsOn = neuralVisualizer.renderStats;
        brainStats.classList.toggle('hidden', !statsOn || !followed);
        if (statsOn && followed && camTarget)
          updateBrainStats(followed, camTarget);
      }
    },
    {
      maxFps: config.HUMAN_FPS_CAP,
      shouldCap: () => config.HUMAN_FPS_CAP_ENABLED && humanFollow,
    },
  );

  /** car buttons stay filled with their car color while the category
   *  races, and turn to an outline once its last car is dead */
  function updateFollowButtons() {
    // one pass fills every category at once instead of one scan per button
    runningCategories.clear();
    for (const car of state.cars) {
      if (car.damaged) continue;
      runningCategories.add(
        car.brain instanceof MixedNetwork ? 'mixed' : String(car.brainLayers),
      );
    }
    followBtns.forEach((info, btn) => {
      const running =
        info.key === '0' ? state.living > 0 : runningCategories.has(info.key);
      if (running === info.running) return;
      info.running = running;
      btn.classList.toggle('running', running);
      btn.classList.toggle('dead', !running);
    });
  }

  function followedCar(): Car | undefined {
    // Once the race enters its finish countdown, stop following any finisher.
    if (race.seedChangeAt) return undefined;
    const now = performance.now();
    const freshFinish = (car: Car) =>
      car.finished &&
      car.completedLapAt > 0 &&
      now - car.completedLapAt < FINISH_FOCUS_MS;
    if (
      humanFollow &&
      state.human &&
      !state.human.damaged &&
      (!state.human.finished || freshFinish(state.human))
    )
      return state.human;
    const inCategory = (car: Car) =>
      !car.damaged &&
      !car.finished &&
      (follow === 'mixed'
        ? car.brain instanceof MixedNetwork
        : follow > 0
          ? car.brainLayers === follow && !(car.brain instanceof MixedNetwork)
          : true);
    // the leaderboard sort runs on HUD ticks only, so the camera target
    // resolves the leader with a single max-score scan
    let leader: Car | undefined;
    for (const car of state.cars) {
      if (inCategory(car) && (!leader || car.brain.score > leader.brain.score))
        leader = car;
    }
    if (!leader) {
      for (const car of state.cars) {
        if (!car.damaged && !car.finished) {
          leader = car;
          break;
        }
      }
    }
    const current = followTarget;
    // Let the just-finished target remain focused briefly so its final timing
    // and delta are visible before the camera picks another racer.
    if (current && !current.damaged && freshFinish(current)) return current;
    if (
      current &&
      current !== leader &&
      leader &&
      state.cars.includes(current) &&
      inCategory(current) &&
      leader.brain.score - current.brain.score <= FOLLOW_SWITCH_SCORE_GAP &&
      now - followTargetSince < FOLLOW_SWITCH_MIN_MS
    ) {
      return current;
    }
    if (leader !== current) {
      followTarget = leader;
      followTargetSince = now;
    }
    return leader;
  }

  /** Rebuild the inline stats block of the followed brain; the DOM is only
   *  touched when the rendered text changes, so a steady frame is cheap. */
  function updateTimingLine(
    line: TimingLine,
    frames: number | null,
    delta: number | null,
  ) {
    line.value.textContent =
      frames === null ? '—' : String(Math.max(0, Math.round(frames)));
    line.delta.textContent =
      delta === null ? '' : `(${delta > 0 ? '+' : ''}${Math.round(delta)})`;
    line.delta.style.color =
      delta === null
        ? ''
        : delta < 0
          ? '#70e08a'
          : delta > 0
            ? '#ff7070'
            : 'rgba(255, 255, 255, 0.55)';
  }

  function updateFocusedTiming(car: Car) {
    checkpointTiming.label.textContent =
      car.lastCheckpointIndex < 0 ? 'cp' : `cp${car.lastCheckpointIndex + 1}`;
    updateTimingLine(
      checkpointTiming,
      car.lastCheckpointIndex < 0 ? null : car.lastCheckpointFrames,
      car.lastCheckpointIndex < 0 ? null : car.lastCheckpointDelta,
    );
    updateTimingLine(
      lapTiming,
      car.laps < 1 ? null : car.completedLapFrames,
      car.laps < 1 ? null : car.lastLapDelta,
    );
    updateTimingLine(
      finishTiming,
      car.lastFinishFrames > 0 ? car.lastFinishFrames : null,
      car.lastFinishFrames > 0 ? car.lastFinishDelta : null,
    );
  }

  function updateBrainStats(network: NeuralNetwork, car: Car) {
    const mixed = network instanceof MixedNetwork;
    // Former record on this exact seed, from earlier visits to the track: the
    // live score of the current race is `scores.seed`, history is per seed.
    const groupKey = mixed ? 'mixed' : String(car.brainLayers);
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

  // A reload never loses more than the most recent promotions.
  window.addEventListener('beforeunload', () => race.saveAll());
};
