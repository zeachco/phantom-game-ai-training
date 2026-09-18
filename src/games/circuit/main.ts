import { downloadModelArchive, pickModelArchive } from '../../ai/modelTransfer';
import {
  expertSlotIds,
  hydrateExperts,
  MIXED_KIND,
  MIXED_LEVELS,
  MixedNetwork,
} from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import { fileUtilities } from '../../ai/utils';
import type { ModelsByLayerCount } from '../../ai/utils';
import { Visualizer } from '../../ai/v2/Visualizer';
import { contrastText, getColorScale } from '../../utilities/colors';
import { createCanvas, resizeCanvas } from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { lerp, rand } from '../../utilities/math';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Car } from './classes/Car';
import { config } from './classes/Config';
import { Circuit } from './classes/Circuit';
import { Obstacle } from './classes/Obstacle';
import { ControlType } from './types';
import { defaultState, drawScores, mixedColor } from './utilities';

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
  /** the death car's saved model, the player respawns with it */
  let deathCarModel: ModelsByLayerCount[number] | undefined;
  let deathCarLayer = 1;

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
      !confirm('Clear the current training set? This removes the saved models of this game.')
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
    '👶 first generation',
    '💀 crashed, deleted after 20s',
    '🏆 crashed with a higher score',
    '💜 car is racing',
    '💚 car is besting the best score',
    '👻 ghost car from a previous generation',
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
    followKeys,
    netWrap,
    legend,
    footer,
  );

  panel.append(toggleBtn, panelContent);
  document.body.appendChild(panel);

  toggleBtn.onclick = () => {
    panelOpen = panel.classList.toggle('open');
    toggleBtn.textContent = panelOpen ? '❯' : '❮';
  };

  const loop = new GameLoop();

  const circuit = new Circuit();
  // every car starts at the same point, the obstacles keep clear of it
  const obstacles = spawnObstacles(circuit, config.SPAWN_OFFSET);

  function spawnObstacles(circuit: Circuit, startOffset: number): Obstacle[] {
    const n = circuit.points.length;
    const per = circuit.length / n;
    const first = Math.round((startOffset + 250) / per) + 1;
    const last = n - 4;
    const span = Math.max(1, last - first);
    const step = span / config.OBSTACLES;
    const list: Obstacle[] = [];
    for (let i = 0; i < config.OBSTACLES; i++) {
      const base = first + (i + 0.5) * step;
      const idx = Math.round(base + rand(-0.35, 0.35) * step) % n;
      const p = circuit.points[idx];
      const t = circuit.tangents[idx];
      const off = rand(-60, 60);
      list.push(
        new Obstacle(
          p.x + circuit.normals[idx].x * off,
          p.y + circuit.normals[idx].y * off,
          Math.atan2(-t.x, -t.y),
        ),
      );
    }
    return list;
  }

  function setupAIs() {
    const cars: Car[] = [];
    config.autoDistributeByScores(state.sortedModels);

    const scores = state.sortedModels
      .map(([firstModel]) => Math.round(firstModel?.score) || 0)
      .sort((a, b) => b - a)
      .filter(Boolean);

    const [bestScore = 1, worstScore = 0] = [
      scores[0],
      scores[scores.length - 1],
    ];
    const advantage = bestScore - worstScore;

    for (let l = 1; l <= config.MAX_NETWORK_LAYERS; l++) {
      const configuredCars = config.CARS_PER_LAYERS[l];
      if (!configuredCars) continue;

      const savedModel =
        (state.sortedModels[l] && state.sortedModels[l][0]) ?? undefined;

      const layerOriginScore = savedModel?.score || 0;
      const scoreAdvantage = layerOriginScore - worstScore;
      const scoreRatio = advantage ? scoreAdvantage / advantage : 0;

      const carsNbForThisLayer = Math.max(
        configuredCars,
        config.MIN_CARS_PER_LAYER,
      );

      const divider =
        (savedModel?.version > 10 ? savedModel?.version : 10) / 10;
      const mutationTarget =
        lerp(config.MIN_MUTATION_LVL, config.MAX_MUTATION_LVL, 1 - scoreRatio) /
        divider;

      console.debug(
        `#${l} Gen-${savedModel?.version} Mutation ${
          Math.round(mutationTarget * 10000000) / 100000
        }% | Score: ${Math.round(layerOriginScore)} `,
      );

      let isSaveCompatible = true;

      for (let i = 0; i < carsNbForThisLayer; i++) {
        const spawn = circuit.getSpawn();
        const car = new Car(
          spawn.x,
          spawn.y,
          spawn.angle,
          ControlType.AI,
          3,
          `${l} - 0 👶`,
          getColorScale(l / config.MAX_NETWORK_LAYERS),
          l,
        );
        if (savedModel && car.brain) {
          car.brain.mutationIndex = i;

          car.brain.mutationFactor =
            (i / Math.max(1, carsNbForThisLayer - 1)) * mutationTarget;

          try {
            if (isSaveCompatible) car.brain.mutate(savedModel);
          } catch (err) {
            isSaveCompatible = false;
            console.error(
              `Unable to mutate existing brain #${car.brain.id}.\nReset data with ${location.href}&clear=true`,
              err.message,
            );
          }

          car.label = [l, i].join('-');
        }
        cars.push(car);
      }
    }

    setupMixed(cars);

    return cars;
  }

  /**
   * Spawns the cars driven by a mixed brain: a shallow selector that reads the
   * same sensors and answers with one of the trained brains, which then drives
   * with those very inputs. Experts stay frozen, only the routing is trained.
   */
  function setupMixed(cars: Car[]) {
    if (!config.MIXED_ENABLED) return;

    // same observation as the regular brains: rays, speed, gate angle
    const inputNb = config.SENSORS + 2;
    const outputNb = 4;
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
      return;
    }
    experts = hydrated;

    const savedModel = state.sortedMixed[MIXED_LEVELS]?.[0];
    const divider = (savedModel?.version > 10 ? savedModel.version : 10) / 10;
    const mutationTarget = config.MIXED_MAX_MUTATION_LVL / divider;

    console.debug(
      `🧭 Gen-${savedModel?.version ?? 0} Mutation ${
        Math.round(mutationTarget * config.MIXED_MUTATION_BOOST * 10000) / 100
      }% | ${hydrated.length} experts: ${expertSlotIds(hydrated).join(', ')}`,
    );

    let isSaveCompatible = true;
    const carsNb = Math.max(config.MIXED_CARS, config.MIXED_MIN_CARS);

    for (let i = 0; i < carsNb; i++) {
      const spawn = circuit.getSpawn();
      const car = new Car(
        spawn.x,
        spawn.y,
        spawn.angle,
        ControlType.AI,
        3,
        `0 👶`,
        config.MIXED_COLOR,
        MIXED_LEVELS,
        (inputCount, outputCount) =>
          new MixedNetwork(inputCount, outputCount, experts, {
            hiddenNodes: config.MIXED_HIDDEN_NODES,
            mutationBoost: config.MIXED_MUTATION_BOOST,
            resetChance: config.MIXED_RESET_CHANCE,
          }),
      );

      if (savedModel && car.brain) {
        car.brain.mutationIndex = i;
        car.brain.mutationFactor = (i / carsNb) * mutationTarget;

        try {
          if (isSaveCompatible) car.brain.mutate(savedModel);
        } catch (err) {
          isSaveCompatible = false;
          console.error(
            `Unable to mutate existing mixed brain #${car.brain.id}, starting over.`,
            err.message,
          );
        }

        car.label = `${i}`;
      }

      cars.push(car);
    }
  }

  /** the spread a replacement of `layer` rolls its mutation in */
  function mutationTargetFor(layer: number, isMixed: boolean) {
    const saves = isMixed ? state.sortedMixed : state.sortedModels;
    const saved = saves[layer] && saves[layer][0];
    const divider = (saved?.version > 10 ? saved?.version : 10) / 10;

    if (isMixed) return config.MIXED_MAX_MUTATION_LVL / divider;

    const scores = state.sortedModels
      .map(([firstModel]) => Math.round(firstModel?.score) || 0)
      .sort((a, b) => b - a)
      .filter(Boolean);
    const [bestScore = 1, worstScore = 0] = [
      scores[0],
      scores[scores.length - 1],
    ];
    const advantage = bestScore - worstScore;
    const ratio = advantage
      ? ((saved?.score || 0) - worstScore) / advantage
      : 0;
    return (
      lerp(config.MIN_MUTATION_LVL, config.MAX_MUTATION_LVL, 1 - ratio) /
      divider
    );
  }

  /**
   * Rolls a replacement for a crashed car from the saved best of its line. The
   * factor is a fresh random draw inside the line's spread, so a line keeps
   * exploring instead of converging on a single brain.
   */
  function replace(car: Car) {
    const isMixed = car.brain instanceof MixedNetwork;
    if (isMixed && !experts.length) return;

    const layer = isMixed ? MIXED_LEVELS : car.brainLayers;
    const saves = isMixed ? state.sortedMixed : state.sortedModels;
    const saved = saves[layer] && saves[layer][0];

    const spawn = circuit.getSpawn();
    const replacement = new Car(
      spawn.x,
      spawn.y,
      spawn.angle,
      ControlType.AI,
      3,
      isMixed ? '🧭' : `${layer}`,
      isMixed
        ? config.MIXED_COLOR
        : getColorScale(layer / config.MAX_NETWORK_LAYERS),
      layer,
      isMixed
        ? (inputCount, outputCount) =>
            new MixedNetwork(inputCount, outputCount, experts, {
              hiddenNodes: config.MIXED_HIDDEN_NODES,
              mutationBoost: config.MIXED_MUTATION_BOOST,
              resetChance: config.MIXED_RESET_CHANCE,
            })
        : undefined,
    );

    if (saved && replacement.brain) {
      replacement.brain.mutationIndex = 0;
      replacement.brain.mutationFactor =
        Math.random() * mutationTargetFor(layer, isMixed);
      try {
        replacement.brain.mutate(saved);
      } catch (err) {
        // a save from a different sensor layout would otherwise kill the line
        console.error(
          `Replacement brain of line ${layer} does not fit its save, starting fresh.\nReset data with ${location.href}&clear=true`,
          err.message,
        );
      }
    }

    state.cars.push(replacement);
  }

  /** a crashed brain only overwrites its line's save when it beats it */
  function recordBrain(car: Car) {
    const brain = car.brain;
    const isMixed = brain instanceof MixedNetwork;
    const saves = isMixed ? state.sortedMixed : state.sortedModels;
    const layer = isMixed ? MIXED_LEVELS : car.brainLayers;
    const best = saves[layer] && saves[layer][0];
    if (best && brain.score <= best.score) return;

    io.saveBestModels([brain], 1);
    if (isMixed) {
      state.sortedMixed = io.loadAllModelLayers(MIXED_LEVELS, MIXED_KIND);
    } else {
      state.sortedModels = io.loadAllModelLayers(config.MAX_NETWORK_LAYERS);
    }
  }

  /** a dead car becomes a corpse for DEAD_LIFETIME, and its line rolls on */
  function onDeath(car: Car) {
    state.living--;
    car.deathTime = performance.now();

    if (car.useAI) {
      recordBrain(car);
      state.passed++;
      replace(car);
      state.living++;
    } else if (state.player && car === state.player) {
      respawnPlayer();
      state.living++;
    }
  }

  function respawnPlayer() {
    if (!deathCarModel) {
      state.player = undefined;
      return;
    }
    const spawn = circuit.getSpawn();
    const player = new Car(
      spawn.x,
      spawn.y,
      spawn.angle,
      ControlType.KEYS,
      3,
      '🎥 Camera',
      getColorScale(deathCarLayer / config.MAX_NETWORK_LAYERS),
      deathCarLayer,
    );
    player.brain.mutationFactor = 0;
    player.brain.mutationIndex = 0;
    try {
      player.brain.mutate(deathCarModel);
    } catch (err) {
      // an old save with a different sensor count would otherwise kill the run
      console.error(
        `Death car model does not fit the current sensors, respawning fresh.\nReset data with ${location.href}&clear=true`,
        err.message,
      );
    }
    state.player = player;
    state.cars.push(player);
  }

  try {
    initialize();
  } catch (err) {
    throw err;
  }
  // paint the button states before the first frame, they load with their colors
  updateFollowButtons();

  loop.play((_es, _dt) => {
    if (followPad.once('Space')) setFollow('mixed');
    for (let digit = 0; digit <= 9; digit++) {
      if (followPad.once(`Digit${digit}`)) setFollow(digit);
    }

    if (state.playing) {
      const now = performance.now();
      for (let i = 0; i < state.cars.length; i++) {
        const car = state.cars[i];
        const alive = !car.damaged;
        car.update(obstacles, circuit);
        const brain = car.brain;
        if (brain instanceof MixedNetwork) {
          car.setColor(mixedColor(brain));
        }
        if (alive && car.damaged) onDeath(car);
      }
      // corpses stay on the map long enough to read where the line failed
      for (let i = state.cars.length - 1; i >= 0; i--) {
        const car = state.cars[i];
        if (car.damaged && now - car.deathTime > config.DEAD_LIFETIME) {
          state.cars.splice(i, 1);
        }
      }
      state.sortedCars = state.cars.sort(
        (a, b) => b.brain.score - a.brain.score,
      );
      const aiCount = state.population - (state.player ? 1 : 0);
      if (aiCount > 0 && state.passed >= aiCount) endExperiment();
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
      // lead the target by 2 frames of travel so the 10% lerp stays centered
      camX +=
        (camTarget.x - 2 * camTarget.speed * Math.sin(camTarget.angle) - camX) *
        0.1;
      camY +=
        (camTarget.y - 2 * camTarget.speed * Math.cos(camTarget.angle) - camY) *
        0.1;
    }
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
    for (let i = 0; i < obstacles.length; i++) {
      obstacles[i].draw(carCtx);
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

    if (!state.playing) {
      carCtx.font = 'bold 24px Arial';
      carCtx.textBaseline = 'middle';
      carCtx.textAlign = 'center';
      carCtx.fillStyle = 'red';
      carCtx.strokeStyle = '#800';
      carCtx.lineWidth = 1;
      carCtx.fillText(
        `NEXT GENERATION`,
        carCanvas.width / 2,
        carCanvas.height / 2,
      );
      carCtx.strokeText(
        `NEXT GENERATION`,
        carCanvas.width / 2,
        carCanvas.height / 2,
      );
    }
  });

  function initialize() {
    Object.assign(state, defaultState);
    state.playing = true;
    camSet = false;
    state.sortedModels = io.loadAllModelLayers(config.MAX_NETWORK_LAYERS);
    state.sortedMixed = io.loadAllModelLayers(MIXED_LEVELS, MIXED_KIND);
    state.circuit = circuit;
    state.obstacles = obstacles;

    deathCarModel = undefined;

    // Experiments
    state.cars = setupAIs();

    // Game ender of the old layout, the worst brain of the best line
    const bestModel = [...state.sortedModels].sort(
      (a, b) => (b && b[0] ? b[0].score : 0) - (a && a[0] ? a[0].score : 0),
    )[0];
    deathCarModel =
      bestModel && bestModel[bestModel.length - 1]
        ? bestModel[bestModel.length - 1]
        : undefined;
    if (deathCarModel && deathCarModel.levels?.length) {
      deathCarLayer = deathCarModel.levels.length;
      const spawn = circuit.getSpawn();
      const player = new Car(
        spawn.x,
        spawn.y,
        spawn.angle,
        ControlType.KEYS,
        3,
        '🎥 Camera',
        getColorScale(deathCarLayer / config.MAX_NETWORK_LAYERS),
        deathCarLayer,
      );
      console.log(`Death car is layer ${deathCarLayer}`);
      player.brain.mutationFactor = 0;
      player.brain.mutationIndex = 0;
      try {
        player.brain.mutate(deathCarModel);
        state.cars.push(player);
        state.player = player;
      } catch (err) {
        // an old save with a different sensor count would otherwise kill the run
        console.error(
          `Death car model does not fit the current sensors, skipping it.\nReset data with ${location.href}&clear=true`,
          err.message,
        );
      }
    }

    state.population = state.cars.length;
    state.living = state.cars.length;
  }

  /**
   * Car the camera and the visualizer follow: the best alive car of the
   * `follow` category (0 any car, 1-9 that layer, space a mixed brain).
   * When the leader dies the next best alive car takes over, and a whole
   * dead category falls back to the best alive car overall.
   */
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

  function endExperiment() {
    if (state.playing) {
      const finalSort = state.sortedCars.filter((c) => c.useAI);
      io.saveBestModels(
        finalSort.map((c) => c.brain),
        7,
      );
      state.playing = false;
      setTimeout(initialize, 1500);
    }
  }
};
