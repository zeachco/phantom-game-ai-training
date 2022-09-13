import { fileUtilities } from "../../ai/utils";
import { Visualizer } from "../../ai/Visualizer";
import { createCanvas } from "../../utilities/dom";
import { GameLoop } from "../../utilities/three/GameLoop";
import { Car } from "./Car";
import { Road } from "./Road";
import { ControlType } from "./types";

const defaultState = {
  cars: [] as Car[],
  traffic: [] as Car[],
  bestCar: undefined as Car,
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

  const N = 100;

  const loop = new GameLoop();

  function initialize() {
    Object.assign(state, defaultState);
    state.cars = generateCars(N);
    state.traffic = [];

    state.bestCar = state.cars[0];
    const model = state.loadModel();

    if (model) {
      console.log("Branch of generation " + model.generation);
      for (let i = 0; i < state.cars.length; i++) {
        const car: Car = state.cars[i];
        if (i != 0 && car.brain) {
          car.brain.fork(model);
        }
      }
    } else {
      console.log("Fresh model start");
    }

    state.traffic.push(
      // trial of evasion
      new Car(road.getLaneCenter(0), -300, 30, 50, ControlType.DUMMY, 0.1),
      new Car(road.getLaneCenter(1), -600, 30, 50, ControlType.DUMMY, 0.2),
      new Car(road.getLaneCenter(2), -300, 30, 50, ControlType.DUMMY, 0.3),
      // moving cars
      new Car(road.getLaneCenter(0), -400, 30, 50, ControlType.DUMMY, 2),
      new Car(road.getLaneCenter(0), -600, 30, 50, ControlType.DUMMY, 2),
      // new Car(road.getLaneCenter(1), -400, 30, 50, ControlType.DUMMY, 2),
      new Car(road.getLaneCenter(2), -300, 30, 50, ControlType.DUMMY, 2),
      new Car(road.getLaneCenter(1), -500, 30, 50, ControlType.DUMMY, 2),
      new Car(road.getLaneCenter(1), -900, 30, 50, ControlType.DUMMY, 2),
      new Car(road.getLaneCenter(2), -700, 30, 50, ControlType.DUMMY, 2),
      // fail wall
      new Car(road.getLaneCenter(0), 400, 30, 50, ControlType.DUMMY, 2.6),
      new Car(road.getLaneCenter(1), 375, 30, 50, ControlType.DUMMY, 2.6),
      new Car(road.getLaneCenter(2), 400, 30, 50, ControlType.DUMMY, 2.6)
    );

    for (let i = 3; i < lanes; i++) {
      state.traffic.push(
        new Car(road.getLaneCenter(i), 300, 30, 50, ControlType.DUMMY, 2.5)
      );
    }

    // traffic.push(
    //   new Car(road.getLaneCenter(lanes), 250, 30, 50, ControlType.KEYS, 3.5)
    // );
  }

  function generateCars(N = 1) {
    const cars: Car[] = [];
    for (let i = 1; i <= N; i++) {
      cars.push(
        new Car(road.getLaneCenter(1), 100, 30, 50, ControlType.AI, 3, "blue")
      );
    }
    return cars;
  }

  initialize();
  loop.play((es, dt) => {
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].update(road.borders, []);
    }
    for (let i = 0; i < state.cars.length; i++) {
      state.cars[i].update(road.borders, state.traffic);
    }
    const sortedCars = state.cars.sort((a, b) => a.y - b.y);
    const bestCar = sortedCars[0];

    if (!sortedCars.filter((a) => !a.damaged).length) {
      if (bestCar.y < state.traffic[6].y) {
        state.saveModel(bestCar);
      }
      initialize();
    }

    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;

    carCtx.save();
    carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);

    road.draw(carCtx);
    for (let i = 0; i < state.traffic.length; i++) {
      state.traffic[i].draw(carCtx);
    }
    for (let i = 0; i < state.cars.length; i++) {
      const isBest = state.cars[i] === bestCar;
      carCtx.globalAlpha = isBest ? 1 : 0.2;
      state.cars[i].draw(carCtx, isBest, i);
    }

    carCtx.restore();

    networkCtx.lineDashOffset = -dt / 50;
    Visualizer.drawNetwork(networkCtx, bestCar.brain!);
  });
};
