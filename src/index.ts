const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

import { createStage } from './utilities/dom';

type GameModule = { default: (state: object) => unknown };

const apps = new Map<string, () => Promise<unknown>>([
  ['highway', () => import(`./games/highway/main.js`)],
  ['circuit', () => import(`./games/circuit/main.js`)],
  ['cave', () => import(`./games/cave/main.js`)],
  ['climb', () => import(`./games/climb/main.js`)],
]);

const ul = document.createElement('ul');
ul.classList.add('game-menu');

apps.forEach((_game, key) => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="?game=${key}">${key}</a>`;
  ul.appendChild(li);
});

const game = urlParams.get('game') || '';
const app = apps.get(game);

if (app) {
  // the dock lives in the stage, so it centers on the canvas instead of the
  // page: an open side panel never clips it
  createStage().appendChild(ul);
  const state = {};
  app().then((mod) => (mod as GameModule).default(state));
} else {
  ul.classList.add('big');
  document.body.appendChild(ul);
}
