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
  let scoreA = 0;
  let scoreB = 0;

  const leftPlayer = new CollisionBox(15, 120, 30, 140);
  const rightPlayer = new CollisionBox(GW - 15, 120, 30, 140);

  const allBoxes: CollisionBox[] = [leftPlayer, rightPlayer];
  const allBalls: Ball[] = [];

  for (var i = 0; i < 10; i++) {
    allBalls.push(new Ball(GW / 2, GH / 2, 25));
  }

  for (var i = 0; i < 10; i++) {
    const x = (Math.random() * GW) / 2 + GW / 4;
    const y = Math.random() * GH;
    const area = Math.random() * 150;

    const box = new CollisionBox(x, y, 5 + area, 5 + (150 - area));
    if (!box.getCollitionNormal(allBalls[0], 0)) {
      allBoxes.push(box);
    }
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
      if (Math.random() > 0.999 && index > 2) {
        const x = (Math.random() * GW) / 2 + GW / 4;
        const y = Math.random() * GH;
        const area = Math.random() * 150;
        const box = new CollisionBox(x, y, 5 + area, 5 + (150 - area));
        allBoxes.splice(index, 1, box);
      }
    });

    const sorted = allBalls.sort((a, b) => a.x - b.x);
    const last = sorted.length - 1;
    const speed = 1;
    if (sorted[0].y > leftPlayer.y) leftV += speed;
    if (sorted[0].y < leftPlayer.y) leftV -= speed;
    if (sorted[last].y > rightPlayer.y) rightV += speed;
    if (sorted[last].y < rightPlayer.y) rightV -= speed;
    leftPlayer.x = 15;
    rightPlayer.x = GW - 15;
    leftPlayer.y += leftV *= 0.9;
    rightPlayer.y += rightV *= 0.9;

    allBalls.forEach((ball, index) => {
      allBoxes.forEach((box) => box.getCollitionNormal(ball, index));
      if (ball.y < 0 + ball.size / 2) ball.vy = Math.abs(ball.vy * ball.acc); // top
      if (ball.y > GH - ball.size / 2) ball.vy = -Math.abs(ball.vy * ball.acc); // bottom
      ball.render(ctx);
      if (ball.x < 0 + ball.size / 2 || ball.x > GW - ball.size / 2) {
        allBalls.splice(index, 1);
        allBalls.push(new Ball(GW / 2, GH / 2));
        if (ball.x > GW / 2) {
          scoreA += 1;
        } else {
          scoreB += 1;
        }
      }
    });

    ctx.fillStyle = "yellow";
    ctx.strokeStyle = "black";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`${scoreA} - ${scoreB}`, GW / 2, 20);
    ctx.strokeText(`${scoreA} - ${scoreB}`, GW / 2, 20);
    ctx.font = "10px Arial";
  }
};
