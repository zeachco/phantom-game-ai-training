const canvas = document.createElement("canvas")
const ctx = canvas.getContext("2d")
document.body.appendChild(canvas)

const matrix = `
|0.0  00  0 |
|     0   0 |
|  0  0  0 0|
|  0  0    0|
| 0.  0 0  0|
| 000   0   |
|   0 0  0 0|
|0  .  .0   |
|  000  0.0 |
|    .  0   |
|.   0   0  |
|0 0  0     |
|  0  0  0 0|
`
  .trim()
  .split("\n")
  .map((row) => row.split(""))

const GW = 640
const GH = 480
canvas.width = GW
canvas.height = GH
const gridX = matrix[0].length
const gridY = Math.min(matrix.length, gridX)
const TW = GW / gridX
const TH = GH / gridY
let shipTile = 0
let score = 0
let highScore: number = +localStorage.getItem("highScore") || 0
let now = Date.now()
let gameSpeed = 1000
let invinsibleRows = TH
resetShip()

function render() {
  requestAnimationFrame(render)
  const es = Date.now() - now
  if (es > gameSpeed) moveForward()

  ctx.clearRect(0, 0, GW, GH)

  for (var y = 0; y < gridY; y++) {
    for (var x = 0; x < gridX; x++) {
      switch (matrix[y][x]) {
        case "0":
          if (gridY - y < invinsibleRows) break
          ctx.fillStyle = "#330000"
          ctx.fillRect(x * TW, y * TH, TW, TH)
          break
        case "|":
          ctx.fillStyle = "#000000"
          ctx.fillRect(x * TW, y * TH, TW, TH)
          break
        case ".":
          ctx.fillStyle = "#00ff0088"
          ctx.fillRect(x * TW, y * TH, TW, TH)
          break
      }
    }
  }
  ctx.fillStyle = "#FF0000"
  ctx.fillRect(shipTile * TW, (gridY - 1) * TH, TW, TH)
  ctx.strokeStyle = "yellow"
  ctx.strokeText(`score: ${score}`, 0, TH)
  ctx.strokeText(`score: ${Math.max(highScore, score)}`, 0, TH * 2)
}

function move(verticalMove) {
  shipTile += verticalMove
  if (shipTile < 0) shipTile = 0
  if (shipTile > gridX - 1) shipTile = gridX - 1
  checkPosition()
}

function moveForward() {
  matrix.unshift(matrix.pop())
  invinsibleRows--
  checkPosition()
  gameSpeed = 250 - score / 5
  now = Date.now()
}

function checkPosition() {
  const lastRow = matrix[gridY - 1]
  switch (lastRow[shipTile]) {
    case "0":
      if (invinsibleRows <= 0) resetShip()
      break
    case ".":
      score += 10
      break
    case " ":
      score += 1
      break
  }
}

function resetShip() {
  if (score > highScore) {
    highScore = score
    localStorage.setItem("highScore", highScore + "")
  }
  score = 0
  invinsibleRows = TH
  shipTile = Math.round(gridX / 2)
}

render()

document.body.addEventListener("keydown", (ev) => {
  if (ev.key === "ArrowLeft") move(-1)
  if (ev.key === "ArrowRight") move(1)
  if (ev.key === "ArrowUp") moveForward()
})
