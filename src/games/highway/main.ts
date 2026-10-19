import {
  expertSlotIds,
  hydrateExperts,
  MIXED_KIND,
  MIXED_LEVELS,
  MixedNetwork,
} from '../../ai/Mixed';
import { loadBaseModels, makeSubmitChecker } from '../../ai/serverSync';
import { fileUtilities, networkLevelSizes } from '../../ai/utils';
import { NeuralNetwork } from '../../ai/Network';
import { Visualizer } from '../../ai/v2/Visualizer';
import { layerColor } from '../../utilities/ai/colors';
import { contrastText, getColorScale } from '../../utilities/colors';
import { drawGamepadControls } from '../../utilities/driveIndicators';
import {
  bindSidePanelToggle,
  createCanvas,
  createCollapsibleSection,
  createFrameMeter,
  createUpdateLimiter,
  resizeCanvas,
} from '../../utilities/dom';
import { bindFollowKeys } from '../../utilities/followKeys';
import { createGroupActions } from '../../utilities/groupActions';
import { createScoreBoard } from '../../utilities/scoreBoard';
import { bestSavedModelScore } from '../../utilities/scoreRecords';
import {
  loadTrainFroms,
  saveTrainFrom,
  studentLabel,
} from '../../utilities/trainFrom';
import { lerp } from '../../utilities/math';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Car } from './classes/Car';
import { config } from './classes/Config';
import { DeathRay } from './classes/DeathRay';
import { Road } from './classes/Road';
import { ControlType } from './types';
import { defaultState, mixedColor, scoreEntries } from './utilities';

const neuralVisualizer = new Visualizer(config);

const io = fileUtilities('highway', makeSubmitChecker('highway'));
if (config.CLEAR_STORAGE) io.discardModels();
io.compactSaves();

/** the panel takes that share of the screen while open, capped in width */
const PANEL_RATIO = 0.75;
const PANEL_MAX_WIDTH = 800;

