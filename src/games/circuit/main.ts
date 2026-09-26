import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import { downloadModelArchive, pickModelArchive } from '../../ai/modelTransfer';
import { fileUtilities } from '../../ai/utils';
import { Visualizer } from '../../ai/v2/Visualizer';
import { layerColor } from '../../utilities/ai/colors';
import { contrastText } from '../../utilities/colors';
import { createCanvas, resizeCanvas } from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { GameLoop } from '../../utilities/three/GameLoop';
import type { Car } from './classes/Car';
import { CircuitRace } from './classes/CircuitRace';
import { config } from './classes/Config';
import { drawSteeringWheel } from './ui/steeringWheel';
import { TimingBoard } from './ui/TimingBoard';
import { brainId, type defaultState, drawScores } from './utilities';

const neuralVisualizer = new Visualizer(config);

const io = fileUtilities('circuit');
if (config.CLEAR_STORAGE) io.discardModels();

/** the panel takes that share of the screen while open, capped in width,
 * the map keeps whatever is left */
const PANEL_RATIO = 0.75;
const PANEL_MAX_WIDTH = 800;

export default async (state: typeof defaultState) => {
  const carCanvas = createCanvas();
  carCanvas.style.position = 'fixed';
  carCanvas.style.left = '0';
  carCanvas.style.top = '0';

  const networkCanvas = createCanvas();
  networkCanvas.className = 'neural-canvas';
  const statsCanvas = createCanvas();
  statsCanvas.className = 'circuit-stats';

  const carCtx = carCanvas.getContext('2d');
  const networkCtx = networkCanvas.getContext('2d');
  const statsCtx = statsCanvas.getContext('2d');

  const followPad = new GamePad(new Map());
  /** 0 follows the best score overall, 1-9 the best car of that brain layer */
  let follow: number | 'mixed' = 0;
  /** world x/y mapped to the screen center, lerps so target switches animate */
  let camX = 0;
  let camY = 0;
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
  loadBtn.disabled = true;
  loadBtn.title =
    'disabled for now: the default archive predates the current sensors';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'model-btn';
  saveBtn.textContent = 'Save models';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'model-btn';
  clearBtn.textContent = 'Clear training';
  loadBtn.onclick = async () => {
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
  let humanDriving = false;

  const setFollow = (value: number | 'mixed') => {
    follow = value;
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
  setFollow(0);

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
  about.textContent = `It's a competition between ${config.MAX_NETWORK_LAYERS} different brain designs, plus a brain trained to hot-swap the proper one given the road situation of each frame (the mixed brain). They can all be visualized, and you can play against them to compete, or follow / tweak a specific architecture. Each time an instance of a neural network completes ${config.LAPS_PER_SEED} laps, the map is regenerated to a random configuration; every seed keeps its own score, so returning to a track restores its record, and groups that already finished it continue with mutation runs only.`;

  const footer = document.createElement('div');
  footer.className = 'side-panel-footer';
  footer.textContent = 'Long press for reset (right-click also works)';

  const actions = document.createElement('div');
  actions.className = 'model-actions';
  actions.append(loadBtn, saveBtn, clearBtn);

  const info = document.createElement('div');
  info.className = 'side-panel-info';
  info.append(about, legend);

  const panelContent = document.createElement('div');
  panelContent.className = 'side-panel-content';
  panelContent.append(actions, followKeys, netWrap, info, footer);

  panel.append(toggleBtn, panelContent);
  document.body.appendChild(panel);

  // the wheel, pedals and speed mimic the followed car, display only
  const steerOverlay = document.createElement('div');
  steerOverlay.className = 'steer-overlay hidden';
  const wheelCanvas = document.createElement('canvas');
  wheelCanvas.className = 'steer-wheel';
  wheelCanvas.width = 110;
  wheelCanvas.height = 110;
  const wheelCtx = wheelCanvas.getContext('2d');
  // one pill for the signed throttle: centered neutral, up = gas, down = reverse
  const pedal = document.createElement('div');
  pedal.className = 'pedal';
  pedal.title = 'throttle: up = gas, down = brake / reverse';
  const pedalCap = document.createElement('div');
  pedalCap.className = 'pedal-cap';
  pedal.append(pedalCap);
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
  readout.append(finishCountdown, lapsEl, lapFramesEl, totalFramesEl, speedo);
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
  // The network remains in the sidebar, but its information card travels with
  // the in-game cockpit so it is visible while the model panel is closed.
  steerOverlay.append(wheelCanvas, pedal, readout, gateGauge, statsCanvas);
  document.body.appendChild(steerOverlay);

  let lastFollowed: Car | undefined;
  let wheelAngle = 0;

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
      seedValue.textContent = String(nextSeed);
      finishCountdown.hidden = true;
      camSet = false;
    },
  });

  // The map selector stays in the top-left HUD so it remains available while
  // the model panel is closed. Buttons apply immediately and update the hash.
  const seedControls = document.createElement('div');
  seedControls.className = 'seed-controls';
  const seedLabel = document.createElement('span');
  seedLabel.textContent = 'map';
  const seedValue = document.createElement('span');
  seedValue.className = 'seed-value';
  seedValue.textContent = String(seed);
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
  seedControls.append(previousSeed, seedLabel, seedValue, nextSeed);
  document.body.appendChild(seedControls);

  const timingBoard = new TimingBoard(
    state,
    race.groups,
    race.completedFinishes,
  );
  race.initialize();
  timingBoard.update();
  // paint the button states before the first frame, they load with their colors
  updateFollowButtons();

  loop.play(
    (_es, _dt) => {
      if (followPad.once('Space')) setFollow(0);
      for (let digit = 0; digit <= 9; digit++) {
        if (followPad.once(`Digit${digit}`))
          setFollow(digit === 0 ? 'mixed' : digit);
      }

      if (state.playing) {
        const now = performance.now();
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

        timingBoard.update();
        if (race.seedChangeAt) {
          const remaining = Math.max(0, race.seedChangeAt - now);
          finishCountdown.hidden = false;
          finishCountdown.textContent = `next track in ${(remaining / 1000).toFixed(1)}s`;
        }
      }
      updateFollowButtons();

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
      resizeCanvas(
        statsCanvas,
        statsCtx,
        statsCanvas.clientWidth,
        statsCanvas.clientHeight,
      );

      const camTarget = followedCar();
      if (state.playing && race.seedChangeAt) {
        const spawn = race.circuit.getSpawn();
        camX = spawn.x;
        camY = spawn.y;
        camSet = true;
      } else if (state.playing && camTarget) {
        if (!camSet) {
          camX = camTarget.x;
          camY = camTarget.y;
          camSet = true;
        }
        // lead the target by 2 frames of true velocity so the 10% lerp stays centered
        camX += (camTarget.x - 2 * camTarget.vx - camX) * 0.1;
        camY += (camTarget.y - 2 * camTarget.vy - camY) * 0.1;
      }
      // the controls mimic the followed car, hidden while it is dead
      steerOverlay.classList.toggle(
        'hidden',
        !camTarget || lastFollowed?.damaged,
      );
      if (camTarget) {
        const c = camTarget.controls;
        const steer = Math.max(-1, Math.min(1, c.left - c.right));
        wheelAngle +=
          (steer * config.STEER_UI_WHEEL_MAX_ANGLE - wheelAngle) *
          config.STEER_UI_SMOOTH;
        if (wheelCtx) drawSteeringWheel(wheelCtx, wheelAngle);
        const throttle = Math.max(-1, Math.min(1, c.throttle));
        pedalCap.style.transform = `translateY(${
          (1 - throttle) * config.STEER_UI_PEDAL_TRAVEL
        }px)`;
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
        const gateFraction = Math.max(
          0,
          Math.min(
            1,
            camTarget.checkpointFramesRemaining /
              config.CHECKPOINT_BUDGET_FRAMES,
          ),
        );
        gateGaugeFill.style.width = `${gateFraction * 100}%`;
        gateGauge.setAttribute(
          'aria-valuenow',
          String(camTarget.checkpointFramesRemaining),
        );
      }
      lastFollowed = camTarget;
      state.camX = camX;
      state.camY = camY;
      carCtx.save();
      carCtx.translate(carCanvas.width / 2 - camX, carCanvas.height / 2 - camY);

      // the plane, only the visible part is painted
      carCtx.fillStyle = config.PLANE_COLOR;
      carCtx.fillRect(
        camX - carCanvas.width / 2,
        camY - carCanvas.height / 2,
        carCanvas.width,
        carCanvas.height,
      );

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
      // the human car draws last, above every other car, no sensor fan
      const corpseNow = performance.now();
      for (let i = 0; i < state.cars.length; i++) {
        const car = state.cars[i];
        if (car === state.human) continue;
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
      // The KeyS shortcut toggles the card, which is rendered beside the cockpit
      // instead of over the network preview.
      const statsOn = neuralVisualizer.renderStats;
      statsCanvas.classList.toggle('hidden', !statsOn || !followed);
      if (statsOn && followed) {
        neuralVisualizer.renderStatsOverlay(statsCtx, followed);
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
    followBtns.forEach((info, btn) => {
      const running =
        info.key === '0'
          ? state.living > 0
          : state.cars.some(
              (car) =>
                !car.damaged &&
                (info.key === 'mixed'
                  ? car.brain instanceof MixedNetwork
                  : car.brainLayers === Number(info.key) &&
                    !(car.brain instanceof MixedNetwork)),
            );
      if (running === info.running) return;
      info.running = running;
      btn.classList.toggle('running', running);
      btn.classList.toggle('dead', !running);
    });
  }

  function followedCar(): Car | undefined {
    if (
      humanFollow &&
      state.human &&
      !state.human.damaged &&
      !state.human.finished
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
    const leader =
      state.sortedCars.find(inCategory) ??
      state.sortedCars.find((car) => !car.damaged && !car.finished);
    const now = performance.now();
    const current = followTarget;
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

  // A reload never loses more than the most recent promotions.
  window.addEventListener('beforeunload', () => race.saveAll());
};
