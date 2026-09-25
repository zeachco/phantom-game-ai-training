const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

type GameModule = { default: (state: object) => unknown };

const apps = new Map<string, () => Promise<unknown>>([
  ['highway', () => import(`./games/highway/main.js`)],
  ['circuit', () => import(`./games/circuit/main.js`)],
  ['ping-pong', () => import(`./games/ping-pong/index.js`)],
  ['space-shield', () => import(`./games/space-shield/index.js`)],
  ['waypoints', () => import(`./games/waypoints/main.js`)],
  ['cells', () => import(`./games/cells/main.js`)],
]);

const ul = document.createElement('ul');
document.body.appendChild(ul);

apps.forEach((_game, key) => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="?game=${key}">${key}</a>`;
  ul.appendChild(li);
});

const game = urlParams.get('game') || '';
const app = apps.get(game);

if (app) {
  const state = {};
  app().then((mod) => (mod as GameModule).default(state));
} else {
  console.log(apps);
}
