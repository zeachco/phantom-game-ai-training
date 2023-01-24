import { NeuralVisualizer } from '../../ai/NeuralVisualizer';
import { createCanvas } from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { lerp, rand, randInt } from '../../utilities/math';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Cell } from './classes/Cell';

const DRAW_SIZE = 160;
const LOD_RATIO = 0.1;
const BAR_H = 100;

export default async () => {
  const preview = createCanvas();
  const canvas = createCanvas();
  canvas.style.margin = '100px';
  preview.style.margin = '100px';
  preview.style.outlineStyle = 'dotted';
  canvas.style.outlineStyle = 'dotted';
  preview.style.width = DRAW_SIZE + 'px';
  preview.style.height = DRAW_SIZE + 'px';
  const gamepad = new GamePad(new Map(), false, canvas);
  const ctx = canvas.getContext('2d');
  const pctx = preview.getContext('2d');
  if (!ctx) throw new Error('no 2d context');

  let GW = (canvas.width = window.innerWidth);
  let GH = (canvas.height = window.innerHeight);
  const loop = new GameLoop();
  clear();

  let [drawing, mx, my] = [false, 0, 0];
  var currentTarget = 0;

  loop.play((_es, _dt) => {
    ctx.font = '120px monospace';
    ctx.fillStyle = 'rgba(230,230,230,0.1)';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('' + currentTarget, GW / 2, GH / 2);
    if (gamepad.get('Mouse2')) clear();
    if (gamepad.get('Mouse0') && !drawing) {
      mx = gamepad.get('MouseX');
      my = gamepad.get('MouseY');
      drawing = true;
    }
    if (drawing && !gamepad.get('Mouse0')) {
      drawing = false;
      refreshPreview();
    }
    if (drawing) {
      ctx.beginPath();
      pctx.beginPath();
      ctx.strokeStyle = 'black';
      pctx.strokeStyle = 'black';
      ctx.lineWidth = 10;
      pctx.lineWidth = 1;
      ctx.moveTo(mx, my);
      pctx.moveTo(mx * LOD_RATIO, my * LOD_RATIO);
      mx = gamepad.get('MouseX');
      my = gamepad.get('MouseY');
      ctx.lineTo(mx, my);
      pctx.lineTo(mx * LOD_RATIO, my * LOD_RATIO);
      ctx.stroke();
      pctx.stroke();
    }

    for (let nb = 0; nb < 10; nb++) {
      const xs = lerp(0, GW, nb / 10);
      const ratio = rand(0, 1);
      const height = ratio * BAR_H;
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255, 255, 255, .2)';
      ctx.fillRect(xs, GW - BAR_H / 3, GW / 10, BAR_H / 3);
      ctx.fillStyle = `hsla(${90 - Math.round(ratio * 45)}, 100%, 50%, .3)`;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(
        xs + 2,
        GW - BAR_H / 3 + (BAR_H - height),
        GW / 10 - 4,
        height,
      );
      ctx.strokeRect(
        xs + 2,
        GW - BAR_H / 3 + (BAR_H - height),
        GW / 10 - 4,
        height,
      );
      ctx.fillStyle = 'gray';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${nb}`, xs + GW / 20, GH);
    }
  });

  function clear() {
    currentTarget++;
    if (currentTarget > 9) currentTarget = 0;
    GW = canvas.width = DRAW_SIZE;
    GH = canvas.height = DRAW_SIZE;
    preview.width = GW * LOD_RATIO;
    preview.height = GH * LOD_RATIO;
    // pctx.fillStyle = 'white';
    // pctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = 'gray';
    ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = 'white';
    ctx.fillRect(
      GW / 2 - DRAW_SIZE / 2,
      GH / 2 - DRAW_SIZE / 2,
      DRAW_SIZE,
      DRAW_SIZE,
    );
  }

  function refreshPreview() {}

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
