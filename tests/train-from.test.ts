import { expect, test } from 'bun:test';
import { MixedNetwork } from '../src/ai/Mixed';
import { NeuralNetwork } from '../src/ai/Network';
import type { ModelsByLayerCount } from '../src/ai/utils';
import { ClimbRace } from '../src/games/climb/classes/ClimbRace';
import type { defaultState } from '../src/games/climb/utilities';
import {
  loadTrainFrom,
  loadTrainFroms,
  saveTrainFrom,
  trainFromKey,
} from '../src/utilities/trainFrom';

/** Minimal localStorage so the train-from persistence can run headless. */
function stubStorage() {
  const store = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
  function restore() {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
  return { store, restore };
}

test('NeuralNetwork.train drives a plain brain toward its targets', () => {
  const net = new NeuralNetwork(4, 2, 1);
  const inputs = [0.5, 0.25, 0.75, 0.1];
  const targets = [1, 0];

  const first = net.train(inputs, targets);
  expect(first).toBeGreaterThan(0);

  let loss = first;
  for (let i = 0; i < 300; i++) loss = net.train(inputs, targets);

  const out = net.process(inputs);
  expect(loss).toBeLessThan(1e-6);
  expect(Math.abs(out[0] - 1)).toBeLessThan(1e-3);
  expect(Math.abs(out[1] - 0)).toBeLessThan(1e-3);
});

test('MixedNetwork.train distills the selector and leaves the experts frozen', () => {
  const experts = [1, 2, 3].map(() => new NeuralNetwork(4, 2, 1));
  const expertSnapshot = JSON.stringify(
    experts.map((expert) => expert.levels.map((level) => level.weights)),
  );
  const mixed = new MixedNetwork(4, 2, experts, {
    hiddenNodes: 3,
    resetChance: 0,
  });
  const selectorBefore = JSON.stringify(
    mixed.levels.map((level) => level.weights),
  );

  const inputs = [0.2, 0.8, 0.5, 0.1];
  const targets = [0.9, 0.1];
  let loss = mixed.train(inputs, targets);
  const first = loss;
  for (let i = 0; i < 100; i++) loss = mixed.train(inputs, targets);

  expect(loss).toBeLessThanOrEqual(first);
  // the selector moved...
  expect(JSON.stringify(mixed.levels.map((level) => level.weights))).not.toBe(
    selectorBefore,
  );
  // ...while every expert it routes to stays byte-identical
  expect(
    JSON.stringify(
      experts.map((expert) => expert.levels.map((l) => l.weights)),
    ),
  ).toBe(expertSnapshot);
});

test('train-from selections round-trip through localStorage', () => {
  const fx = stubStorage();
  try {
    expect(loadTrainFrom('circuit', 2)).toBeNull();

    saveTrainFrom('circuit', 2, 'mixed');
    expect(fx.store.get(trainFromKey('circuit', 2))).toBe('mixed');
    expect(loadTrainFrom('circuit', 2)).toBe('mixed');
    expect(loadTrainFrom('circuit', 3)).toBeNull();

    saveTrainFrom('circuit', 3, 5);
    expect(loadTrainFrom('circuit', 3)).toBe(5);
    expect(loadTrainFroms('circuit').sort()).toEqual([
      [2, 'mixed'],
      [3, 5],
    ]);
    // another game's keys are not visible
    expect(loadTrainFroms('cave')).toEqual([]);

    saveTrainFrom('circuit', 2, null);
    expect(loadTrainFrom('circuit', 2)).toBeNull();
    expect(loadTrainFroms('circuit')).toEqual([[3, 5]]);
    expect(fx.store.has(trainFromKey('circuit', 2))).toBe(false);
  } finally {
    fx.restore();
  }
});

/** localStorage + the browser bits ClimbRace touches, headless. */
function stubRaceEnv(store: Map<string, string>) {
  const original = {
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    history: Object.getOwnPropertyDescriptor(globalThis, 'history'),
    location: Object.getOwnPropertyDescriptor(globalThis, 'location'),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { addEventListener: () => {}, removeEventListener: () => {} },
  });
  Object.defineProperty(globalThis, 'history', {
    configurable: true,
    value: { replaceState: () => {} },
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
  return { restore };
}

/** an io with an empty model library: no saved brains, no mixed experts */
function stubIo() {
  return {
    saveBestModels: () => {},
    saveModelList: () => {},
    loadAllModelLayers: () => [] as ModelsByLayerCount,
    discardModels: () => {},
    discardGameModels: () => {},
    discardModel: () => {},
    importModels: () => [] as string[],
  } as never;
}

test('a distilling group is driven by the teacher while its own brains backpropagate', () => {
  const store = new Map<string, string>();
  const env = stubRaceEnv(store);
  try {
    const state = {} as typeof defaultState;
    const race = new ClimbRace(state, stubIo(), 0);
    race.initialize();

    // a constant teacher champion in group 1
    const group1 = race.groups.find((g) => g.layer === 1)!;
    const student = race.groups.find((g) => g.layer === 2)!.pool[0];
    const free = race.groups.find((g) => g.layer === 3)!.pool[0];
    const teacher = new NeuralNetwork(
      student.brain!.inputCount,
      student.brain!.outputCount,
      1,
    );
    teacher.process = () => [0.9, 0.1, 0];
    teacher.score = 42;
    group1.best = { brain: teacher, score: 42 };

    // a group can never distill from itself
    expect(race.setTrainFrom(1, 1)).toBe(false);
    expect(race.setTrainFrom(2, 1)).toBe(true);
    expect(race.groups.find((g) => g.layer === 2)!.trainFrom).toBe(1);
    expect(race.teacherScore(2)).toBe(42);
    expect(race.teacherScore(1)).toBeNull();

    const studentBefore = JSON.stringify(
      student.brain!.levels.map((level) => level.weights),
    );
    const freeBefore = JSON.stringify(
      free.brain!.levels.map((level) => level.weights),
    );
    race.update(1000);

    // the teacher now drives the group-2 climber...
    expect(student.teacher).toBe(teacher);
    // ...and the student brain has taken a gradient step toward it
    expect(
      JSON.stringify(student.brain!.levels.map((level) => level.weights)),
    ).not.toBe(studentBefore);

    // the free group trains on its own brains, untouched
    expect(free.teacher).toBeNull();
    expect(
      JSON.stringify(free.brain!.levels.map((level) => level.weights)),
    ).toBe(freeBefore);

    // freeing the group back to its own brains nulls the teacher
    expect(race.setTrainFrom(2, null)).toBe(true);
    race.update(2000);
    expect(race.groups.find((g) => g.layer === 2)!.trainFrom).toBeNull();
    expect(student.teacher).toBeNull();
    expect(race.teacherScore(2)).toBeNull();
  } finally {
    env.restore();
  }
});

test('persisted train-from selections survive a race re-initialization', () => {
  const store = new Map<string, string>();
  const env = stubRaceEnv(store);
  try {
    store.set(trainFromKey('climb', 2), '3');
    const state = {} as typeof defaultState;
    const race = new ClimbRace(state, stubIo(), 0);
    race.initialize();

    // restored from storage on a fresh load
    expect(race.groups.find((g) => g.layer === 2)!.trainFrom).toBe(3);
    expect(race.groups.find((g) => g.layer === 4)!.trainFrom).toBeNull();

    // a full re-initialize rebuilds the pools and keeps the selection
    race.initialize();
    expect(race.groups.find((g) => g.layer === 2)!.trainFrom).toBe(3);
    expect(race.groups.find((g) => g.layer === 4)!.trainFrom).toBeNull();
  } finally {
    env.restore();
  }
});
