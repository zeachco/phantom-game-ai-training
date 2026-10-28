import { expect, test } from 'bun:test';
import {
  type ClimbModelIo,
  ClimbRace,
} from '../src/games/climb/classes/ClimbRace';
import { config } from '../src/games/climb/classes/Config';
import { type defaultState } from '../src/games/climb/utilities';
import { type ModelsByLayerCount } from '../src/ai/utils';
import { SEED_TIMEOUT_MS } from '../src/utilities/race/RaceBase';
import { gameNow } from '../src/utilities/gameClock';

/**
 * A seed game that produces no winner within SEED_TIMEOUT_MS (10 minutes)
 * must restart from seed 0, and a seed with a winner in time must advance
 * normally instead of resetting.
 */

/** localStorage + the browser bits ClimbRace touches: the human player's
 *  keyboard listeners and the history write on seed regeneration. */
function stubRaceEnv() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  const urls: string[] = [];
  const original = {
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    history: Object.getOwnPropertyDescriptor(globalThis, 'history'),
    location: Object.getOwnPropertyDescriptor(globalThis, 'location'),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
  Object.defineProperty(globalThis, 'history', {
    configurable: true,
    value: {
      replaceState: (_state: unknown, _title: unknown, url: string) => {
        urls.push(url);
      },
    },
  });
  Object.defineProperty(globalThis, 'location', {
    configurable: true,
    value: {
      pathname: '/',
      search: '',
      href: 'http://localhost/?game=climb',
    },
  });
  function restore() {
    for (const [key, descriptor] of [
      ['localStorage', original.localStorage],
      ['document', original.document],
      ['history', original.history],
      ['location', original.location],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
  return { store, urls, restore };
}

/** an io with an empty model library: no saved brains, no mixed experts */
function stubIo() {
  return {
    io: {
      saveBestModels: () => {},
      saveModelList: () => {},
      loadAllModelLayers: () => [] as ModelsByLayerCount,
      discardModels: () => {},
      discardGameModels: () => {},
      discardModel: () => {},
      importModels: () => [] as string[],
    } as unknown as ClimbModelIo,
  };
}

function makeRace(seed: number) {
  const env = stubRaceEnv();
  const { io } = stubIo();
  const state = {} as typeof defaultState;
  const race = new ClimbRace(state, io, seed);
  race.initialize();
  // freeze the population in place: every AI brain outputs nothing, so the
  // tests never race a drifting swarm
  for (const player of state.players)
    if (player.useAI) player.brain!.process = () => [0, 0, 0];
  return { ...env, state, race };
}

test('a seed with no winner for 10 minutes restarts from seed 0', () => {
  const fx = makeRace(7);
  try {
    // no climber reaches the seed target, so no winner is banked
    fx.race.update(gameNow() + SEED_TIMEOUT_MS + 1_000);
    expect(fx.race.seed).toBe(0);
    // the hash write that pins the reset seed for reloads
    expect(fx.urls.some((url) => url.endsWith('#climb=0'))).toBe(true);
  } finally {
    fx.restore();
  }
});

test('a seed with a winner in time advances instead of resetting', () => {
  const fx = makeRace(7);
  try {
    // three groups hold the seed target, arming the normal advance countdown
    for (const group of fx.race.groups.slice(
      0,
      config.FINISHED_GROUPS_PER_SEED,
    )) {
      group.pool[0].brain!.score = config.SEED_TARGET_FLOORS + 10;
    }
    const t1 = gameNow() + 1_000;
    fx.race.update(t1);
    expect(fx.race.seedChangeAt).toBe(t1 + config.SEED_CHANGE_MS);
    // well past both the 10 s advance countdown and the 10-minute timeout
    fx.race.update(t1 + SEED_TIMEOUT_MS + 60_000);
    expect(fx.race.seed).toBe(8);
  } finally {
    fx.restore();
  }
});