export default async (state: typeof defaultState) => {
  // the stage overlays the canvas; the narrow road strip centers inside it,
  // and everything else tracks the canvas edges instead of the viewport
  const stage = document.querySelector<HTMLDivElement>('.game-stage')!;
  const carCanvas = createCanvas();
  carCanvas.style.display = 'block';
  carCanvas.style.marginInline = 'auto';
  stage.appendChild(carCanvas);
  const networkCanvas = createCanvas();
  networkCanvas.className = 'neural-canvas';

  const carCtx = carCanvas.getContext('2d');
  const networkCtx = networkCanvas.getContext('2d');

  carCanvas.width = 200;

  /** 0 follows the best score overall, 1-9 the best car of that brain layer */
  let follow: number | 'mixed' = 0;
  /** world y mapped to the follow line, it lerps so target switches animate */
  let camY = 0;
  let camSet = false;

  const panel = document.createElement('aside');
  panel.className = 'side-panel';
  panel.style.width = `${PANEL_RATIO * 100}%`;
  panel.style.maxWidth = `${PANEL_MAX_WIDTH}px`;
  let panelOpen = false;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'side-panel-toggle';
  toggleBtn.textContent = '❮';
  toggleBtn.setAttribute('title', 'F12 to toggle');
  toggleBtn.setAttribute('aria-label', 'Toggle models panel');

  const followKeys = document.createElement('div');
  followKeys.className = 'follow-keys';
  const followLabel = document.createElement('span');
  followLabel.textContent = 'Follow';

  const setFollow = (value: number | 'mixed') => {
    follow = value;
    followKeys.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.follow === String(value));
    });
    groupPanel.apply(value);
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

  // distillation targets: which group each group imitates, per group key
  const trainFroms = new Map<string, number | 'mixed'>();
  for (const [student, target] of loadTrainFroms('highway'))
    trainFroms.set(String(student), target);
  const groupKeyOf = (car: Car): number | 'mixed' =>
    car.brain instanceof MixedNetwork ? 'mixed' : car.brainLayers;
  // the expert library the mixed selector routes to, rehydrated on every load
  let mixedExperts: NeuralNetwork[] = [];
  // champions loaded from the saves are plain data with no methods; the
  // teacher must drive, so a raw one is hydrated once per saved brain
  const championCaches = new Map<
    number | 'mixed',
    { champion: object; brain: NeuralNetwork }
  >();
  /** the champion of a group: its best saved brain, null while it has none */
  const championOf = (value: number | 'mixed'): NeuralNetwork | null => {
    const saved =
      value === 'mixed'
        ? (state.sortedMixed[MIXED_LEVELS]?.[0] ?? null)
        : (state.sortedModels[value]?.[0] ?? null);
    if (!saved) return null;
    if (typeof (saved as NeuralNetwork).process === 'function')
      return saved as NeuralNetwork;
    const cached = championCaches.get(value);
    if (cached?.champion === saved) return cached.brain;
    const brain =
      value === 'mixed'
        ? MixedNetwork.fromSave(saved, config.SENSORS + 1, 4, mixedExperts, {
            hiddenNodes: config.MIXED_HIDDEN_NODES,
          })
        : NeuralNetwork.hydrate(saved);
    if (!brain) return null;
    championCaches.set(value, { champion: saved, brain });
    return brain;
  };

  /** true while the group is teacher-driven: its run is disqualified from
   *  saves and its score is frozen by the car itself */
  const isDistilling = (value: number | 'mixed'): boolean =>
    trainFroms.has(String(value));

  /**
   * The end of a run: every distillation selection goes back to free training,
   * together with the persisted choice, so the next run measures the student
   * itself rather than its teacher.
   */
  const endDistillRuns = (): void => {
    for (const value of [...trainFroms.keys()]) {
      const student: number | 'mixed' =
        value === 'mixed' ? 'mixed' : Number(value);
      saveTrainFrom('highway', student, null);
    }
    trainFroms.clear();
  };

  // group actions + trainer readouts, shown while a brain group is followed
  const groupPanel = createGroupActions({
    game: 'highway',
    io,
    label: (v) => (v === 'mixed' ? 'the mixed brain' : `brain ${v}`),
    seedBest: (key) => bestSavedModelScore(key),
    globalBest: (key) => bestSavedModelScore(key),
    resetLocal: resetBrainSaves,
    reinitialize: () => initialize(),
    groups: [1, 2, 3, 4, 5, 6, 7, 8, 9, 'mixed'],
    trainFrom: (value) => trainFroms.get(String(value)) ?? null,
    setTrainFrom: (value, target) => {
      if (target !== null && value === target) return false;
      if (target === null) trainFroms.delete(String(value));
      else trainFroms.set(String(value), target);
      saveTrainFrom('highway', value, target);
      // a training run fields a single student car, so the run restarts with
      // that one car instead of leaving the group's swarm on the teacher
      initialize();
      return true;
    },
    teacherScore: (v) => {
      const target = trainFroms.get(String(v));
      if (target === undefined) return null;
      return championOf(target)?.score ?? null;
    },
  });

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
      ['mixed', 'mixed'],
    ] as [string, number | 'mixed'][]
  ).forEach(([label, value]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.follow = String(value);
    btn.title = 'Click to follow';
    const color =
      value === 'mixed'
        ? config.MIXED_COLOR
        : value === 0
          ? undefined
          : layerColor(value, config.MAX_NETWORK_LAYERS);
    if (color) {
      btn.style.setProperty('--btn-color', color);
      // black or white, whichever keeps the higher contrast on the car color
      btn.style.setProperty('--btn-text', contrastText(color));
    }
    followKeys.append(btn);
    followBtns.set(btn, { key: String(value) });
    btn.onclick = () => setFollow(value);
  });
  setFollow(0);
  // unified follow shortcuts: 1-9 a brain group, 0 the overall leader,
  // backquote the mixed brain
  bindFollowKeys({
    digit: (layer) => setFollow(layer),
    all: () => setFollow(0),
    mixed: () => setFollow('mixed'),
  });

  // the brain preview lives in the panel at a fixed 4:3 shape
  const netWrap = document.createElement('div');
  netWrap.style.aspectRatio = '4 / 3';
  netWrap.style.flex = '0 0 auto';
  netWrap.style.position = 'relative';
  networkCanvas.style.position = 'absolute';
  networkCanvas.style.left = '0';
  networkCanvas.style.top = '0';
  netWrap.append(networkCanvas);

  const legend = document.createElement('div');
  legend.className = 'side-panel-legend';
  [
    'Score board',
    '👶 first generation',
    '🎓 car is being trained by another brain group (one student, score disqualified)',
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

  const frameMeter = createFrameMeter();

  const panelContent = document.createElement('div');
  panelContent.className = 'side-panel-content';
  panelContent.append(
    followKeys,
    groupPanel.el,
    netWrap,
    createCollapsibleSection(legend),
  );

  panel.append(toggleBtn, panelContent);
  document.body.appendChild(panel);

  const togglePanel = () => {
    panelOpen = panel.classList.toggle('open');
    toggleBtn.textContent = panelOpen ? '❯' : '❮';
    groupPanel.setOpen(panelOpen);
  };
  toggleBtn.onclick = togglePanel;
  // F12 or L open the panel like the tab button does
  bindSidePanelToggle(togglePanel);

  const scoreBoard = createScoreBoard();
  stage.appendChild(scoreBoard.el);

  // the frame counter anchors to the stage, not the panel
  stage.appendChild(frameMeter.el);

  // The output box mimics the followed car, display only, and brainStats
  // carries its network / mutation / score readout.
  const steerOverlay = document.createElement('div');
  steerOverlay.className = 'steer-overlay hidden';
  const controlIndicators = document.createElement('div');
  controlIndicators.className = 'control-indicators';
  const controlCanvas = document.createElement('canvas');
  controlCanvas.className = 'control-axis';
  controlCanvas.width = 110;
  controlCanvas.height = 110;
  const controlCtx = controlCanvas.getContext('2d');
  controlIndicators.append(controlCanvas);
  const readout = document.createElement('div');
  readout.className = 'readout';
  const speedEl = document.createElement('div');
  speedEl.className = 'laps';
  speedEl.title = 'followed car speed';
  const brainStats = document.createElement('div');
  brainStats.className = 'brain-stats';
  brainStats.title = 'followed car brain stats';
  readout.append(speedEl, brainStats);
  steerOverlay.append(controlIndicators, readout);
  stage.appendChild(steerOverlay);
  let lastStatsHtml = '';

  const lanes = Math.round(carCanvas.width / 75);
  const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, lanes);

  const loop = new GameLoop();
  const shouldUpdateDom = createUpdateLimiter(20);
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

      const savedModel = state.sortedModels[l]?.[0] ?? undefined;

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

      let isSaveCompatible = true;

      // a teacher-driven run needs a single student car, nothing more
      const distilling = isDistilling(l);
      const slots = distilling ? 1 : carsNbForThisLayer + 1;

      for (let i = 0; i < slots; i++) {
        const car = new Car(
          road.getLane(1),
          100,
          ControlType.AI,
          3,
          studentLabel(`${l} - 0 👶`, distilling),
          layerColor(l, config.MAX_NETWORK_LAYERS),
          l,
        );
        if (savedModel && car.brain) {
          car.brain.mutationIndex = i;

          car.brain.mutationFactor = (i / carsNbForThisLayer) * mutationTarget;

          try {
            if (isSaveCompatible) car.brain.mutate(savedModel);
          } catch {
            // the saved brain no longer fits the current sensors: this car
            // keeps the constructor's random brain and starts fresh
            isSaveCompatible = false;
          }

          car.label = studentLabel([l, i].join('-'), distilling);
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

    if (experts.length < config.MIXED_MIN_EXPERTS) return;

    const savedModel = state.sortedMixed[MIXED_LEVELS]?.[0];
    const divider = (savedModel?.version > 10 ? savedModel.version : 10) / 10;
    const mutationTarget = config.MIXED_MAX_MUTATION_LVL / divider;

    let isSaveCompatible = true;
    const carsNb = Math.max(config.MIXED_CARS, config.MIXED_MIN_CARS);

    // a teacher-driven run needs a single student car, nothing more
    const distilling = isDistilling('mixed');
    const slots = distilling ? 1 : carsNb + 1;

    for (let i = 0; i < slots; i++) {
      const car = new Car(
        road.getLane(1),
        100,
        ControlType.AI,
        3,
        studentLabel('0 👶', distilling),
        config.MIXED_COLOR,
        MIXED_LEVELS,
        (inputCount, outputCount) =>
          new MixedNetwork(inputCount, outputCount, experts, {
            hiddenNodes: config.MIXED_HIDDEN_NODES,
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

        car.label = studentLabel(`${i}`, distilling);
      }

      cars.push(car);
    }
  }
  // Base models: server only, written to localStorage. onlyMissing so a
  // visitor's own training is never overwritten; imported brains are picked
  // up by the re-initialize.
  void (async () => {
    try {
      const { written } = await loadBaseModels('highway', io, true);
      if (written.length) {
        console.info(`Loaded base models: ${written.join(', ')}`);
        initialize();
      }
    } catch (err) {
      console.warn('Unable to load base highway models', err);
    }
  })();
  initialize();
  // paint the button states before the first frame, they load with their colors
  updateFollowButtons();

  loop.play((_es, _dt) => {
    const now = performance.now();
    frameMeter.tick(now);
    ray.update();
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].update(road.borders, noTraffic, deathRays);
    }
    for (let i = 0; i < state.cars.length; i++) {
      const car = state.cars[i];
      const alive = !car.damaged;
      // distillation: the teacher drives the car, the own brain backpropagates
      const target = car.useAI
        ? trainFroms.get(String(groupKeyOf(car)))
        : undefined;
      car.teacher = target === undefined ? null : championOf(target);
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
    const domUpdateDue = shouldUpdateDom(now);
    if (domUpdateDue) updateFollowButtons();

    resizeCanvas(carCanvas, carCtx, carCanvas.width, window.innerHeight);
    if (panelOpen)
      resizeCanvas(
        networkCanvas,
        networkCtx,
        netWrap.clientWidth,
        netWrap.clientHeight,
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
    carCtx.save();
    carCtx.translate(0, -camY + carCanvas.height * 0.7);

    road.draw(carCtx);
    ray.draw(carCtx);
    if (state.player) {
      carRay.y = state.player.y + state.player.height * 10;
      carRay.draw(carCtx);
    }
    // the camera shows world Y in [camY - 0.7h, camY + 0.3h]; cars fully
    // outside it cost a transform and a blit for nothing
    const cullMargin = 60;
    const carViewMinY = camY - carCanvas.height * 0.7 - cullMargin;
    const carViewMaxY = camY + carCanvas.height * 0.3 + cullMargin;
    for (let i = 0; i < state.traffic.length; i++) {
      const traffic = state.traffic[i];
      if (traffic.aabb.maxY < carViewMinY || traffic.aabb.minY > carViewMaxY)
        continue;
      traffic.draw(carCtx);
    }
    for (let i = 0; i < state.cars.length; i++) {
      const car = state.cars[i];
      if (
        i !== 0 &&
        (car.aabb.maxY < carViewMinY || car.aabb.minY > carViewMaxY)
      )
        continue;
      carCtx.globalAlpha = i === 0 || !car.useAI ? 1 : 0.3;
      car.draw(carCtx, i === 0);
    }

    carCtx.restore();

    // HUDs: the scoreboard floats at the stage's left edge, the cockpit mimics
    // the followed car; both only touch the DOM on a HUD tick.
    if (domUpdateDue) {
      scoreBoard.update(
        {
          text: `${state.living}/${state.sortedCars.length} cars`,
          color: getColorScale(
            state.sortedCars.length
              ? state.living / state.sortedCars.length
              : 0,
          ),
        },
        scoreEntries(state),
      );
      steerOverlay.style.setProperty(
        '--hud-color',
        camTarget?.color || '#c4c4c4',
      );
      steerOverlay.classList.toggle('hidden', !camTarget);
    }
    if (camTarget) {
      const c = camTarget.controls;
      if (controlCtx)
        drawGamepadControls(controlCtx, {
          x: c.right - c.left,
          y: c.forward - c.reverse,
          color: camTarget.color,
        });
      if (domUpdateDue) updateBrainStats(camTarget);
    }

    const followed = camTarget?.brain;
    if (followed) {
      neuralVisualizer.renderNetwork(networkCtx, followed);
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
    championCaches.clear();
    const inputCount = config.SENSORS + 1;
    const outputCount = 4;
    state.sortedModels = io.loadAllModelLayers(
      config.MAX_NETWORK_LAYERS,
      undefined,
      (layers) => ({
        levelSizes: networkLevelSizes(inputCount, outputCount, layers),
      }),
    );

    // Mixed selectors route to the exact expert library loaded above. Validate
    // that library-dependent shape before the mixed save can enter a pool.
    mixedExperts = hydrateExperts(
      state.sortedModels,
      inputCount,
      outputCount,
      config.MIXED_EXPERTS_PER_LAYER,
    );
    state.sortedMixed = io.loadAllModelLayers(MIXED_LEVELS, MIXED_KIND, () => ({
      levelSizes: [inputCount, config.MIXED_HIDDEN_NODES, mixedExperts.length],
      kind: MIXED_KIND,
      requireKind: true,
      expertIds: expertSlotIds(mixedExperts),
    }));

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
          name || `${index}`,
        ),
    );

    // Experiments
    state.cars = setupAIs();
    const [bestModel] = [...state.sortedModels].sort(
      (a, b) => (b[0] ? b[0].score : 0) - (a[0] ? a[0].score : 0),
    );
    const deathCarModel = bestModel?.[bestModel.length - 1];
    if (deathCarModel) {
      const bestLayerNb = deathCarModel.levels.length;
      state.player = new Car(
        road.getLane(1),
        100,
        ControlType.KEYS,
        3,
        '🎥 Camera',
        layerColor(bestLayerNb, config.MAX_NETWORK_LAYERS),
        bestLayerNb,
      );
      state.player.brain.mutationFactor = 0;
      state.player.brain.mutationIndex = 0;
      try {
        state.player.brain.mutate(deathCarModel);
        state.cars.push(state.player);
      } catch {
        // an old save with a different sensor count would otherwise kill the
        // run: the death car is skipped and the run continues without it
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

  /** Rebuild the inline stats block of the followed car; the DOM is only
   *  touched when the rendered text changes, so a steady frame is cheap. */
  function updateBrainStats(car: Car) {
    const brain = car.brain;
    const mixed = brain instanceof MixedNetwork;
    const mutation =
      brain.mutationIndex === 0
        ? 'Original model'
        : `Mut ${(brain.mutationFactor * 100).toFixed(4)}%`;
    const lines = [
      `${mixed ? '🧭 Mixed ' : ''}Net ${brain.levels.length}-${brain.version}`,
      `Idx ${brain.mutationIndex}`,
      mutation,
      `Score ${Math.round(brain.score)}`,
    ];
    speedEl.textContent = `Speed ${car.speed.toFixed(2)}`;
    const html = lines.map((line) => `<span>${line}</span>`).join('');
    if (html !== lastStatsHtml) {
      lastStatsHtml = html;
      brainStats.innerHTML = html;
    }
  }

  function endExperiment() {
    if (state.playing) {
      // teacher-driven cars are disqualified: saving them would only store the
      // teacher's behavior under the student's name
      const finalSort = state.sortedCars.filter(
        (c) => c.useAI && !isDistilling(groupKeyOf(c)),
      );
      io.saveBestModels(
        finalSort.map((c) => c.brain),
        7,
      );
      // the run is over: back to free training for every group
      endDistillRuns();
      state.playing = false;
      setTimeout(initialize, 1500);
    }
  }
};
