import { fileUtilities, ModelsByLayerCount } from '../../ai/utils';
import { Visualizer } from '../../ai/Visualizer';
import { createCanvas } from '../../utilities/dom';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Car } from './classes/Car';
import { config } from './Config';
import { Road } from './classes/Road';
import { ControlType } from './types';
import { DeathRay } from './classes/DeathRay';
import { defaultState, drawScores } from './utilities';

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

  function generateCars() {
    const cars: Car[] = [];
    for (let l = 1; l <= config.MAX_NETWORK_LAYERS; l++) {
      let savedModel =
        (state.sortedModels[l] && state.sortedModels[l][0]) ?? undefined;

      for (let i = 1; i <= config.CAR_PER_LEVELS; i++) {
        config.NETWORK_LAYERS = l;
        const car = new Car(
          road.getLane(1),
          100,
          30,
          50,
          ControlType.AI,
          3,
          `#${i}`,
        );
        if (savedModel && car.neural) {
          car.neural.mutationIndex = i;
          car.neural.mutate(savedModel);
          car.label = car.neural.id;
        }
        cars.push(car);
      }
    }
    return cars;
  }

  try {
    initialize();
  } catch (err) {
    io.discardModels();
    throw err;
  }

  loop.play((_es, dt) => {
    ray.update();
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].update(road.borders, []);
    }
    for (let i = 0; i < state.cars.length; i++) {
      state.cars[i].update(road.borders, state.traffic);
      if (state.cars[i].y > ray.y) state.cars[i].damaged = true;
    }
    state.sortedCars = state.cars.sort(
      (a, b) => b.neural.score - a.neural.score,
    );
    state.livingCars = state.cars.filter((a) => !a.damaged);

    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;
    networkCanvas.width = window.innerWidth - carCanvas.width;

    carCtx.save();
    if (state.player.neural.score > 0 && !state.player.damaged) {
      carCtx.translate(0, -state.player.y + carCanvas.height * 0.7);
    } else {
      carCtx.translate(0, -state.sortedCars[0].y + carCanvas.height * 0.7);
    }

    road.draw(carCtx);
    ray.draw(carCtx);
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].draw(carCtx);
    }
    for (let i = 0; i < state.sortedCars.length; i++) {
      const isBest = i === 0 || !state.cars[i].useAI;
      carCtx.globalAlpha = isBest ? 1 : 0.2;
      state.cars[i].draw(carCtx, i === 0, i);
    }
    carCtx.restore();

    drawScores(state, carCtx);

    networkCtx.lineDashOffset = -dt / 50;
    Visualizer.drawNetwork(networkCtx, state.sortedCars[0].neural!);
    Visualizer.drawStats(networkCtx, state.sortedCars[0].neural!);
    const [first] = state.livingCars;
    if (!first) endExperiment();
  });
  function initialize() {
    Object.assign(state, defaultState);
    state.sortedModels = io.loadAllModelLayers();

    // Game ender
    ray = new DeathRay();

    // Obstacles
    state.traffic = config.trafficConfig.map(
      ([lane, y, speed, name], index) =>
        new Car(
          road.getLane(lane),
          y,
          30,
          50,
          ControlType.DUMMY,
          speed,
          name || index + '',
        ),
    );

    // Experiments
    state.cars = generateCars();

    // local player
    state.player = new Car(
      road.getLane(1),
      0,
      30,
      50,
      ControlType.KEYS,
      3.5,
      'You',
    );
    state.cars.push(state.player);
  }

  function endExperiment() {
    const finalSort = state.sortedCars.filter((c) => c.useAI);
    io.saveBestModels(
      finalSort.map((c) => c.neural),
      config.SCORES_NB,
    );
    initialize();
  }
};

