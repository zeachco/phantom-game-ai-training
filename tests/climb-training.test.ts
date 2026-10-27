import { expect, test } from 'bun:test';
import { NeuralNetwork } from '../src/ai/Network';
import {
  fileUtilities,
  type ModelsByLayerCount,
  SAVE_PRECISION,
} from '../src/ai/utils';
import {
  type ClimbModelIo,
  ClimbRace,
} from '../src/games/climb/classes/ClimbRace';
import { config } from '../src/games/climb/classes/Config';
import {
  type defaultState,
  type Group,
  loadScores,
  saveScores,
  scoreKey,
} from '../src/games/climb/utilities';

/** Minimal localStorage so the save-prefix contract can be asserted headless. */
function stubStorage() {
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
  return { store, storage };
}

/** localStorage + the browser bits ClimbRace touches: the human player's
 *  keyboard listeners and the history write on seed regeneration. */
function stubRaceEnv() {
  const { store, storage } = stubStorage();
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
  const saved: Record<string, unknown[]> = {};
  return {
    saved,
    io: {
      saveBestModels: (models: unknown[]) => {
        saved.mixed = models;
      },
      saveModelList: (layer: number, models: unknown[]) => {
        saved[String(layer)] = models;
      },
      loadAllModelLayers: () => [] as ModelsByLayerCount,
      discardModels: () => {},
      discardGameModels: () => {},
      discardModel: () => {},
      importModels: () => [] as string[],
    } as unknown as ClimbModelIo,
  };
}

function makeRace(seed = 0) {
  const env = stubRaceEnv();
  const { io, saved } = stubIo();
  const state = {} as typeof defaultState;
  const race = new ClimbRace(state, io, seed);
  race.initialize();
  // freeze the population in place: every AI brain outputs nothing, so the
  // tests never race a drifting swarm
  for (const player of state.players)
    if (player.useAI) player.brain!.process = () => [0, 0, 0];
  return { ...env, io, saved, state, race };
}

test('a new seed best promotes the brain and marks the group finished', () => {
  const fx = makeRace(0);
  try {
    const group = fx.race.groups.find((g) => g.layer === 1)!;
    const climber = group.pool[0];
    climber.brain!.score = config.SEED_TARGET_FLOORS + 10;
    fx.race.update(1000);

    expect(group.scores.seed).toBe(config.SEED_TARGET_FLOORS + 10);
    expect(group.seedBest?.score).toBe(config.SEED_TARGET_FLOORS + 10);
    expect(group.best?.score).toBe(config.SEED_TARGET_FLOORS + 10);
    expect(group.scores.finished['0']).toBe(true);
    expect(fx.store.get(scoreKey(group))).toBeTruthy();
    expect(fx.saved['1']?.length).toBeGreaterThan(0);
  } finally {
    fx.restore();
  }
});

test('all climb layers start from the same centered ground point', () => {
  const fx = makeRace(0);
  try {
    const starts = fx.race.groups.flatMap((group) =>
      group.pool.map((player) => player.x),
    );
    expect(starts.length).toBeGreaterThan(0);
    expect(starts.every((x) => x === config.TOWER_WIDTH / 2)).toBe(true);
    expect(fx.state.human?.x).toBe(config.TOWER_WIDTH / 2);
  } finally {
    fx.restore();
  }
});

test('a group respawns on the ground once every corpse has expired', () => {
  const fx = makeRace(0);
  try {
    const group = fx.race.groups.find((g) => g.layer === 2)!;
    const before = fx.state.players.length;
    const oldPoolRef = group.pool;
    const oldPool = [...oldPoolRef];
    fx.state.living -= group.pool.length; // what #onDeath would have done
    for (const p of oldPool) {
      p.damaged = true;
      p.deathTime = 0;
    }

    // too soon: the corpses still linger, no respawn
    fx.race.update(config.DEAD_LIFETIME);
    expect(group.pool).toBe(oldPoolRef);

    // once every corpse has expired the whole group comes back
    fx.race.update(config.DEAD_LIFETIME + 1);
    expect(group.pool).not.toBe(oldPoolRef);
    expect(group.pool.length).toBe(config.CARS_PER_GROUP);
    for (const p of group.pool) expect(p.damaged).toBe(false);
    for (const p of group.pool) expect(fx.state.players).toContain(p);
    expect(fx.state.players).not.toContain(oldPool[0]);
    expect(fx.state.players.length).toBe(before);
    expect(fx.state.living).toBe(fx.state.population);
  } finally {
    fx.restore();
  }
});

