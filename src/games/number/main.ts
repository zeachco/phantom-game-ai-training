import { NeuralVisualizer } from '../../ai/NeuralVisualizer';
import { createCanvas } from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { rand, randInt } from '../../utilities/math';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Cell } from './classes/Cell';
import { MAX_FACTIONS } from './factions';

export default async () => {
  const gamepad = new GamePad();
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  let GW = (canvas.width = window.innerWidth);
  let GH = (canvas.height = window.innerHeight);
  const loop = new GameLoop();

  loop.play((_es, _dt) => {
    GW = canvas.width = window.innerWidth;
    GH = canvas.height = window.innerHeight;

    // if (gamepad.once('KeyV'))
  });

  function humanControl(cell: Cell) {
    if (gamepad.get('ArrowUp')) cell.forward();
    if (gamepad.get('ArrowLeft')) cell.turnLeft();
    if (gamepad.get('ArrowRight')) cell.turnRight();
    // if (gamepad.get('Space')) cell.attack()
  }

  function AIControl(cell: Cell) {
    const inputs: number[] = [];
    cell.others.forEach((enemy) => {
      inputs.push(enemy.distance);
      inputs.push(enemy.opportunity);
      // inputs.push(enemy.relativeAngle)
    });
    const [up, left, right] = cell.brain.feedForward(inputs);
    if (up) cell.forward();
    if (left) cell.turnLeft();
    if (right) cell.turnRight();
    // if (space) cell.attack()
  }
};
