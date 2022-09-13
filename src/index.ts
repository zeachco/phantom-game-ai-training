const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const apps = new Map<string, Function>([
  ["highway", () => import(`./games/highway/main.js`)],
  ["phatom-race", () => import(`./games/phantom-race/index.js`)],
  ["ping-pong", () => import(`./games/ping-pong/index.js`)],
  ["space-shield", () => import(`./games/space-shield/index.js`)],
  ["tower-def", () => import(`./games/tower-def/index.js`)],
]);

const ul = document.createElement("ul");

apps.forEach((game, key) => {
  const li = document.createElement("li");
  li.innerHTML = `<a href="?game=${key}">${key}</a>`;
  ul.appendChild(li);
});

document.body.appendChild(ul);

const game = urlParams.get("game") || "";
const app = apps.get(game);

if (app) {
  const state = ((window as any).state = {});
  app().then((mod) => mod.default(state));
} else {
  console.log(apps);
}
