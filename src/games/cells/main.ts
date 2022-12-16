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
  const vizualizer = new NeuralVisualizer(ctx);
  if (!ctx) throw new Error('no 2d context');

  const GW = (canvas.width = window.innerWidth);
  const GH = (canvas.height = window.innerHeight);
  const loop = new GameLoop();

  let cells: Cell[] = [];

  let currentTop = cells[0];
  let renderViz = false;

  const dummy = new Cell();
  dummy.brain.loadFromFile('top');

  let bestSavedScore = dummy.brain.score || 0;

  loop.play((_es, _dt) => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const factionTotal = new Array(MAX_FACTIONS).fill(0);
    cells.forEach((cell, index) => {
      factionTotal[cell.faction]++;
      // if (cell.focused) humanControl(cell)
      // else AIControl(cell)
      AIControl(cell);

      cell.update();

      // wrap
      if (cell.x > GW) cell.x = 0;
      if (cell.x < 0) cell.x = GW;
      if (cell.y > GH) cell.y = 0;
      if (cell.y < 0) cell.y = GH;

      // if (cell.x > GW) cell.x = GW
      // if (cell.x < 0) cell.x = 0
      // if (cell.y > GH) cell.y = GH
      // if (cell.y < 0) cell.y = 0
    });

    factionTotal.forEach((total, index) => {
      if (total < Cell.MAX_NB) {
        const orgCell = cells.find((c) => c.faction === index);
        const x = orgCell?.x || randInt(0, GW);
        const y = orgCell?.y || randInt(0, GH);
        const a = orgCell?.a || rand(-Math.PI, Math.PI);

        const cell = new Cell({
          x,
          y,
          a,
          energy: 100,
          faction: index,
        });

        cell.brain.loadFromFile('top');
        cell.brain.mutationAmount = total / Cell.MAX_NB / (1 + bestSavedScore);
        cell.brain.randomize();
        cell.brain.score = 0;
        cells.push(cell);
      }
    });

    cells.forEach((cell) => cell.updateTargets(cells, GW, GH));
    const scores = cells.concat().sort((a, b) => b.brain.score - a.brain.score);
    (window as any).scores = scores;
    cells.forEach((cell) => {
      cell.focused = cell === scores[0];
      cell.draw(ctx);
    });
    cells = cells.filter((cell) => !cell.dead);

    currentTop = scores[0];
    if (currentTop && currentTop.brain.score > bestSavedScore) {
      const newScore = currentTop.brain.score;
      console.log(
        `New score: ${bestSavedScore} > ${newScore.toFixed()} (+${(
          newScore - bestSavedScore
        ).toFixed(3)})`,
      );
      bestSavedScore = newScore;
      currentTop.brain.saveToFile('top');
    }

    if (gamepad.once('KeyV')) renderViz = !renderViz;
    if (renderViz) vizualizer.render();
    else {
      ctx.fillStyle = 'rgba(255, 255, 255, .6)';
      ctx.font = '24px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Press V for neural network visuals`, 0, GH);
    }
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
