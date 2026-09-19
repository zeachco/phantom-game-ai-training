import { downloadModelArchive, pickModelArchive } from '../../ai/modelTransfer';
import {
  expertSlotIds,
  hydrateExperts,
  MIXED_KIND,
  MIXED_LEVELS,
  MixedNetwork,
} from '../../ai/Mixed';
import { fileUtilities } from '../../ai/utils';
import { Visualizer } from '../../ai/v2/Visualizer';
import { contrastText, getColorScale } from '../../utilities/colors';
import { createCanvas, resizeCanvas } from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { lerp } from '../../utilities/math';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Car } from './classes/Car';
import { config } from './classes/Config';
import { DeathRay } from './classes/DeathRay';
import { Road } from './classes/Road';
import { ControlType } from './types';
import { defaultState, drawScores, mixedColor } from './utilities';

const neuralVisualizer = new Visualizer(config);

const io = fileUtilities('highway');
if (config.CLEAR_STORAGE) io.discardModels();

export default async (state: typeof defaultState) => {
  const carCanvas = createCanvas();
  const networkCanvas = createCanvas();
  networkCanvas.className = 'neural-canvas';

  const carCtx = carCanvas.getContext('2d');
  const networkCtx = networkCanvas.getContext('2d');

  carCanvas.width = 200;

  const followPad = new GamePad(new Map());
  /** 0 follows the best score overall, 1-9 the best car of that brain layer */
  let follow: number | 'mixed' = 0;
  /** world y mapped to the follow line, it lerps so target switches animate */
  let camY = 0;
  let camSet = false;

  const panel = document.createElement('aside');
  panel.className = 'side-panel open';

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
  const presetBtn = document.createElement('button');
  presetBtn.className = 'model-btn';
  presetBtn.textContent = 'Load pre-trained';
  const clearBtn = document.createElement('button');
  clearBtn.className = 'model-btn';
  clearBtn.textContent = 'Clear training';
  loadBtn.onclick = async () => {
    try {
      const archive = await pickModelArchive();
      if (archive.game && archive.game !== 'highway') {
        alert(`This archive is for \`${archive.game}\`, not "highway"`);
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
  saveBtn.onclick = () => downloadModelArchive('highway');
  presetBtn.onclick = async () => {
    try {
      presetBtn.disabled = true;
      presetBtn.textContent = 'Loading preset…';
      const res = await fetch(
        new URL('./presets/highway_models_2026091612022.json', import.meta.url),
      );
      if (!res.ok) throw new Error(`Preset not found (${res.status})`);
      const archive = await res.json();
      if (archive.game && archive.game !== 'highway') {
        alert(`This preset is for "${archive.game}", not "highway"`);
        return;
      }
      const written = io.importModels(archive.models);
      if (!written.length) {
        alert('No compatible model in this preset');
        return;
      }
      console.info(`Loaded pre-trained models: ${written.join(', ')}`);
      initialize();
    } catch (err) {
      alert((err && err.message) || 'Unable to load pre-trained preset');
    } finally {
      presetBtn.disabled = false;
      presetBtn.textContent = 'Load pre-trained';
    }
  };
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
      if (!confirm('Reset all the saved highway weights?')) return;
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

  const legend = document.createElement('div');
  legend.className = 'side-panel-legend';
  [
    'Score board',
    '👶 first generation',
    '💀 car has crashed',
    '🏆 car has crashed with a higher score',
    '💜 car is racing',
    '💚 car is besting the best score',
    '👻 ghost car from a previous generation',
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
    presetBtn,
    clearBtn,
    followKeys,
    statsBtn,
    legend,
    footer,
  );

  panel.append(toggleBtn, panelContent);
  document.body.appendChild(panel);

  toggleBtn.onclick = () => {
    const open = panel.classList.toggle('open');
    toggleBtn.textContent = open ? '❯' : '❮';
  };

  const lanes = Math.round(carCanvas.width / 75);
  const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, lanes);

  const loop = new GameLoop();
  let ray: DeathRay;
  let carRay: DeathRay;
  let deathRays: DeathRay[];
  const noTraffic: Car[] = [];

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
      const scoreRatio = scoreAdvantage / advantage;

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

      for (let i = 0; i <= carsNbForThisLayer; i++) {
        const car = new Car(
          road.getLane(1),
          100,
          ControlType.AI,
          3,
          `${l} - 0 👶`,
          getColorScale(l / config.MAX_NETWORK_LAYERS),
          l,
        );
        if (savedModel && car.brain) {
          car.brain.mutationIndex = i;

          car.brain.mutationFactor = (i / carsNbForThisLayer) * mutationTarget;

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

    const inputNb = config.SENSORS + 1;
    const outputNb = 4;
    const experts = hydrateExperts(
      state.sortedModels,
      inputNb,
      outputNb,
      config.MIXED_EXPERTS_PER_LAYER,
    );

    if (experts.length < config.MIXED_MIN_EXPERTS) {
      console.debug(
        `🧭 Mixed brain needs ${config.MIXED_MIN_EXPERTS} trained brains, ${experts.length} available`,
      );
      return;
    }

    const savedModel = state.sortedMixed[MIXED_LEVELS]?.[0];
    const divider = (savedModel?.version > 10 ? savedModel.version : 10) / 10;
    const mutationTarget = config.MIXED_MAX_MUTATION_LVL / divider;

    console.debug(
      `🧭 Gen-${savedModel?.version ?? 0} Mutation ${
        Math.round(mutationTarget * config.MIXED_MUTATION_BOOST * 10000) / 100
      }% | ${experts.length} experts: ${expertSlotIds(experts).join(', ')}`,
    );

    let isSaveCompatible = true;
    const carsNb = Math.max(config.MIXED_CARS, config.MIXED_MIN_CARS);

    for (let i = 0; i <= carsNb; i++) {
      const car = new Car(
        road.getLane(1),
        100,
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
    ray.update();
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].update(road.borders, noTraffic, deathRays);
    }
    for (let i = 0; i < state.cars.length; i++) {
      const car = state.cars[i];
      const alive = !car.damaged;
      car.update(road.borders, state.traffic, deathRays);
      if (alive && performance.now() - car.bornAt > config.CAR_LIFETIME_CAP) {
        car.damaged = true;
      }
      const brain = car.brain;
      if (brain instanceof MixedNetwork) {
        car.setColor(mixedColor(brain));
      }
      if (car.y > ray.y || car.y > carRay.y) {
        car.damaged = true;
      }
      if (alive && car.damaged) {
        state.living--;
      }
    }
    state.sortedCars = state.cars.sort((a, b) => b.brain.score - a.brain.score);
    updateFollowButtons();

    resizeCanvas(carCanvas, carCtx, carCanvas.width, window.innerHeight);
    resizeCanvas(
      networkCanvas,
      networkCtx,
      window.innerWidth - carCanvas.width,
      window.innerHeight,
    );

    const camTarget = followedCar();
    if (camTarget) {
      if (!camSet) {
        camY = camTarget.y;
        camSet = true;
      }
      // lead the target by 2 frames of travel so the 10% lerp stays centered
      camY +=
        (camTarget.y - 2 * camTarget.speed * Math.cos(camTarget.angle) - camY) *
        0.1;
    }
    state.camY = camY;
    carCtx.save();
    carCtx.translate(0, -camY + carCanvas.height * 0.7);

    road.draw(carCtx);
    ray.draw(carCtx);
    if (state.player) {
      carRay.y = state.player.y + state.player.height * 10;
      carRay.draw(carCtx);
    }
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].draw(carCtx);
    }
    for (let i = 0; i < state.cars.length; i++) {
      const car = state.cars[i];
      carCtx.globalAlpha = i === 0 || !car.useAI ? 1 : 0.3;
      car.draw(carCtx, i === 0);
    }

    carCtx.restore();

    drawScores(state, carCtx);

    const followed = camTarget?.brain;
    if (followed) {
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
      carCtx.fillText(`GAME OVER`, carCanvas.width / 2, carCanvas.height / 2);
      carCtx.strokeText(`GAME OVER`, carCanvas.width / 2, carCanvas.height / 2);
    }

    if (!state.living) endExperiment();
  });
  function initialize() {
    Object.assign(state, defaultState);
    state.playing = true;
    camSet = false;
    state.sortedModels = io.loadAllModelLayers(config.MAX_NETWORK_LAYERS);
    state.sortedMixed = io.loadAllModelLayers(MIXED_LEVELS, MIXED_KIND);

    // Game ender
    ray = new DeathRay();
    carRay = new DeathRay();
    deathRays = [ray, carRay];

    // Obstacles
    state.traffic = config.trafficConfig.map(
      ([lane, y, speed, name], index) =>
        new Car(
          road.getLane(lane),
          y,
          ControlType.DUMMY,
          speed,
          name || index + '',
        ),
    );

    // Experiments
    state.cars = setupAIs();
    const [bestModel] = [...state.sortedModels].sort(
      (a, b) => (b[0] ? b[0].score : 0) - (a[0] ? a[0].score : 0),
    );
    const deathCarModel = bestModel[bestModel.length - 1];
    if (deathCarModel) {
      const bestLayerNb = deathCarModel.levels.length;
      state.player = new Car(
        road.getLane(1),
        100,
        ControlType.KEYS,
        3,
        '🎥 Camera',
        getColorScale(bestLayerNb / config.MAX_NETWORK_LAYERS),
        bestLayerNb,
      );
      console.log(`Death car is layer ${bestLayerNb}`);
      state.player.brain.mutationFactor = 0;
      state.player.brain.mutationIndex = 0;
      try {
        state.player.brain.mutate(deathCarModel);
        state.cars.push(state.player);
      } catch (err) {
        // an old save with a different sensor count would otherwise kill the run
        console.error(
          `Death car model does not fit the current sensors, skipping it.\nReset data with ${location.href}&clear=true`,
          err.message,
        );
        state.player = undefined;
      }
    }
    state.living = state.cars.length;
  }

  /**
   * Car the camera and the visualizer follow: the best alive car of the
   * `follow` category (space any car, 0 a mixed brain, 1-9 that layer).
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
