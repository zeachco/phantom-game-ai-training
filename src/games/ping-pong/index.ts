import { Ball } from "./Ball";
import { CollisionBox } from "./CollisionBox";

export default () => {
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  if (!ctx) throw new Error("no 2d context");

  const GW = (canvas.width = 800);
  const GH = (canvas.height = 600);

  let leftV = 0;
  let rightV = 0;

  const leftPlayer = new CollisionBox(50, 150, 20, 140);
  const rightPlayer = new CollisionBox(GW - 50, 150, 20, 140);

  const allBoxes: CollisionBox[] = [leftPlayer, rightPlayer];
  const allBalls: Ball[] = [];

  for (var i = 0; i < 10; i++) {
    const x = (Math.random() * GW) / 2 + GW / 4;
    const y = Math.random() * GH;
    const area = Math.random() * 150;
    // allBoxes.push(new CollisionBox(x, y, 5 + area, 5 + (150 - area)));
    allBalls.push(new Ball(GW / 2, GH / 2, 25));
  }

  renderGame();

  function renderGame() {
    requestAnimationFrame(renderGame);
    ctx.clearRect(0, 0, GW, GH);
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, GW, GH);

    // desiner les obstacles
    allBoxes.forEach((box) => {
      box.render(ctx);
      // box.getCollitionNormal(ball.x, ball.y, ball.size)

      // if (ballX < 0 + ballSize / 2) ballVX = Math.abs(ballVX * ballAcc) // left
      // if (ballY < 0 + ballSize / 2) ballVY = Math.abs(ballVY * ballAcc) // top
      // if (ballX > GW - ballSize / 2) ballVX = -Math.abs(ballVX * ballAcc) // right
      // if (ballY > GH - ballSize / 2) ballVY = -Math.abs(ballVY * ballAcc) // bottom

      void 2;
    });

    const sorted = allBalls.sort((a, b) => a.x - b.x);
    const last = sorted.length - 1;
    const speed = 1;
    const pad = 25;
    if (sorted[0].y > leftPlayer.y + pad) leftV += speed;
    if (sorted[0].y < leftPlayer.y - pad) leftV -= speed;
    if (sorted[last].y > rightPlayer.y + pad) rightV += speed;
    if (sorted[last].y < rightPlayer.y - pad) rightV -= speed;
    leftPlayer.y += leftV *= 0.9;
    rightPlayer.y += rightV *= 0.9;

    allBalls.forEach((ball, index) => {
      allBoxes.forEach((box) => box.getCollitionNormal(ball));

      // if (ball.x < 0 + ball.size / 2) ball.vx = Math.abs(ball.vx * ball.acc); // left
      // if (ball.x > GW - ball.size / 2) ball.vx = -Math.abs(ball.vx * ball.acc) // right
      if (ball.y < 0 + ball.size / 2) ball.vy = Math.abs(ball.vy * ball.acc); // top
      if (ball.y > GH - ball.size / 2) ball.vy = -Math.abs(ball.vy * ball.acc); // bottom
      ball.render(ctx);
      if (ball.x < 0 + ball.size / 2 || ball.x > GW - ball.size / 2) {
        // left
        allBalls.splice(index, 1);
        allBalls.push(new Ball(GW / 2, GH / 2, 25));
      }
    });
  }
};
