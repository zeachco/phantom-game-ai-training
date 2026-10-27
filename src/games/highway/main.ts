import {
  expertSlotIds,
  hydrateExperts,
  MIXED_KIND,
  MIXED_LEVELS,
  MixedNetwork,
} from '../../ai/Mixed';
import { loadBaseModelsThen, makeSubmitChecker } from '../../ai/serverSync';
import { brainIoMatches } from '../../ai/distill';
import { fileUtilities, networkLevelSizes } from '../../ai/utils';
import { NeuralNetwork } from '../../ai/Network';
import { Visualizer } from '../../ai/v2/Visualizer';
import { createAdaptiveDrawBudget } from '../../utilities/adaptiveDraw';
import { layerColor } from '../../utilities/ai/colors';
import { getColorScale } from '../../utilities/colors';
import { createCockpit } from '../../utilities/cockpit';
import { drawGamepadControls } from '../../utilities/driveIndicators';
import {
  createCanvas,
  createFrameMeter,
  createLegend,
  createUpdateLimiter,
  resizeCanvas,
} from '../../utilities/dom';
import { createScoreBoard } from '../../utilities/scoreBoard';
import type { GroupActionsOptions } from '../../utilities/groupActions';
import { makeResetBrainSaves } from '../../utilities/resetBrainSaves';
import { createSidePanel } from '../../utilities/sidePanel';
import { brainKey } from '../../utilities/groupScores';
import { bestSavedModelScore } from '../../utilities/scoreRecords';
import {
  loadTrainFroms,
  saveTrainFrom,
  studentLabel,
  trainedBrain,
  withTrainedBrain,
} from '../../utilities/trainFrom';
import { lerp } from '../../utilities/math';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Car } from './classes/Car';
import { config } from './classes/Config';
import { DeathRay } from './classes/DeathRay';
import { Road } from './classes/Road';
import { ControlType } from './types';
import { defaultState, mixedColor, scoreEntries } from './utilities';
import { gameNow } from '../../utilities/gameClock';

const neuralVisualizer = new Visualizer(config);

const checkHighwayModel = makeSubmitChecker('highway');
const io = fileUtilities('highway', checkHighwayModel);
if (config.CLEAR_STORAGE) io.discardModels();
io.compactSaves();

