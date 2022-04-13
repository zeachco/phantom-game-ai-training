const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
const apps = {
  "tower-def": import("../games/tower-def"),
  "phatom-race": import("../games/phantom-race"),
  "ping-pong": import("../games/ping-pong"),
}

const games = Object.keys(apps)

const ul = document.createElement("ul")
ul.innerHTML = games
  .map((g) => `<li><a href="?game=${g}">${g}</a></li>`)
  .join("")
document.body.appendChild(ul)

const game = urlParams.get("game")

if (~games.indexOf(game)) {
  apps[game].then((app) => app.default())
}
