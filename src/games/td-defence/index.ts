import { Ball } from "./Ball"
import { CollisionBox } from "./CollisionBox"

var canvas = document.createElement("canvas")
document.body.appendChild(canvas)
var ctx = canvas.getContext("2d")

var GW = (canvas.width = 800)
var GH = (canvas.height = 600)

const leftPlayer = new CollisionBox(50, 150, 20, 140)
const rightPlayer = new CollisionBox(GW - 50, 150, 20, 140)

const allBoxes: CollisionBox[] = [leftPlayer, rightPlayer]
const allBalls: Ball[] = []

for (var i = 0; i < 5; i++) {
  const x = (Math.random() * GW) / 2 + GW / 4
  const y = Math.random() * GH
  const area = Math.random() * 150
  allBoxes.push(new CollisionBox(x, y, 5 + area, 5 + (150 - area)))
  allBalls.push(new Ball(GW / 2, GH / 2, 25))
}

renderGame()

function renderGame() {
  requestAnimationFrame(renderGame)
  // ctx.clearRect(0, 0, GW, GH)
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
  ctx.fillRect(0, 0, GW, GH)

  // desiner les obstacles
  allBoxes.forEach((box) => {
    box.render(ctx)
    // box.getCollitionNormal(ball.x, ball.y, ball.size)

    // if (ballX < 0 + ballSize / 2) ballVX = Math.abs(ballVX * ballAcc) // left
    // if (ballY < 0 + ballSize / 2) ballVY = Math.abs(ballVY * ballAcc) // top
    // if (ballX > GW - ballSize / 2) ballVX = -Math.abs(ballVX * ballAcc) // right
    // if (ballY > GH - ballSize / 2) ballVY = -Math.abs(ballVY * ballAcc) // bottom
  })

  allBalls.forEach((ball) => {
    leftPlayer.y = ball.y
    rightPlayer.y = ball.y

    allBoxes.forEach((box) => box.getCollitionNormal(ball))

    if (ball.x < 0 + ball.size / 2) ball.vx = Math.abs(ball.vx * ball.acc) // left: ;
    if (ball.y < 0 + ball.size / 2) ball.vy = Math.abs(ball.vy * ball.acc) // top
    if (ball.x > GW - ball.size / 2) ball.vx = -Math.abs(ball.vx * ball.acc) // right
    if (ball.y > GH - ball.size / 2) ball.vy = -Math.abs(ball.vy * ball.acc) // bottom
    ball.render(ctx)
  })

  ctx.fillStyle = "black"
  // ctx.fillText(`${ballX}, ${ballY}`, 0, 10)
  // ctx.fillText(`${ballVX}, ${ballVY}`, 0, 22)
}
