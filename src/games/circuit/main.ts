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
import { Car } from './classes/Car';
import { config } from './classes/Config';
import { Circuit } from './classes/Circuit';
import { ControlType } from './types';
import { defaultState, drawScores, mixedColor, Group, GroupScores } from './utilities';

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

/** a new seed finalizes the old one's high score and halves the running
 *  total, so recent maps dominate and the bar self-calibrates */
function foldScores(scores: GroupScores, newSeed: number) {
  const finished = String(scores.current);
  scores.history[finished] = Math.max(scores.history[finished] || 0, scores.seed);
  scores.total = (scores.total + scores.seed) / 2;
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
  let panelOpen = true;
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
      3,
      '🕹',
      'white',
      1,
    );
    state.human = car;
    state.cars.push(car);
    state.living++;
    state.population++;
  }

  function removeHuman() {
    if (!state.human) return;
    const idx = state.cars.indexOf(state.human);
    if (idx >= 0) state.cars.splice(idx, 1);
    state.human.controls.dispose();
    state.human = undefined;
    state.living = Math.max(0, state.living - 1);
    state.population = Math.max(0, state.population - 1);
  }

  const panel = document.createElement('aside');
  panel.className = 'side-panel open';
  panel.style.width = `${PANEL_RATIO * 100}%`;
  panel.style.maxWidth = `${PANEL_MAX_WIDTH}px`;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'side-panel-toggle';
  toggleBtn.textContent = '❯';
  toggleBtn.setAttribute('aria-label', 'Toggle models panel');

  const loadBtn = document.createElement('button');
  loadBtn.className = 'model-btn';
  loadBtn.textContent = 'Load models';
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

  const setFollow = (value: number | 'mixed') => {
    follow = value;
    followKeys.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.follow === String(value));
    });
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
    initialize();
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
    const color =
      value === 'mixed'
        ? config.MIXED_COLOR
        : value === 0
          ? undefined
          : getColorScale(value / config.MAX_NETWORK_LAYERS);
    if (color) {
      btn.style.setProperty('--btn-color', color);
      // black or white, whichever keeps the higher contrast on the car color
      btn.style.setProperty('--btn-text', contrastText(color));
    }
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

  // the human play toggle: one brainless car driven by the keyboard
  const humanWrap = document.createElement('label');
  humanWrap.className = 'human-toggle';
  const humanCheckbox = document.createElement('input');
  humanCheckbox.type = 'checkbox';
  humanCheckbox.title = 'Drive a car with the arrows or WASD';
  humanWrap.append(humanCheckbox, document.createTextNode(' Human play'));

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
    '💀 crashed, deleted after 20s',
    '🏆 crashed with a higher score',
    '💜 car is racing',
    '💚 car is besting the total score',
    '👻 line total (the bar) + map high',
    '🕹 human car, driven with the arrows or WASD',
    '🧭 mixed brain',
    '🏁 next checkpoint glows',
    '🚧 solid obstacle',
  ].forEach((line, i) => {
    const el = document.createElement('span');
    el.textContent = line;
    if (i === 0) el.className = 'legend-title';
    legend.append(el);
  });

  const footer = document.createElement('div');
  footer.className = 'side-panel-footer';
  footer.textContent = 'Long press for reset (right-click also works)';

  const panelContent = document.createElement('div');
  panelContent.className = 'side-panel-content';
  panelContent.append(
    loadBtn,
    saveBtn,
    clearBtn,
    statsBtn,
    humanWrap,
    followKeys,
    netWrap,
    legend,
    footer,
  );

  panel.append(toggleBtn, panelContent);
  document.body.appendChild(panel);

  // the wheel and pedals mimic the followed car's live outputs, display only
  humanCheckbox.onchange = () => {
    if (humanCheckbox.checked) spawnHuman();
    else removeHuman();
  };

  const steerOverlay = document.createElement('div');
  steerOverlay.className = 'steer-overlay hidden';
  const wheelCanvas = document.createElement('canvas');
  wheelCanvas.className = 'steer-wheel';
  wheelCanvas.width = 110;
  wheelCanvas.height = 110;
  const wheelCtx = wheelCanvas.getContext('2d');
  const pedalGroup = document.createElement('div');
  pedalGroup.className = 'pedal-group';
  const brakePedal = document.createElement('div');
  brakePedal.className = 'pedal';
  brakePedal.title = 'brake / reverse';
  const brakeCap = document.createElement('div');
  brakeCap.className = 'pedal-cap';
  const gasPedal = document.createElement('div');
  gasPedal.className = 'pedal';
  gasPedal.title = 'gas';
  const gasCap = document.createElement('div');
  gasCap.className = 'pedal-cap';
  brakePedal.append(brakeCap);
  gasPedal.append(gasCap);
  pedalGroup.append(brakePedal, gasPedal);
  // the speed reads the followed car's velocity magnitude, raw
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
  steerOverlay.append(wheelCanvas, pedalGroup, speedo);
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
      const a = (s / 3) * Math.PI * 2;
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

  let seed = readSeed() ?? 1 + Math.floor(Math.random() * 0xffffff);
  writeSeed(seed);
  let laps = 0;
  let circuit = new Circuit(seed);
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

  /** slot 0 clones the best untouched, slot k mutates (k/19) of the way */
  function spawnCar(group: Group, slot: number): Car {
    const spawn = circuit.getSpawn();
    const isMixed = group.isMixed;
    const car = new Car(
      spawn.x,
      spawn.y,
      spawn.angle,
      ControlType.AI,
      3,
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
        slot === 0 ? 0 : (slot / (config.CARS_PER_GROUP - 1)) * maxMutation();
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
    const inputNb = config.SENSORS + 2;
    const outputNb = 4;

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
      experts = hydrateExperts(
        state.sortedModels,
        config.SENSORS + 2,
        4,
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

  /** a dead car stays a corpse for DEAD_LIFETIME, its slot respawns at once */
  function onDeath(car: Car) {
    state.living--;
    car.deathTime = performance.now();

    // a crash is a save point: flush everything staged so far
    flushPendingSaves();

    if (car.useAI) {
      const group = groupOf(car);
      if (group) {
        const slot = group.pool.indexOf(car);
        if (slot >= 0) {
          group.pool[slot] = spawnCar(group, slot);
          state.cars.push(group.pool[slot]);
        }
      }
      state.living++;
    } else if (state.human && car === state.human) {
      // a human crash respawns a fresh human car, the person keeps driving
      car.controls.dispose();
      state.human = undefined;
      spawnHuman();
      state.living++;
    }
  }

  /** a new seed replaces the map: every pool respawns from its ladder,
   *  each group keeps its best brain but the score bar restarts at zero */
  function regenerateMap() {
    writeSeed(seed);
    circuit = new Circuit(seed);
    state.circuit = circuit;
    state.obstacles = circuit.obstacles;
    buildPools();

    for (const group of groups) {
      foldScores(group.scores, seed);
      group.seedBest = null;
      saveScores(group);
    }
    state.cars = groups.flatMap((g) => g.pool);
    if (state.human) {
      state.human.controls.dispose();
      spawnHuman();
    }
    state.population = state.cars.length;
    state.living = state.cars.length;
    camSet = false;
    if (document.activeElement !== seedInput) seedInput.value = String(seed);
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

  const seedWrap = document.createElement('label');
  seedWrap.className = 'seed-wrap';
  const seedLabel = document.createElement('span');
  seedLabel.textContent = 'map seed';
  const seedInput = document.createElement('input');
  seedInput.className = 'seed-input';
  seedInput.inputMode = 'numeric';
  seedInput.value = String(seed);
  seedInput.title = 'Apply a new seed (enter or blur)';
  const applySeedInput = () => {
    const value = parseInt(seedInput.value, 10);
    if (!Number.isFinite(value) || value <= 0 || value === seed) {
      seedInput.value = String(seed);
      return;
    }
    applyUserSeed(value);
  };
  seedInput.addEventListener('change', applySeedInput);
  seedInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      seedInput.blur();
    }
  });
  seedWrap.append(seedLabel, seedInput);
  panelContent.insertBefore(seedWrap, followKeys);

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
        if (alive && performance.now() - car.bornAt > config.CAR_LIFETIME_CAP) {
          car.damaged = true;
          car.deathTime = performance.now();
        }
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
      // corpses stay on the map long enough to read where the line failed
      for (let i = state.cars.length - 1; i >= 0; i--) {
        const car = state.cars[i];
        if (car.damaged && now - car.deathTime > config.DEAD_LIFETIME) {
          state.cars.splice(i, 1);
        }
      }

      // the map high score is the max over the pool; the bar is the total
      for (const car of state.cars) {
        if (car.damaged || !car.useAI) continue;
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
        if (!group.best || car.brain.score > group.scores.total) promote(group, car);
      }

      // the first full lap on this seed advances the map, the spec's only auto change
      for (const car of state.cars) {
        if (!car.completedLap) continue;
        car.completedLap = false;
        advanceSeed();
        break; // the map just changed, the loop restarts on the new one
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
    if (state.playing && camTarget) {
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
        (steer * config.STEER_UI_WHEEL_MAX_ANGLE - wheelAngle) * config.STEER_UI_SMOOTH;
      drawWheel();
      brakeCap.style.transform = `translateY(${Math.max(0, Math.min(1, c.reverse)) * config.STEER_UI_PEDAL_TRAVEL}px)`;
      gasCap.style.transform = `translateY(${Math.max(0, Math.min(1, c.forward)) * config.STEER_UI_PEDAL_TRAVEL}px)`;
      speedoValue.textContent = Math.hypot(camTarget.vx, camTarget.vy).toFixed(1);
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
    for (let i = 0; i < state.cars.length; i++) {
      const car = state.cars[i];
      carCtx.globalAlpha = i === 0 || !car.useAI ? 1 : 0.3;
      car.draw(carCtx, car === camTarget);
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
    const inCategory = (car: Car) =>
      !car.damaged &&
      (follow === 'mixed'
        ? car.brain instanceof MixedNetwork
        : follow > 0
          ? car.brainLayers === follow && !(car.brain instanceof MixedNetwork)
          : true);
    return (
      state.sortedCars.find(inCategory) ??
      state.sortedCars.find((car) => !car.damaged)
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

    state.population = state.cars.length;
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
