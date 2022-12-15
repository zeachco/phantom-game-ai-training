
import { createCanvas } from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { angleOffset, getAngle, lerp, rand, randInt } from '../../utilities/math';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Cell } from './classes/Cell';
import { NeuralNetwork } from './neural-network/NeuralNetwork';

export default async () => {
  const gamepad = new GamePad()
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  const GW = (canvas.width = window.innerWidth);
  const GH = (canvas.height = window.innerHeight);
  const loop = new GameLoop();

  let cells: Cell[] = []

  let currentTop = cells[0]
  let newSpawn = 0;

  const dummy = new Cell()
  dummy.brain.loadFromFile('top')

  let bestSavedScore = dummy.brain.score || 0

  console.log({ bestSavedScore })

  loop.play((_es, _dt) => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cells.forEach((cell, index) => {
      // cell.focused = index === controllerIndex
      if (cell.focused) humanControl(cell)
      else AIControl(cell)
      if (cell.x > GW) cell.x = 0
      if (cell.x < 0) cell.x = GW
      if (cell.y > GH) cell.y = 0
      if (cell.y < 0) cell.y = GH
      cell.update();
    })

    cells.forEach(cell => cell.updateEnemies(cells))

    if (cells.length < Cell.MAX_NB) {
      for (let i = 0; i < 10; i++) {

        const cell =
          new Cell({
            a: rand(-Math.PI, Math.PI),
            x: randInt(0, GW),
            y: randInt(0, GH),
            energy: rand(100, 150),
            label: `${newSpawn++}`
          })

        cell.brain.loadFromFile('top')
        cell.brain.randomize(i / 10)
        cell.brain.score = 0
        cells.push(cell)

      }
    }


    cells.forEach(cell => cell.draw(ctx))
    cells = cells.filter(cell => !cell.dead)

    const scores = cells.concat().sort((a, b) => b.brain.score - a.brain.score)

    currentTop = scores[0]
    if (currentTop && currentTop.brain.score > bestSavedScore) {
      const newScore = currentTop.brain.score;

      console.log(`New score: ${bestSavedScore} > ${newScore.toFixed()} (+${(newScore - bestSavedScore).toFixed(3)})`)

      bestSavedScore = newScore
      console.log(`saving top ${currentTop.label}`)
      currentTop.brain.saveToFile('top')
    }

  });

  function humanControl(cell: Cell) {
    if (gamepad.get('ArrowUp')) cell.forward()
    if (gamepad.get('ArrowLeft')) cell.turnLeft()
    if (gamepad.get('ArrowRight')) cell.turnRight()
    if (gamepad.get('Space')) cell.attack()
  }

  function AIControl(cell: Cell) {
    const inputs: number[] = []
    cell.enemies.forEach((enemy) => {
      inputs.push(enemy.distance)
      inputs.push(enemy.mouthDistance)
      inputs.push(enemy.relativeAngle)
    })
    const [up, left, right, space] = cell.brain.feedForward(inputs)
    if (up) cell.forward()
    if (left) cell.turnLeft()
    if (right) cell.turnRight()
    if (space) cell.attack()
  }
};
