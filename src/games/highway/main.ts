import { fileUtilities } from '../../ai/utils';
import { createCanvas } from '../../utilities/dom';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Car } from './classes/Car';
import { config } from './classes/Config';
import { Road } from './classes/Road';
import { ControlType } from './types';
import { DeathRay } from './classes/DeathRay';
import { defaultState, drawScores, orchestratorColor } from './utilities';
import { getColorScale } from '../../utilities/colors';
import { Visualizer } from '../../ai/v2/Visualizer';
import { lerp } from '../../utilities/math';
import {
  expertSlotIds,
  hydrateExperts,
  ORCHESTRATOR_KIND,
  ORCHESTRATOR_LEVELS,
  OrchestratorNetwork,
} from '../../ai/Orchestrator';

const neuralVisualizer = new Visualizer(config);

const io = fileUtilities('highway');
if (config.CLEAR_STORAGE) io.discardModels();

export default async (state: typeof defaultState) => {
  const carCanvas = createCanvas();
  const networkCanvas = createCanvas();

  const carCtx = carCanvas.getContext('2d');
  const networkCtx = networkCanvas.getContext('2d');

  carCanvas.width = 200;

  const lanes = Math.round(carCanvas.width / 75);
  const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, lanes);

  const loop = new GameLoop();
  let ray: DeathRay;
  let carRay: DeathRay;

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
      let savedModel =
        (state.sortedModels[l] && state.sortedModels[l][0]) ?? undefined;

      const layerOriginScore = savedModel?.score || 0;
      const scoreAdvantage = layerOriginScore - worstScore;
      const scoreRatio = scoreAdvantage / advantage;

      const carsNbForThisLayer = config.CARS_PER_LAYERS[l];

      const divider = (savedModel?.version > 10 ? savedModel?.version : 10) / 10;
      const mutationTarget = lerp(
        config.MIN_MUTATION_LVL,
        config.MAX_MUTATION_LVL,
        1 - scoreRatio,
      ) / divider;

      console.debug(
        `#${l} Gen-${savedModel?.version} Mutation ${Math.round(mutationTarget * 10000000) / 100000
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
              `Unable to mutate existing network #${car.brain.id}.\nReset data with ${location.href}&clear=true`,
              err.message,
            );
          }

          car.label = [l, i].join('-');
        }
        cars.push(car);
      }
    }

    setupOrchestrators(cars);

    return cars;
  }

  /**
   * Spawns the cars driven by an orchestrator: a shallow selector that reads the
   * same sensors and answers with one of the trained brains, which then drives
   * with those very inputs. Experts stay frozen, only the routing is trained.
   */
  function setupOrchestrators(cars: Car[]) {
    if (!config.ORCHESTRATOR_ENABLED) return;

    const inputNb = config.SENSORS + 1;
    const outputNb = 4;
    const experts = hydrateExperts(
      state.sortedModels,
      inputNb,
      outputNb,
      config.ORCHESTRATOR_EXPERTS_PER_LAYER,
    );

    if (experts.length < config.ORCHESTRATOR_MIN_EXPERTS) {
      console.debug(
        `🧭 Orchestrator needs ${config.ORCHESTRATOR_MIN_EXPERTS} trained brains, ${experts.length} available`,
      );
      return;
    }

    const savedModel = state.sortedOrchestrators[ORCHESTRATOR_LEVELS]?.[0];
    const divider = (savedModel?.version > 10 ? savedModel.version : 10) / 10;
    const mutationTarget = config.ORCHESTRATOR_MAX_MUTATION_LVL / divider;

    console.debug(
      `🧭 Gen-${savedModel?.version ?? 0} Mutation ${Math.round(mutationTarget * config.ORCHESTRATOR_MUTATION_BOOST * 10000) / 100
      }% | ${experts.length} experts: ${expertSlotIds(experts).join(', ')}`,
    );

    let isSaveCompatible = true;

    for (let i = 0; i <= config.ORCHESTRATOR_CARS; i++) {
      const car = new Car(
        road.getLane(1),
        100,
        ControlType.AI,
        3,
        `🧭 0 👶`,
        config.ORCHESTRATOR_COLOR,
        ORCHESTRATOR_LEVELS,
        (inputCount, outputCount) =>
          new OrchestratorNetwork(inputCount, outputCount, experts, {
            hiddenNodes: config.ORCHESTRATOR_HIDDEN_NODES,
            mutationBoost: config.ORCHESTRATOR_MUTATION_BOOST,
            resetChance: config.ORCHESTRATOR_RESET_CHANCE,
          }),
      );

      if (savedModel && car.brain) {
        car.brain.mutationIndex = i;
        car.brain.mutationFactor = (i / config.ORCHESTRATOR_CARS) * mutationTarget;

        try {
          if (isSaveCompatible) car.brain.mutate(savedModel);
        } catch (err) {
          isSaveCompatible = false;
          console.error(
            `Unable to mutate existing orchestrator #${car.brain.id}, starting over.`,
            err.message,
          );
        }

        car.label = `🧭 ${i}`;
      }

      cars.push(car);
    }
  }

  try {
    initialize();
  } catch (err) {
    throw err;
  }

  loop.play((_es, dt) => {
    ray.update();
    const deathRays = [ray, carRay];
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].update(road.borders, [], deathRays);
    }
    for (let i = 0; i < state.cars.length; i++) {
      state.cars[i].update(road.borders, state.traffic, deathRays);
      const brain = state.cars[i].brain;
      if (brain instanceof OrchestratorNetwork) {
        state.cars[i].setColor(orchestratorColor(brain));
      }
      const y = state.cars[i].y;
      if (y > ray.y || y > carRay.y) {
        state.cars[i].damaged = true;
      }
    }
    state.sortedCars = state.cars.sort((a, b) => b.brain.score - a.brain.score);
    state.livingCars = state.cars.filter((a) => !a.damaged);

    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;
    networkCanvas.width = window.innerWidth - carCanvas.width;

    carCtx.save();
    if (state.player && !state.player.damaged) {
      carCtx.translate(0, -state.player.y + carCanvas.height * 0.7);
    } else {
      carCtx.translate(0, -state.sortedCars[0].y + carCanvas.height * 0.7);
    }

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
      const isBest =
        state.sortedCars[0] === state.cars[i] || !state.cars[i].useAI;
      carCtx.globalAlpha = isBest ? 1 : 0.3;
      state.cars[i].draw(carCtx, i === 0, i);
    }

    carCtx.restore();

    drawScores(state, carCtx);

    networkCtx.lineDashOffset = -dt / 50;
    neuralVisualizer.render(networkCtx, state.sortedCars[0].brain!);
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
    if (!state.livingCars[0]) endExperiment();
  });
  function initialize() {
    Object.assign(state, defaultState);
    state.playing = true;
    state.sortedModels = io.loadAllModelLayers(config.MAX_NETWORK_LAYERS);
    state.sortedOrchestrators = io.loadAllModelLayers(
      ORCHESTRATOR_LEVELS,
      ORCHESTRATOR_KIND,
    );

    // Game ender
    ray = new DeathRay();
    carRay = new DeathRay();

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
      state.player.brain.mutate(deathCarModel);
      state.cars.push(state.player);
    }
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