export default async (state: typeof defaultState) => {
  // the stage overlays the canvas; the narrow road strip centers inside it,
  // and everything else tracks the canvas edges instead of the viewport
  const stage = document.querySelector<HTMLDivElement>('.game-stage')!;
  const carCanvas = createCanvas();
  carCanvas.style.display = 'block';
  carCanvas.style.marginInline = 'auto';
  stage.appendChild(carCanvas);
  const carCtx = carCanvas.getContext('2d');

  carCanvas.width = 200;

  /** 0 follows the best score overall, 1-9 the best car of that brain layer */
  let follow: number | 'mixed' = 0;
  /** world y mapped to the follow line, it lerps so target switches animate */
  let camY = 0;
  let camSet = false;

  const resetBrainSaves = makeResetBrainSaves({
    io,
    game: 'highway',
    mixedLabel: 'the mixed brain',
    layerLabel: (layer) => `brain ${layer}`,
    onReset: (value) => {
      console.info(
        `Reset saved weights of ${value === 0 ? 'all brains' : value}`,
      );
      initialize();
    },
  });

  // distillation targets: which group each group imitates, per group key
  const trainFroms = new Map<string, number | 'mixed'>();
  const learningOnlyGroups = new Set<string>();
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
        ? state.sortedMixed[MIXED_LEVELS]?.[0] ?? null
        : state.sortedModels[value]?.[0] ?? null;
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
    // train-from only needs matching inputs and outputs: any depth or kind is
    // fine, but a mismatched brain would teach a different function
    if (!brainIoMatches(brain, config.SENSORS + 1, 4)) return null;
    championCaches.set(value, { champion: saved, brain });
    return brain;
  };

  /** true while the group is teacher-driven: its run is disqualified from
   *  saves and its score is frozen by the car itself */
  const isDistilling = (value: number | 'mixed'): boolean =>
    trainFroms.has(String(value)) || learningOnlyGroups.has(String(value));

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
    learningOnlyGroups.clear();
  };

  // the group of the brain the visualizer is drawing; the "all" readouts
  // report on it
  let displayedGroup: number | 'mixed' | null = null;

  // group actions + trainer readouts, shown while a brain group is followed
  const groupActions: GroupActionsOptions = {
    game: 'highway',
    io,
    label: (v) => (v === 'mixed' ? 'the mixed brain' : `brain ${v}`),
    groupColor: (v) =>
      v === 'mixed'
        ? config.MIXED_COLOR
        : layerColor(v, config.MAX_NETWORK_LAYERS),
    seedBest: (key) => bestSavedModelScore(key),
    globalBest: (key) => bestSavedModelScore(key),
    resetLocal: resetBrainSaves,
    reinitialize: () => initialize(),
    groups: [1, 2, 3, 4, 5, 6, 7, 8, 9, 'mixed'],
    trainFrom: (value) => trainFroms.get(String(value)) ?? null,
    setTrainFrom: (value, target) => {
      if (target !== null && value === target) return false;
      if (target === null) {
        const wasLearning = trainFroms.delete(String(value));
        if (wasLearning) learningOnlyGroups.add(String(value));
      } else {
        learningOnlyGroups.delete(String(value));
        trainFroms.set(String(value), target);
      }
      saveTrainFrom('highway', value, target);
      // Starting a guide run needs one student car; freeing it keeps that car
      // alive and disqualified until it dies under its own model.
      if (target !== null) initialize();
      return true;
    },
    teacherScore: (v) => {
      const target = trainFroms.get(String(v));
      if (target === undefined) return null;
      return championOf(target)?.score ?? null;
    },
    displayedGroup: () => displayedGroup,
  };

  const legend = createLegend([
    'Score board',
    '👶 first generation',
    '🎓 car is being trained by another brain group (one student, score disqualified)',
    '💀 car has crashed',
    '🏆 car has crashed with a higher score',
    '💜 car is racing',
    '💚 car is besting the best score',
    '👻 ghost car from a previous generation',
  ]);

  const frameMeter = createFrameMeter();
  const drawBudget = createAdaptiveDrawBudget(5);

  // the trainer aside: follow buttons, group actions and the brain preview
  const panel = createSidePanel({
    groupActions,
    content: legend,
    buttonColor: (v) =>
      v === 'mixed'
        ? config.MIXED_COLOR
        : v === 0
        ? undefined
        : layerColor(v, config.MAX_NETWORK_LAYERS),
    initialOpen: true,
    onFollow: (value) => {
      follow = value;
    },
  });
  document.body.appendChild(panel.el);

  const scoreBoard = createScoreBoard();
  stage.appendChild(scoreBoard.el);

  // the frame counter anchors to the stage, not the panel
  stage.appendChild(frameMeter.el);

  // The cockpit mimics the followed car, display only; the stats block
  // carries its network / mutation / score readout.
  const cockpit = createCockpit({ statsTitle: 'followed car brain stats' });
  const speedEl = document.createElement('div');
  speedEl.className = 'laps';
  speedEl.title = 'followed car speed';
  cockpit.readout.append(speedEl, cockpit.stats);
  stage.appendChild(cockpit.el);

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
  loadBaseModelsThen(
    'highway',
    io,
    () => initialize(),
    () => {
      // Existing saves do not trigger onSaved at boot. Once the latest server
      // scores are known, submit any local champion that beats its group
      // best.
      for (const [group, models] of Object.entries(io.exportModels()))
        checkHighwayModel(group, models);
    },
    true,
  );
  initialize();
  // paint the button states before the first frame, they load with their colors
  updateFollowButtons();

  loop.play((_es, _dt, paused) => {
    const now = gameNow();
    // the simulation freezes while paused, but the camera and the render
    // below keep updating on the frozen scene
    if (!paused) {
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
        car.distillRun =
          target !== undefined ||
          learningOnlyGroups.has(String(groupKeyOf(car)));
        car.update(road.borders, state.traffic, deathRays);
        if (alive && gameNow() - car.bornAt > config.CAR_LIFETIME_CAP) {
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
          const group = groupKeyOf(car);
          if (learningOnlyGroups.has(String(group))) keepTrainedBrain(car);
        }
      }
      state.sortedCars = state.cars.sort(
        (a, b) => b.brain.score - a.brain.score,
      );
    }
    const domUpdateDue = shouldUpdateDom(now);
    if (domUpdateDue) updateFollowButtons();

    resizeCanvas(carCanvas, carCtx, carCanvas.width, window.innerHeight);

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
    drawBudget.begin(state.cars.length);
    for (let i = 0; i < state.cars.length; i++) {
      const car = state.cars[i];
      const keep =
        car === camTarget ||
        car === state.player ||
        car.brain.mutationIndex === 0;
      if (
        !keep &&
        (car.aabb.maxY < carViewMinY ||
          car.aabb.minY > carViewMaxY ||
          !drawBudget.consume())
      )
        continue;
      carCtx.globalAlpha = i === 0 || !car.useAI ? 1 : 0.3;
      car.draw(carCtx, i === 0);
    }
    drawBudget.end();

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
      cockpit.show(camTarget ? camTarget.color : null);
    }
    if (camTarget) {
      const c = camTarget.controls;
      drawGamepadControls(cockpit.ctx, {
        x: c.right - c.left,
        y: c.forward - c.reverse,
        color: camTarget.color,
      });
      if (domUpdateDue) updateBrainStats(camTarget);
    }

    const followed = camTarget?.brain;
    if (panel.isOpen() && followed) {
      displayedGroup =
        followed instanceof MixedNetwork
          ? 'mixed'
          : camTarget?.brainLayers ?? null;
      // a distilling car shows its brain next to its teacher, with the live
      // training error on the controls
      neuralVisualizer.renderNetwork(
        panel.network().ctx,
        followed,
        camTarget?.teacher ?? null,
        camTarget?.distillErrors ?? null,
      );
    }
    // the loss graph follows the student's distiller, null outside a run
    panel.groupPanel.drawLossGraph(camTarget?.distiller?.lossHistory ?? null);
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

    if (!paused && !state.living) endExperiment();
  });
  function initialize() {
    // a re-init replaces the camera car, so drop its old keyboard bindings
    state.player?.controls.dispose();
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
    const running = new Set<string>();
    for (const car of state.cars) {
      if (car.damaged) continue;
      running.add(brainKey(car.brain, car.brainLayers));
    }
    panel.setRunning(running, state.living > 0);
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
    cockpit.setStats(lines);
  }

  /**
   * Hand a trained student's weights to the next generation: the brain becomes
   * the group's saved base model, so the next run mutates from what the
   * student learned, while preserving the score it had before training so the
   * trainee still has to beat that record in a normal run.
   */
  function keepTrainedBrain(car: Car) {
    // if no teacher ever drove the car nothing was distilled: the student's
    // weights are untrained and must not replace the group's champion
    if (!car.teacherFrames) return;
    const value = groupKeyOf(car);
    const saved =
      value === 'mixed'
        ? state.sortedMixed[MIXED_LEVELS] ?? []
        : state.sortedModels[value] ?? [];
    const trained = trainedBrain(car.brain, saved[0]?.score ?? 0);
    if (value === 'mixed') {
      state.sortedMixed[MIXED_LEVELS] = withTrainedBrain(saved, trained, 1);
      io.saveBestModels([trained], 1);
      return;
    }
    state.sortedModels[value] = withTrainedBrain(saved, trained, 7);
    io.saveModelList(value, state.sortedModels[value]);
  }

  function endExperiment() {
    if (state.playing) {
      // Teacher-driven cars carry their learned weights and score into the
      // next generation without competing in the normal save pass.
      const finalSort = state.sortedCars.filter((c) => c.useAI);
      const trained = finalSort.filter((c) => isDistilling(groupKeyOf(c)));
      io.saveBestModels(
        finalSort
          .filter((c) => !isDistilling(groupKeyOf(c)))
          .map((c) => c.brain),
        7,
      );
      for (const car of trained) keepTrainedBrain(car);
      // the run is over: back to free training for every group
      endDistillRuns();
      state.playing = false;
      setTimeout(initialize, 1500);
    }
  }
};
