import { Ball } from "./Ball";
import { CollisionBox } from "./CollisionBox";
import { Player } from "./Player";

export default () => {
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  if (!ctx) throw new Error("no 2d context");

  const GW = (canvas.width = 800);
  const GH = (canvas.height = 600);

  const playerA = new Player();
  const playerB = new Player();

  const allBoxes: CollisionBox[] = [];
  const allBalls: Ball[] = [];

  for (var i = 0; i < 10; i++) {
    const x = (Math.random() * GW) / 2 + GW / 4;
    const y = Math.random() * GH;
    const area = Math.random() * 150;

    const box = new CollisionBox(x, y, 5 + area, 5 + (150 - area));

    allBoxes.push(box);
  }
  renderGame();

  function renderGame() {
    requestAnimationFrame(renderGame);
    // ctx.clearRect(0, 0, GW, GH);
    ctx.fillStyle = "rgba(128, 128, 128, 0.2)";
    ctx.fillRect(0, 0, GW, GH);

    // desiner les obstacles
    allBoxes.forEach((box, index) => {
      box.render(ctx);
      if (box.hp <= 0) {
        const x = (Math.random() * GW) / 2 + GW / 4;
        const y = Math.random() * GH;
        const area = Math.random() * 150;
        const box = new CollisionBox(
          x,
          y,
          5 + area,
          5 + (150 - area),
          Math.round(Math.random() * allBalls.length)
        );
        allBoxes.splice(index, 1, box);
      }
    });

    if (allBalls.length > 0) {
      const sorted = allBalls.sort((a, b) => a.x - b.x);
      const last = sorted.length - 1;
      const speed = 1;
      const pad = playerA.board.height / 3;
      if (sorted[0].y > playerA.board.y + pad) playerA.board.vy += speed;
      if (sorted[0].y < playerA.board.y - pad) playerA.board.vy -= speed;
      if (sorted[last].y > playerB.board.y + pad) playerB.board.vy += speed;
      if (sorted[last].y < playerB.board.y - pad) playerB.board.vy -= speed;
      playerA.board.x = 15;
      playerB.board.x = GW - 15;
    }

    allBalls.forEach((ball, index) => {
      allBoxes.forEach((box) => box.getCollitionNormal(ball, index));
      playerA.board.getCollitionNormal(ball, "a");
      playerB.board.getCollitionNormal(ball, "b");
      if (ball.y < 0 + ball.size / 2) ball.vy = Math.abs(ball.vy * ball.acc); // top
      if (ball.y > GH - ball.size / 2) ball.vy = -Math.abs(ball.vy * ball.acc); // bottom
      ball.render(ctx);
      if (ball.x < playerA.board.x) {
        playerB.score += 1;
        playerB.board.hp += 50;
        allBalls.splice(index, 1);
      }
      if (ball.x > playerB.board.x) {
        playerA.score += 1;
        playerA.board.hp += 50;
        allBalls.splice(index, 1);
      }
    });

    if (
      allBalls.length <= Math.round((playerA.score + playerB.score) / 10 + 1)
    ) {
      allBalls.push(new Ball(GW / 2, GH / 2));
    }

    playerA.board.render(ctx);
    playerB.board.render(ctx);

    ctx.fillStyle = "yellow";
    ctx.strokeStyle = "black";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const text = `${playerA.score} - ${playerB.score}`;
    ctx.fillText(text, GW / 2, 20);
    ctx.strokeText(text, GW / 2, 20);
    ctx.font = "10px Arial";
  }
};