test('the seed advances once enough groups hold the target, folding the old scores', () => {
  const fx = makeRace(0);
  try {
    const groups = fx.race.groups;
    // no saved experts, so the mixed group is skipped: layers 1..9 only
    expect(groups.length).toBe(config.MAX_NETWORK_LAYERS);
    for (const g of groups.slice(0, config.FINISHED_GROUPS_PER_SEED)) {
      g.scores.seed = config.SEED_TARGET_FLOORS;
      saveScores(g);
    }

    fx.race.update(1000);
    expect(fx.race.seed).toBe(0);
    expect(fx.race.seedChangeAt).toBe(1000 + config.SEED_CHANGE_MS);

    fx.race.update(fx.race.seedChangeAt + 1);
    expect(fx.race.seed).toBe(1);
    expect(fx.race.tower.seed).toBe(1);
    expect(fx.race.seedChangeAt).toBe(0);
    expect(fx.urls.at(-1)).toContain('#climb=1');
    expect(fx.state.players.length).toBe(
      groups.length * config.CARS_PER_GROUP + 1,
    );

    // the old live high scores fold into the per-seed history, fresh start
    const g1 = fx.race.groups.find((g) => g.layer === 1)!;
    expect(g1.scores.current).toBe(1);
    expect(g1.scores.seed).toBe(0);
    expect(g1.scores.phantom).toBe(config.SEED_TARGET_FLOORS);
    expect(g1.scores.history['0']).toBe(config.SEED_TARGET_FLOORS);
  } finally {
    fx.restore();
  }
});

test('an expired human corpse leaves the player list', () => {
  const fx = makeRace(0);
  try {
    const human = fx.state.human!;
    const before = fx.state.players.length;
    human.damaged = true;
    human.deathTime = 0;

    // the corpse lingers for its fade-out...
    fx.race.update(config.DEAD_LIFETIME);
    expect(fx.state.players).toContain(human);

    // ...and then leaves the list: it has no group to respawn it
    fx.race.update(config.DEAD_LIFETIME + 1);
    expect(fx.state.players).not.toContain(human);
    expect(fx.state.players.length).toBe(before - 1);
  } finally {
    fx.restore();
  }
});

test('climb model saves use the climb_ prefix and the scores round-trip', () => {
  const env = stubRaceEnv();
  try {
    const io = fileUtilities('climb');
    const brain = new NeuralNetwork(93, 3, 2);
    io.saveModelList(2, [brain]);

    expect([...env.store.keys()]).toEqual(['climb_2']);
    const loaded = io.loadAllModelLayers(9);
    expect(loaded[2]?.length).toBe(1);
    expect(loaded[2]?.[0].levels.length).toBe(brain.levels.length);
    expect(loaded[2]?.[0].levels[0].weights[0][0]).toBe(
      Math.round(brain.levels[0].weights[0][0] * 10 ** SAVE_PRECISION) /
        10 ** SAVE_PRECISION,
    );
    for (const key of env.store.keys())
      expect(key.startsWith('climb')).toBe(true);

    // scores: a same-seed reload is a no-op, a new seed folds the live high
    const group = {
      key: '3',
      layer: 3,
      isMixed: false,
      scores: null,
    } as unknown as Group;
    saveScores(group, {
      current: 0,
      total: 0,
      seed: 42,
      phantom: 0,
      history: {},
      finished: {},
    });
    const fresh = loadScores(group, 0);
    expect(fresh.seed).toBe(42);
    expect(fresh.history).toEqual({});
    const folded = loadScores(group, 1);
    expect(folded.current).toBe(1);
    expect(folded.seed).toBe(0);
    expect(folded.phantom).toBe(42);
    expect(folded.history).toEqual({ '0': 42 });
  } finally {
    env.restore();
  }
});
