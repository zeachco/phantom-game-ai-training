import { fileUtilities } from '../../ai/utils';
import { Visualizer } from '../../ai/Visualizer';
import { createCanvas } from '../../utilities/dom';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Car } from './classes/Car';
import { config } from './classes/Config';
import { Road } from './classes/Road';
import { ControlType } from './types';
import { DeathRay } from './classes/DeathRay';
import { defaultState, drawScores } from './utilities';
import { getColorScale } from '../../utilities/colors';
import { NeuralNetwork } from '../../ai/Network';

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
    for (let l = 1; l <= config.MAX_NETWORK_LAYERS; l++) {
      let savedModel =
        (state.sortedModels[l] && state.sortedModels[l][0]) ?? undefined;

      const carsNbForThisLayer = config.CARS_PER_LAYERS[l];

      for (let i = 0; i <= carsNbForThisLayer; i++) {
        const car = new Car(
          road.getLane(1),
          100,
          ControlType.AI,
          3,
          `${l}-0 👶`,
          getColorScale(l / config.MAX_NETWORK_LAYERS),
          l,
        );
        if (savedModel && car.brain) {
          car.brain.mutationIndex = i;
          const mutationTarget = Math.min(
            config.MUTATION_LVL,
            (10000 / savedModel.score) * config.MUTATION_LVL,
          );
          car.brain.mutationFactor =
            i === 0 ? 0.000001 : (i / carsNbForThisLayer) * mutationTarget;

          car.brain.mutate(savedModel);
          car.label = [l, i].join('-');
        }
        cars.push(car);
      }
    }
    return cars;
  }

  try {
    initialize();
  } catch (err) {
    throw err;
  }

  loop.play((_es, dt) => {
    ray.update();
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].update(road.borders, []);
    }
    for (let i = 0; i < state.cars.length; i++) {
      state.cars[i].update(road.borders, state.traffic);
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
    if (state.player?.brain?.score > 0 && !state.player?.damaged) {
      carCtx.translate(0, -state.player.y + carCanvas.height * 0.7);
    } else {
      carCtx.translate(0, -state.sortedCars[0].y + carCanvas.height * 0.7);
    }

    road.draw(carCtx);
    ray.draw(carCtx);
    if (state.player) {
      carRay.y = state.player.y + state.player.height;
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
    Visualizer.drawNetwork(networkCtx, state.sortedCars[0].brain!);
    Visualizer.drawStats(networkCtx, state.sortedCars[0].brain!);
    const livingCarsWithMutations = state.livingCars.filter((c) => {
      return c.brain.mutationFactor > 0;
    });
    if (!livingCarsWithMutations[0]) endExperiment();
  });
  function initialize() {
    Object.assign(state, defaultState);
    state.playing = true;
    state.sortedModels = io.loadAllModelLayers(config.MAX_NETWORK_LAYERS);

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

    // best car
    const bestLayers = [...state.sortedModels].sort((a, b) => {
      return (b[0] ? b[0].score : 0) - (a[0] ? a[0].score : 0);
    });
    const bestModel = bestLayers[0][0];
    if (bestModel) {
      const bestLayerNb = bestModel.levels.length;
      state.player = new Car(
        road.getLane(1),
        100,
        ControlType.AI,
        3,
        '☠️',
        getColorScale(bestLayerNb / config.MAX_NETWORK_LAYERS),
        bestLayerNb,
      );
      console.log(`Death car is layer ${bestLayerNb}`);
      state.player.brain.mutationFactor = 0;
      state.player.brain.mutationIndex = 0;
      state.player.brain.mutate(bestModel);
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
