import { downloadModelArchive, pickModelArchive } from '../../ai/modelTransfer';
import {
  hydrateExperts,
  MIXED_KIND,
  MIXED_LEVELS,
  MixedNetwork,
} from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import { fileUtilities } from '../../ai/utils';
import { Visualizer } from '../../ai/v2/Visualizer';
import { contrastText, getColorScale } from '../../utilities/colors';
import { createCanvas, resizeCanvas } from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { lerp } from '../../utilities/math';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Car, getCircuitBrainDimensions } from './classes/Car';
import { config } from './classes/Config';
import { Circuit } from './classes/Circuit';
import { ControlType } from './types';
import {
  defaultState,
  drawScores,
  mixedColor,
  Group,
  GroupScores,
} from './utilities';

/** scores live under their own key per group, still inside the game prefix */
function scoreKey(group: Group) {
  return group.isMixed
    ? `circuit_score_${MIXED_KIND}_${MIXED_LEVELS}`
    : `circuit_score_${group.layer}`;
}

function loadScores(group: Group, seed: number) {
  let scores: GroupScores | null = null;
  try {
    scores = JSON.parse(localStorage.getItem(scoreKey(group)) || 'null');
  } catch {
    scores = null;
  }
  if (!scores || typeof scores.total !== 'number') {
    scores = { current: seed, total: 0, seed: 0, history: {} };
    return scores;
  }
  // a reload on a different seed folds what the previous page left pending
  if (scores.current !== seed) {
    foldScores(scores, seed);
    localStorage.setItem(scoreKey(group), JSON.stringify(scores));
  }
  return scores;
}

function saveScores(group: Group) {
  localStorage.setItem(scoreKey(group), JSON.stringify(group.scores));
}

/** a new seed finalizes the old one's high score and keeps 10% of the
 *  running total, so recent maps dominate and the bar self-calibrates */
