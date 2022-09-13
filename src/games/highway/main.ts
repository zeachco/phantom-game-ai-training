import { NeuralNetwork } from "../../ai/Network";
import { fileUtilities } from "../../ai/utils";
import { Visualizer } from "../../ai/Visualizer";
import { createCanvas } from "../../utilities/dom";
import { GameLoop } from "../../utilities/three/GameLoop";
import { Car } from "./Car";
import { config } from "./Config";
import { Road } from "./Road";
import { ControlType } from "./types";

const defaultState = {
  cars: [] as Car[],
  sortedCars: [] as Car[],
  livingCars: [] as Car[],
  traffic: [] as Car[],
  player: new Car(),
  to: 0,
  model: undefined as NeuralNetwork,
  ...fileUtilities("highway"),
};

export default async (state: typeof defaultState) => {
  const carCanvas = createCanvas();
  carCanvas.style.cssText = "max-width: 50%";
  const networkCanvas = createCanvas();
  networkCanvas.style.cssText = "max-width: 50%";

  const carCtx = carCanvas.getContext("2d");
  const networkCtx = networkCanvas.getContext("2d");

  carCanvas.width = 200;
  networkCanvas.width = 400;

  const lanes = Math.round(carCanvas.width / 75);
  const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, lanes);

  const loop = new GameLoop();

  function initialize() {
    Object.assign(state, defaultState);
    state.traffic = [];

    state.model = state.loadModel();
    state.cars = generateCars(config.CAR_NB);
    state.player = new Car(
      road.getLane(1),
      0,
      30,
      50,
      ControlType.KEYS,
      3.5,
      "You",
    );
    // state.cars.push(state.player);

    if (state.model) {
      console.log("Branch of generation " + state.model.generation);
      for (let i = 0; i < state.cars.length; i++) {
        const car: Car = state.cars[i];
        car.neural.mutate(
          state.model,
          (i / state.cars.length) * config.MUTATION_LVL,
        );
      }
    } else {
      console.log("Fresh model start");
    }

    state.traffic.push(
      ...config.trafficConfig.map(
        ([lane, y, speed, name], index) =>
          new Car(
            road.getLane(lane),
            y,
            30,
            50,
            ControlType.DUMMY,
            speed,
            name || index + "",
          ),
      ),
    );
  }

  function generateCars(N = 1) {
    const cars: Car[] = [];
    for (let i = 0; i <= N; i++) {
      const modelVersion = state.model?.generation || 0;
      cars.push(
        new Car(
          road.getLane(1),
          100,
          30,
          50,
          ControlType.AI,
          3,
          i === 0 ? `${modelVersion}` : `${modelVersion}-${i}`,
        ),
      );
    }
    return cars;
  }

  // timeout the experiment after 30 minutes
  state.to = setTimeout(() => {
    console.warn(`timeout experiment, saving model...`);
    const [bestAI] = state.sortedCars.filter((c) => c.useAI);
    const lastScore = state.loadScore();
    if (lastScore < bestAI.score) {
      state.saveModel(bestAI.neural);
      state.saveScore(bestAI.score);
    }
    initialize();
  }, 1000 * 60 * 30);
  initialize();

  loop.play((es, dt) => {
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].update(road.borders, []);
    }
    for (let i = 0; i < state.cars.length; i++) {
      state.cars[i].update(road.borders, state.traffic);
    }
    state.sortedCars = state.cars.sort((a, b) => b.score - a.score);
    state.livingCars = state.cars.filter((a) => !a.damaged);

    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;

    carCtx.save();
    if (state.player.score > 0 && !state.player.damaged) {
      carCtx.translate(0, -state.player.y + carCanvas.height * 0.7);
    } else {
      carCtx.translate(0, -state.sortedCars[0].y + carCanvas.height * 0.7);
    }

    road.draw(carCtx);
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].draw(carCtx);
    }
    for (let i = 0; i < state.sortedCars.length; i++) {
      const isBest = i === 0 || !state.cars[i].useAI;
      carCtx.globalAlpha = isBest ? 1 : 0.2;
      state.cars[i].draw(carCtx, i === 0, i);
    }

    carCtx.restore();

    networkCtx.lineDashOffset = -dt / 50;
    Visualizer.drawNetwork(networkCtx, state.sortedCars[0].neural!);
    const FH = 18;
    const TL = FH * 1;
    const displayedScoreCars = state.sortedCars.filter(
      (c, i) => i < 7 || c === state.player || c.label === "original",
    );

    carCtx.fillStyle = "black";
    carCtx.font = "bold 14px serif";
    carCtx.fillText(`Generation ${state.model?.generation}`, TL, FH);

    carCtx.fillText(`Mutation factor: ${config.MUTATION_LVL}`, TL, FH * 2);

    carCtx.fillText(
      `${state.livingCars.length}/${state.sortedCars.length} cars`,
      TL,
      FH * 3,
    );

    displayedScoreCars.forEach((car, index) => {
      carCtx.fillStyle = car.damaged ? "#def" : "orange";
      carCtx.fillText(
        `${car.label} ${Math.round(car.score)} `,
        TL,
        FH * 4 + index * FH,
      );
    });

    const [first] = state.livingCars;

    if (!first) {
      const [bestAI] = state.sortedCars.filter((c) => c.useAI);
      state.saveModel(bestAI.neural);
      initialize();
    }
  });
};
