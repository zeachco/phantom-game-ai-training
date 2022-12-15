
import { createCanvas } from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { rand } from '../../utilities/math';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Cell } from './classes/Cell';

export default async () => {
  const gamepad = new GamePad()
  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");

  const GW = (canvas.width = window.innerWidth);
  const GH = (canvas.height = window.innerHeight);
  const loop = new GameLoop();

  const cells: Cell[] = []

  let controllerIndex = 0

  for (let i = 0; i < Cell.MAX_NB; i++) {
    cells.push(new Cell({ a: rand(-Math.PI, Math.PI), x: rand(0, GW), y: rand(0, GH), energy: rand(100, 150) }))
  }

  loop.play((_es, _dt) => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cells.forEach((cell, index) => {
      cell.focused = index === controllerIndex
      if (cell.focused) humanControl(cell)
      else AIControl(cell)
      if (cell.x > GW) cell.x = 0
      if (cell.x < 0) cell.x = GW
      if (cell.y > GH) cell.y = 0
      if (cell.y < 0) cell.y = GH
      cell.update();
    })

    cells.forEach(cell => cell.updateEnemies(cells))
    cells.forEach(cell => cell.draw(ctx))
  });

  function humanControl(cell: Cell) {
    if (gamepad.get('ArrowUp')) cell.forward()
    if (gamepad.get('ArrowLeft')) cell.turnLeft()
    if (gamepad.get('ArrowRight')) cell.turnRight()
    if (gamepad.get('Space')) cell.attack()
  }

  function AIControl(cell: Cell) {
    if (Math.random() > .75) cell.forward()
    if (Math.random() > .25) cell.turnLeft()
    if (Math.random() > .25) cell.turnRight()
    if (Math.random() > .85) cell.attack()
  }
};