function foldScores(scores: GroupScores, newSeed: number) {
  const finished = String(scores.current);
  scores.history[finished] = Math.max(
    scores.history[finished] || 0,
    scores.seed,
  );
  scores.total = (scores.total + scores.seed) / 10;
  scores.current = newSeed;
  scores.seed = 0;
}

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

  const carCtx = carCanvas.getContext('2d');
  const networkCtx = networkCanvas.getContext('2d');

  const followPad = new GamePad(new Map());
  /** 0 follows the best score overall, 1-9 the best car of that brain layer */
  let follow: number | 'mixed' = 0;
  /** world x/y mapped to the screen center, lerps so target switches animate */
  let camX = 0;
  let camY = 0;
  let camSet = false;
  let panelOpen = !window.location.href.includes('demo=true');
  /** the mixed brain's library, empty until the first saves exist */
  let experts: NeuralNetwork[] = [];

  /** the human car: no brain, no group, no saves — the keys are the action */
  function spawnHuman() {
    const spawn = circuit.getSpawn();
    const car = new Car(
      spawn.x,
      spawn.y,
      spawn.angle,
      ControlType.HUMAN,
      config.CAR_MAX_SPEED,
      '🕹',
      'white',
      1,
    );
    state.human = car;
    state.cars.push(car);
    state.living++;
  }

  const panel = document.createElement('aside');
  panel.className = (panelOpen ? 'open ' : '') + 'side-panel';
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
  loadBtn.title = 'disabled for now: the default archive predates the current sensors';
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
      initialize();
    } catch (err) {
      if (err && err.message !== 'No file selected') {
        alert((err && err.message) || 'Unable to load models');
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
    initialize();
  };

  const followKeys = document.createElement('div');
  followKeys.className = 'follow-keys';
  const followLabel = document.createElement('span');
  followLabel.textContent = 'Follow';

  // driving the human car takes the camera; it gives it back on a crash or
  // a manual follow change
  let humanFollow = false;
  let humanDriving = false;

  const setFollow = (value: number | 'mixed') => {
    follow = value;
    humanFollow = false;
    followKeys.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.follow === String(value));
    });
    // Mixed colors change every frame, so mixed and "all" keep a neutral DOM
    // outline instead of repainting the panel continuously.
    const color =
      typeof value === 'number' && value > 0
        ? getColorScale(value / config.MAX_NETWORK_LAYERS)
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
      if (!confirm('Reset the saved mixed brain weights?')) return;
      io.discardModel(MIXED_LEVELS, MIXED_KIND);
    } else if (value === 0) {
      if (!confirm('Reset all the saved circuit weights?')) return;
      io.discardGameModels();
    } else {
      if (!confirm(`Reset the saved weights of brain ${value}?`)) return;
      io.discardModel(value);
    }
    console.info(
      `Reset saved weights of ${value === 0 ? 'all brains' : value}`,
    );
    if (value === 0) initialize();
    else resetBrainGroup(value);
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
      ['brain 1', 1],
      ['brain 2', 2],
      ['brain 3', 3],
      ['brain 4', 4],
      ['brain 5', 5],
      ['brain 6', 6],
      ['brain 7', 7],
      ['brain 8', 8],
      ['brain 9', 9],
      ['all', 0],
      ['mixed experts', 'mixed'],
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
        ? getColorScale(value / config.MAX_NETWORK_LAYERS)
        : '#c4c4c4';
    btn.style.setProperty('--btn-color', color);
    // black or white, whichever keeps the higher contrast on the car color
    btn.style.setProperty('--btn-text', contrastText(color));
    followKeys.append(btn);
    followBtns.set(btn, { key: String(value) });
    armReset(btn, value, () => setFollow(value));
  });
  setFollow(0);

  const statsBtn = document.createElement('button');
  statsBtn.className = 'model-btn';
  statsBtn.textContent = 'Stats';
  statsBtn.setAttribute('aria-pressed', 'true');
  statsBtn.onclick = () => {
    neuralVisualizer.renderStats = !neuralVisualizer.renderStats;
  };

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
    '💀 crashed, fades out over 5s',
    '🏆 crashed with a higher score',
    '💜 car is racing',
    '💚 car is besting the total score',
    '👻 line total (the bar) + map high',
    '🕹 human car, driven with the arrows or WASD',
    '🧭 mixed brain',
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
  about.textContent = `It's a competition between ${config.MAX_NETWORK_LAYERS} different brain designs, plus a brain trained to hot-swap the proper one given the road situation of each frame (the mixed brain). They can all be visualized, and you can play against them to compete, or follow / tweak a specific architecture. Each time an instance of a neural network completes ${config.LAPS_PER_SEED} laps, the map is regenerated to a random configuration and scores are reduced to 10% to let the AIs train on a new scenario.`;

  const footer = document.createElement('div');
  footer.className = 'side-panel-footer';
  footer.textContent = 'Long press for reset (right-click also works)';

  const actions = document.createElement('div');
  actions.className = 'model-actions';
  actions.append(loadBtn, saveBtn, clearBtn, statsBtn);

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
  const raceEl = document.createElement('div');
  raceEl.className = 'race';
  raceEl.title = 'current map seed';
  const lapsEl = document.createElement('div');
  lapsEl.className = 'laps';
  lapsEl.title = 'laps on this map';
  lapsEl.textContent = `lap 0/${config.LAPS_PER_SEED}`;
  const finishCountdown = document.createElement('div');
  finishCountdown.className = 'finish-countdown';
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
  readout.append(raceEl, finishCountdown, lapsEl, speedo);
  // the gate countdown: frame budget left for the followed car to claim its
  // next gate
  const gateGauge = document.createElement('div');
  gateGauge.className = 'gate-gauge';
  gateGauge.title =
    'checkpoint frames remaining for the followed car';
  gateGauge.setAttribute('role', 'progressbar');
  gateGauge.setAttribute('aria-label', 'Checkpoint frames remaining');
  gateGauge.setAttribute('aria-valuemin', '0');
  gateGauge.setAttribute('aria-valuemax', String(config.CHECKPOINT_BUDGET_FRAMES));
  const gateGaugeFill = document.createElement('div');
  gateGaugeFill.className = 'gate-gauge-fill';
  gateGauge.append(gateGaugeFill);
  steerOverlay.append(wheelCanvas, pedal, readout, gateGauge);
  document.body.appendChild(steerOverlay);

  let lastFollowed: Car | undefined;
  let wheelAngle = 0;

  function drawWheel() {
    if (!wheelCtx) return;
    wheelCtx.clearRect(0, 0, 110, 110);
    wheelCtx.save();
    wheelCtx.translate(55, 55);
    // negative so a positive (left) steer turns the wheel counter-clockwise
    wheelCtx.rotate(-wheelAngle);
    wheelCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    wheelCtx.lineWidth = 8;
    wheelCtx.beginPath();
    wheelCtx.arc(0, 0, 46, 0, Math.PI * 2);
    wheelCtx.stroke();
    wheelCtx.lineWidth = 4;
    for (let s = 0; s < 3; s++) {
      // +PI/2 so one spoke points down and two up: symmetric about the notch
      const a = (s / 3) * Math.PI * 2 + Math.PI / 2;
      wheelCtx.beginPath();
      wheelCtx.moveTo(0, 0);
      wheelCtx.lineTo(Math.cos(a) * 44, Math.sin(a) * 44);
      wheelCtx.stroke();
    }
    // the marker notch makes the rotation readable
    wheelCtx.fillStyle = 'rgba(255, 220, 0, 0.9)';
    wheelCtx.beginPath();
    wheelCtx.arc(0, -40, 5, 0, Math.PI * 2);
    wheelCtx.fill();
    wheelCtx.restore();
  }

  toggleBtn.onclick = () => {
    panelOpen = panel.classList.toggle('open');
    toggleBtn.textContent = panelOpen ? '❯' : '❮';
  };

  const loop = new GameLoop();

  /** the seed is the only map state, it is always mirrored in the URL hash */
  function readSeed(): number | undefined {
    const m = location.hash.match(/circuit=(\d+)/);
    return m ? parseInt(m[1], 10) : undefined;
  }

  function writeSeed(seed: number) {
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#circuit=${seed}`,
    );
  }

  // no seed in the URL: start at 0
  let seed = readSeed() ?? 0;
  writeSeed(seed);
  raceEl.textContent = `race#${seed}`;
  let laps = 0;
  let circuit = new Circuit(seed);
  /** distinct brain structures that finished on the current map */
  const completedBrainIndices = new Set<string>();
  /** set once the required finishers are present; the track changes later */
  let seedChangeAt = 0;
  const SEED_CHANGE_DELAY = 10_000;
  const groups: Group[] = [];
  const pendingSaves = new Set<Group>();

  /** the ladder's top: shrinks with session progress (laps completed) */
  function maxMutation() {
    return lerp(
      config.MAX_MUTATION_LVL,
      config.MIN_MUTATION_LVL,
      Math.min(1, laps / config.MUTATION_LAP_DECAY),
    );
  }

  /** slot 0 clones the best untouched; higher slots use less mutation */
  function spawnCar(group: Group, slot: number): Car {
    const spawn = circuit.getSpawn();
    const isMixed = group.isMixed;
    const car = new Car(
      spawn.x,
      spawn.y,
      spawn.angle,
      ControlType.AI,
      config.CAR_MAX_SPEED,
      isMixed ? '🧭' : `${group.layer}-${slot}`,
      isMixed
        ? config.MIXED_COLOR
        : getColorScale(group.layer / config.MAX_NETWORK_LAYERS),
      group.layer,
      isMixed
        ? (inputCount, outputCount) =>
            new MixedNetwork(inputCount, outputCount, experts, {
              hiddenNodes: config.MIXED_HIDDEN_NODES,
              mutationBoost: config.MIXED_MUTATION_BOOST,
              resetChance: config.MIXED_RESET_CHANCE,
            })
        : undefined,
    );
    if (group.best && car.brain) {
      car.brain.mutationIndex = slot;
      car.brain.mutationFactor =
        slot === 0 ? 0 : Math.max(Number.MIN_VALUE, maxMutation() / slot);
      try {
        car.brain.mutate(group.best.brain);
      } catch (err) {
        // a save from a different sensor layout would otherwise kill the line
        console.error(
          `Line ${group.layer} save does not fit the current sensors, starting fresh.\nReset data with ${location.href}&clear=true`,
          err.message,
        );
      }
    }
    return car;
  }

  /** the mixed pool only exists once there are experts to route to */
  function buildPools() {
    groups.length = 0;
    // Keep expert hydration tied to the dimensions Car actually gives every
    // brain, so changing sensors or Controls cannot silently disable mixed.
    const { inputCount: inputNb, outputCount: outputNb } =
      getCircuitBrainDimensions();

    // the mixed pool only exists once there are experts to route to
    if (config.MIXED_ENABLED) {
      const hydrated = hydrateExperts(
        state.sortedModels,
        inputNb,
        outputNb,
        config.MIXED_EXPERTS_PER_LAYER,
      );
      if (hydrated.length < config.MIXED_MIN_EXPERTS) {
        console.debug(
          `🧭 Mixed brain needs ${config.MIXED_MIN_EXPERTS} trained brains, ${hydrated.length} available`,
        );
      } else {
        experts = hydrated;
        const mixedGroup: Group = {
          key: 'mixed',
          layer: MIXED_LEVELS,
          isMixed: true,
          pool: [],
          best: state.sortedMixed[MIXED_LEVELS]?.[0]
            ? {
                brain: state.sortedMixed[MIXED_LEVELS][0],
                score: state.sortedMixed[MIXED_LEVELS][0].score || 0,
              }
            : null,
          seedBest: null,
          scores: { current: seed, total: 0, seed: 0, history: {} },
          lapTimes: {},
        };
        groups.push(mixedGroup);
      }
    }

    for (let l = 1; l <= config.MAX_NETWORK_LAYERS; l++) {
      const layerGroup: Group = {
        key: String(l),
        layer: l,
        isMixed: false,
        pool: [],
        best: state.sortedModels[l]?.[0]
          ? {
              brain: state.sortedModels[l][0],
              score: state.sortedModels[l][0].score || 0,
            }
          : null,
        seedBest: null,
        scores: { current: seed, total: 0, seed: 0, history: {} },
        lapTimes: {},
      };
      groups.push(layerGroup);
    }

    for (const group of groups) {
      group.scores = loadScores(group, seed);
    }

    for (const group of groups) {
      group.pool = new Array(config.CARS_PER_GROUP);
      for (let i = 0; i < config.CARS_PER_GROUP; i++) {
        group.pool[i] = spawnCar(group, i);
      }
    }

    state.groups = groups;
  }

  /** the moment a car beats the bar, its brain becomes the new best */
  function promote(group: Group, car: Car) {
    // a snapshot: later changes to the promoting car cannot alter the best
    const brain = JSON.parse(JSON.stringify(car.brain)) as NeuralNetwork;
    group.best = { brain, score: car.brain.score };
    pendingSaves.add(group);
    // keep the in-memory saves in sync: the board shows them, and the mixed
    // brain's experts are re-hydrated from them when the mixed pool next spawns
    const saves = group.isMixed ? state.sortedMixed : state.sortedModels;
    saves[group.layer] = [brain];
    if (group.isMixed) {
      // future mixed spawns route to the fresh champions
      const { inputCount, outputCount } = getCircuitBrainDimensions();
      experts = hydrateExperts(
        state.sortedModels,
        inputCount,
        outputCount,
        config.MIXED_EXPERTS_PER_LAYER,
      );
    }
  }

  function flushPendingSaves() {
    for (const group of pendingSaves) {
      if (group.best) io.saveBestModels([group.best.brain], 1);
      saveScores(group);
    }
    pendingSaves.clear();
  }

  function groupOf(car: Car): Group | undefined {
    const key =
      car.brain instanceof MixedNetwork ? 'mixed' : String(car.brainLayers);
    return groups.find((g) => g.key === key);
  }

  /** Clear one group's saved champion and replace only that group's cars. */
  function resetBrainGroup(value: number | 'mixed') {
    const group = groups.find((candidate) =>
      value === 'mixed' ? candidate.isMixed : candidate.layer === value,
    );
    if (!group) return;

    const oldPool = new Set(group.pool);
    const oldLiving = group.pool.filter((car) => !car.damaged).length;
    state.cars = state.cars.filter((car) => !oldPool.has(car));
    group.best = null;
    group.seedBest = null;
    group.lapTimes = {};
    pendingSaves.delete(group);

    if (group.isMixed) state.sortedMixed[group.layer] = [];
    else state.sortedModels[group.layer] = [];

    // A regular brain may also be an expert for future mixed spawns.
    if (!group.isMixed) {
      const { inputCount, outputCount } = getCircuitBrainDimensions();
      experts = hydrateExperts(
        state.sortedModels,
        inputCount,
        outputCount,
        config.MIXED_EXPERTS_PER_LAYER,
      );
    }

    group.pool = new Array(config.CARS_PER_GROUP);
    for (let slot = 0; slot < config.CARS_PER_GROUP; slot++) {
      group.pool[slot] = spawnCar(group, slot);
    }
    state.cars.push(...group.pool);
    state.living += group.pool.length - oldLiving;
    state.sortedCars = state.cars.slice();
    camSet = false;
    updateTimingBoard();
  }

  /** Respawn a whole brain group after every car in it has finished fading.
   *  Keeping this decision per group means one line never waits for another. */
  function respawnGroup(group: Group, now: number) {
    if (
      group.pool.length === 0 ||
      group.pool.some((car) => !car.damaged) ||
      group.pool.some(
        (car) => now - car.deathTime <= config.DEAD_LIFETIME,
      )
    )
      return;

    const corpses = new Set(group.pool);
    state.cars = state.cars.filter((car) => !corpses.has(car));
    group.pool = group.pool.map((_corpse, slot) => spawnCar(group, slot));
    state.cars.push(...group.pool);
    state.living += group.pool.length;
  }

  function onDeath(car: Car) {
    state.living--;
    car.deathTime = performance.now();

    // a crash is a save point: flush everything staged so far
    flushPendingSaves();

    if (state.human && car === state.human) {
      // a human crash respawns a fresh human car, the person keeps driving
      car.controls.dispose();
      state.human = undefined;
      humanFollow = false;
      // spawnHuman bumps living itself, the old corpse just fades out
      spawnHuman();
    }
  }

  /** a new seed replaces the map: every pool respawns from its ladder,
   *  each group keeps its best brain but the score bar restarts at zero */
  function regenerateMap() {
    writeSeed(seed);
    raceEl.textContent = `race#${seed}`;
    circuit = new Circuit(seed);
    completedBrainIndices.clear();
    seedChangeAt = 0;
    finishCountdown.hidden = true;
    state.circuit = circuit;
    state.obstacles = circuit.obstacles;
    buildPools();

    // buildPools' loadScores already folded the previous seed once the seed
    // moved, the per-seed state just restarts
    for (const group of groups) {
      group.seedBest = null;
      saveScores(group);
    }
    state.cars = groups.flatMap((g) => g.pool);
    if (state.human) {
      state.human.controls.dispose();
      spawnHuman();
    }
    state.population = state.cars.length;
    // the pools may still hold corpses, they do not count as alive
    state.living = state.cars.filter((c) => !c.damaged).length;
    camSet = false;
    seedValue.textContent = String(seed);
  }

  /** a full lap: +1, the lap count is the session progress */
  function advanceSeed() {
    laps++;
    seed++;
    regenerateMap();
  }

  /** the user applied a seed in the input: new session on that seed */
  function applyUserSeed(value: number) {
    seed = value;
    laps = 0;
    regenerateMap();
  }

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
  previousSeed.onclick = () => applyUserSeed(Math.max(0, seed - 1));
  const nextSeed = document.createElement('button');
  nextSeed.type = 'button';
  nextSeed.textContent = '>';
  nextSeed.title = 'Next map';
  nextSeed.onclick = () => applyUserSeed(seed + 1);
  seedControls.append(previousSeed, seedLabel, seedValue, nextSeed);
  document.body.appendChild(seedControls);

  const timingBoard = document.createElement('section');
  timingBoard.className = 'timing-board';
  timingBoard.setAttribute('aria-label', 'Best laps and finishers');
  const timingTitle = document.createElement('div');
  timingTitle.className = 'timing-board-title';
  timingTitle.textContent = 'race progress';
  const timingColumns = document.createElement('div');
  timingColumns.className = 'timing-board-columns';
  const bestLapColumn = document.createElement('div');
  bestLapColumn.className = 'timing-board-column';
  const bestLapHeading = document.createElement('div');
  bestLapHeading.className = 'timing-board-heading';
  bestLapHeading.textContent = 'best laps';
  const timingRows = new Array(3).fill(0).map(() => {
    const row = document.createElement('div');
    row.className = 'timing-board-row';
    bestLapColumn.append(row);
    return row;
  });
  bestLapColumn.prepend(bestLapHeading);

  const finishColumn = document.createElement('div');
  finishColumn.className = 'timing-board-column';
  const finishHeading = document.createElement('div');
  finishHeading.className = 'timing-board-heading';
  finishHeading.textContent = 'finish';
  const finishRows = new Array(3).fill(0).map(() => {
    const row = document.createElement('div');
    row.className = 'timing-board-row';
    finishColumn.append(row);
    return row;
  });
  finishColumn.prepend(finishHeading);

  timingColumns.append(bestLapColumn, finishColumn);
  timingBoard.append(timingTitle, timingColumns);
  document.body.appendChild(timingBoard);

  function formatTimingFrames(frames: number) {
    const rounded = Math.max(0, Math.round(frames));
    if (rounded >= 1_000_000)
      return `${(rounded / 1_000_000).toFixed(1).replace(/\.0$/, '')}m frames`;
    if (rounded >= 1_000)
      return `${(rounded / 1_000).toFixed(1).replace(/\.0$/, '')}k frames`;
    return `${rounded} frames`;
  }

  function brainIdentityLabel(identity: string) {
    if (identity === 'mixed') return 'mixed';
    if (identity === 'human') return 'human';
    return `brain ${identity}`;
  }

  function brainIdentityColor(identity: string) {
    if (identity === 'human') return state.human?.color;
    return groups.find((group) => group.key === identity)?.pool[0]?.color;
  }

  function updateTimingBoard() {
    const ranked = groups
      .map((group) => {
        const times = Object.values(group.lapTimes).flat();
        return {
          group,
          best: times.length ? Math.min(...times) : Infinity,
        };
      })
      .filter((entry) => Number.isFinite(entry.best))
      .sort(
        (a, b) =>
          a.best - b.best ||
          (a.group.isMixed ? 1 : 0) - (b.group.isMixed ? 1 : 0) ||
          a.group.layer - b.group.layer,
      );

    timingRows.forEach((row, index) => {
      const entry = ranked[index];
      row.style.color =
        entry?.group.pool[0]?.color || 'rgba(255, 255, 255, 0.82)';
      row.textContent = entry
        ? `${index + 1}. ${
            entry.group.isMixed ? 'mixed' : `brain ${entry.group.layer}`
          }  ${formatTimingFrames(entry.best)}`
        : `${index + 1}. —`;
    });

    const finishers = [...completedBrainIndices].slice(0, finishRows.length);
    finishRows.forEach((row, index) => {
      const identity = finishers[index];
      row.style.color =
        (identity && brainIdentityColor(identity)) ||
        'rgba(255, 255, 255, 0.82)';
      row.textContent = identity
        ? `${index + 1}. ${brainIdentityLabel(identity)}`
        : `${index + 1}. —`;
    });
  }
  updateTimingBoard();

  try {
    initialize();
  } catch (err) {
    throw err;
  }
  // paint the button states before the first frame, they load with their colors
  updateFollowButtons();

  loop.play((_es, _dt) => {
    if (followPad.once('Space')) setFollow(0);
    for (let digit = 0; digit <= 9; digit++) {
      if (followPad.once(`Digit${digit}`))
        setFollow(digit === 0 ? 'mixed' : digit);
    }

    if (state.playing) {
      const now = performance.now();
      // a checkpoint pass is a save point: staged saves flush only then
      let savePoint = false;
      for (let i = 0; i < state.cars.length; i++) {
        const car = state.cars[i];
        const alive = !car.damaged;
        car.update(state.obstacles, circuit);
        const brain = car.brain;
        if (brain instanceof MixedNetwork) {
          car.setColor(mixedColor(brain));
        }
        if (alive && car.damaged) onDeath(car);
        if (car.passedCheckpoint) {
          car.passedCheckpoint = false;
          savePoint = true;
          const group = groupOf(car);
          if (group) pendingSaves.add(group);
        }
      }
      // the first drive input takes the camera to the human car
      const h = state.human;
      const driving =
        !!h &&
        (h.controls.throttle !== 0 ||
          h.controls.left !== 0 ||
          h.controls.right !== 0);
      if (driving && !humanDriving) humanFollow = true;
      humanDriving = driving;

      // Human corpses are not part of a brain group, so clean them up on their
      // own timer. AI corpses stay until their whole group can respawn.
      for (let i = state.cars.length - 1; i >= 0; i--) {
        const car = state.cars[i];
        if (
          !car.useAI &&
          car.damaged &&
          now - car.deathTime > config.DEAD_LIFETIME
        )
          state.cars.splice(i, 1);
      }

      // A group keeps its fading corpses until every same-group car is dead,
      // then the entire group respawns together. Each group is checked alone.
      for (const group of groups) respawnGroup(group, now);

      // the map high score is the max over the pool; the bar is the total
      for (const car of state.cars) {
        if (car.damaged || car.finished || !car.useAI) continue;
        const group = groupOf(car);
        if (!group) continue;
        if (car.brain.score > group.scores.seed) {
          group.scores.seed = car.brain.score;
          group.seedBest = {
            brain: JSON.parse(JSON.stringify(car.brain)) as NeuralNetwork,
            score: car.brain.score,
          };
          pendingSaves.add(group);
        }
        if (!group.best || car.brain.score > group.scores.total)
          promote(group, car);
      }

      // A map advances only after three distinct brain structures (or the
      // human) have completed the required race distance. This gives every
      // competing structure a chance to finish before the track changes.
      for (const car of state.cars) {
        const completedLap = car.completedLap;
        car.completedLap = false;
        const group = groupOf(car);
        if (completedLap && group && car.useAI && car.completedLapAt > 0) {
          const key = group.isMixed
            ? 'mixed-' + group.pool.indexOf(car)
            : car.label;
          group.lapTimes[key] = group.lapTimes[key] || [];
          group.lapTimes[key].push(car.completedLapFrames);
        }
        if (car.laps >= config.LAPS_PER_SEED) {
          const brainIndex = car === state.human
            ? 'human'
            : car.brain instanceof MixedNetwork
            ? 'mixed'
            : String(car.brainLayers);
          completedBrainIndices.add(brainIndex);
        }
      }
      if (completedBrainIndices.size >= 3 && !seedChangeAt) {
        // Finishing is a save point. Only a finisher that beats its
        // structure's saved champion is promoted and persisted.
        for (const other of state.cars) {
          if (!other.useAI || other.laps < config.LAPS_PER_SEED) continue;
          const group = groupOf(other);
          if (group && (!group.best || other.brain.score > group.best.score))
            promote(group, other);
        }
        flushPendingSaves();
        seedChangeAt = now + SEED_CHANGE_DELAY;
        finishCountdown.hidden = false;
      }
      updateTimingBoard();
      if (seedChangeAt) {
        const remaining = Math.max(0, seedChangeAt - now);
        finishCountdown.textContent = `next track in ${(remaining / 1000).toFixed(1)}s`;
        if (remaining === 0) advanceSeed();
      }

      state.sortedCars = state.cars.sort(
        (a, b) => b.brain.score - a.brain.score,
      );

      // crashes flush in onDeath, the map fold and the unload persist
      // directly; the checkpoint pass is the only per-frame save point
      if (savePoint) flushPendingSaves();
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

    const camTarget = followedCar();
    if (state.playing && seedChangeAt) {
      const spawn = circuit.getSpawn();
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
      !camTarget || (lastFollowed && lastFollowed.damaged),
    );
    if (camTarget) {
      const c = camTarget.controls;
      const steer = Math.max(-1, Math.min(1, c.left - c.right));
      wheelAngle +=
        (steer * config.STEER_UI_WHEEL_MAX_ANGLE - wheelAngle) *
        config.STEER_UI_SMOOTH;
      drawWheel();
      const throttle = Math.max(-1, Math.min(1, c.throttle));
      pedalCap.style.transform = `translateY(${
        (1 - throttle) * config.STEER_UI_PEDAL_TRAVEL
      }px)`;
      speedoValue.textContent = Math.hypot(camTarget.vx, camTarget.vy).toFixed(
        1,
      );
      lapsEl.textContent = `lap ${Math.min(camTarget.laps + 1, config.LAPS_PER_SEED)}/${
        config.LAPS_PER_SEED
      }`;
      const gateFraction = Math.max(
        0,
        Math.min(
          1,
          camTarget.checkpointFramesRemaining / config.CHECKPOINT_BUDGET_FRAMES,
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

    circuit.draw(carCtx);
    const nextCheckpoint = camTarget
      ? circuit.checkpoints[camTarget.nextCheckpoint]
      : undefined;
    for (let i = 0; i < circuit.checkpoints.length; i++) {
      circuit.checkpoints[i].draw(
        carCtx,
        circuit.checkpoints[i] === nextCheckpoint,
      );
    }
    for (let i = 0; i < circuit.obstacles.length; i++) {
      circuit.obstacles[i].draw(carCtx);
    }
    // the human car draws last, above every other car, no sensor fan
    const corpseNow = performance.now();
    for (let i = 0; i < state.cars.length; i++) {
      const car = state.cars[i];
      if (car === state.human) continue;
      if (car.damaged) {
        // fade from full opacity to 0 over DEAD_LIFETIME, ~0.8 at 1 s
        carCtx.globalAlpha = Math.max(
          0,
          1 - (corpseNow - car.deathTime) / config.DEAD_LIFETIME,
        );
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
      neuralVisualizer.render(networkCtx, followed);
    }
    // the KeyS shortcut toggles the stats too, keep the button in sync
    const statsOn = neuralVisualizer.renderStats;
    if (statsBtn.dataset.on !== String(statsOn)) {
      statsBtn.dataset.on = String(statsOn);
      statsBtn.classList.toggle('active', statsOn);
      statsBtn.setAttribute('aria-pressed', String(statsOn));
    }
  }, {
    maxFps: config.HUMAN_FPS_CAP,
    shouldCap: () => config.HUMAN_FPS_CAP_ENABLED && humanFollow,
  });

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
    if (humanFollow && state.human && !state.human.damaged && !state.human.finished)
      return state.human;
    const inCategory = (car: Car) =>
      !car.damaged &&
      !car.finished &&
      (follow === 'mixed'
        ? car.brain instanceof MixedNetwork
        : follow > 0
        ? car.brainLayers === follow && !(car.brain instanceof MixedNetwork)
        : true);
    return (
      state.sortedCars.find(inCategory) ??
      state.sortedCars.find((car) => !car.damaged && !car.finished)
    );
  }

  function initialize() {
    Object.assign(state, defaultState);
    state.playing = true;
    camSet = false;
    lastFollowed = undefined;
    state.sortedModels = io.loadAllModelLayers(config.MAX_NETWORK_LAYERS);
    state.sortedMixed = io.loadAllModelLayers(MIXED_LEVELS, MIXED_KIND);
    state.circuit = circuit;
    state.obstacles = circuit.obstacles;

    buildPools();
    state.cars = groups.flatMap((g) => g.pool);

    // the human car is always in the race, the keys are always its brain
    spawnHuman();
    state.population = state.cars.length;
    // everything is fresh and alive, the human included
    state.living = state.cars.length;
  }

  // a reload never loses more than the most recent promotions
  window.addEventListener('beforeunload', () => {
    for (const group of groups) {
      if (group.best) io.saveBestModels([group.best.brain], 1);
      saveScores(group);
    }
  });
};
