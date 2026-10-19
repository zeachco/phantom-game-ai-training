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
  studentLabel,
  TRAINING_EMOJI,
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

test('MixedNetwork.fromSave rebuilds a drivable brain from a raw save', () => {
  const experts = [1, 2].map(() => new NeuralNetwork(4, 2, 1));
  const expertSnapshot = JSON.stringify(
    experts.map((expert) => expert.levels.map((level) => level.weights)),
  );
  const mixed = new MixedNetwork(4, 2, experts, {
    hiddenNodes: 3,
    resetChance: 0,
  });
  // a raw save: the JSON round-trip strips the methods, like a localStorage
  // load does to every champion
  const raw = JSON.parse(JSON.stringify(mixed)) as ModelsByLayerCount[number];

  const rebuilt = MixedNetwork.fromSave(raw, 4, 2, experts, {
    hiddenNodes: 3,
  });
  expect(rebuilt).toBeInstanceOf(MixedNetwork);
  expect(JSON.stringify(rebuilt!.levels.map((level) => level.weights))).toBe(
    JSON.stringify(mixed.levels.map((level) => level.weights)),
  );
  expect(rebuilt!.score).toBe(mixed.score);

  // the rebuilt brain routes exactly like the original and the shared
  // experts came through untouched
  const input = [0.1, 0.4, 0.7, 0.2];
  expect(rebuilt!.process(input)).toEqual(mixed.process(input));
  expect(
    JSON.stringify(
      experts.map((expert) => expert.levels.map((level) => level.weights)),
    ),
  ).toBe(expertSnapshot);

  // a selector whose width no longer matches the library is rejected
  const stale = JSON.parse(JSON.stringify(raw)) as ModelsByLayerCount[number];
  stale.levels[stale.levels.length - 1].weights[0] = [0, 0, 0];
  expect(
    MixedNetwork.fromSave(stale, 4, 2, experts, { hiddenNodes: 3 }),
  ).toBeNull();
  // a save with no experts at all is rejected too
  expect(MixedNetwork.fromSave(raw, 4, 2, [])).toBeNull();
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
    const free = race.groups.find((g) => g.layer === 3)!.pool[0];
    const teacher = new NeuralNetwork(
      free.brain!.inputCount,
      free.brain!.outputCount,
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

    // a training run fields exactly one student climber, marked as such
    const group2 = race.groups.find((g) => g.layer === 2)!;
    expect(group2.distillRun).toBe(true);
    expect(group2.pool.length).toBe(1);
    const student = group2.pool[0];
    expect(student.label).toBe(studentLabel('2:0', true));
    expect(student.label.endsWith(TRAINING_EMOJI)).toBe(true);

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

    // freeing the group back to its own brains nulls the teacher and gives the
    // group its swarm back
    expect(race.setTrainFrom(2, null)).toBe(true);
    race.update(2000);
    const freed = race.groups.find((g) => g.layer === 2)!;
    expect(freed.trainFrom).toBeNull();
    expect(freed.distillRun).toBe(false);
    expect(freed.pool.length).toBeGreaterThan(1);
    expect(freed.pool[0].teacher).toBeNull();
    expect(freed.pool[0].label).toBe(studentLabel('2:0', false));
    expect(race.teacherScore(2)).toBeNull();
  } finally {
    env.restore();
  }
});

test('a champion loaded from the saves (plain data) still drives as a teacher', () => {
  const store = new Map<string, string>();
  const env = stubRaceEnv(store);
  try {
    const state = {} as typeof defaultState;
    const race = new ClimbRace(state, stubIo(), 0);
    race.initialize();

    const group1 = race.groups.find((g) => g.layer === 1)!;
    const probe = race.groups.find((g) => g.layer === 2)!.pool[0];
    const source = new NeuralNetwork(
      probe.brain!.inputCount,
      probe.brain!.outputCount,
      1,
    );
    // what loadModels hands back: the same data as a save, but no methods
    const raw = JSON.parse(JSON.stringify(source)) as never;
    raw.score = 42;
    group1.best = { brain: raw, score: 42 };

    expect(race.setTrainFrom(2, 1)).toBe(true);
    const student = race.groups.find((g) => g.layer === 2)!.pool[0];
    const studentBefore = JSON.stringify(
      student.brain!.levels.map((level) => level.weights),
    );
    race.update(1000);

    // the raw save was hydrated into a real brain that can drive
    expect(student.teacher).not.toBe(raw);
    expect(student.teacher).toBeInstanceOf(NeuralNetwork);
    expect(
      JSON.stringify(student.teacher!.levels.map((level) => level.weights)),
    ).toBe(JSON.stringify(source.levels.map((level) => level.weights)));
    // ...and the student brain took a gradient step toward it
    expect(
      JSON.stringify(student.brain!.levels.map((level) => level.weights)),
    ).not.toBe(studentBefore);

    // the same hydrated brain is reused on the next frames, not re-hydrated
    const teacher = student.teacher;
    race.update(2000);
    race.update(3000);
    expect(student.teacher).toBe(teacher);

    // replacing the champion invalidates the cache and re-hydrates
    const other = JSON.parse(JSON.stringify(source)) as never;
    other.score = 99;
    group1.best = { brain: other, score: 99 };
    race.update(4000);
    expect(student.teacher).not.toBe(teacher);
    expect(race.teacherScore(2)).toBe(99);
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

test('a training run freezes the student score and never promotes or saves', () => {
  const store = new Map<string, string>();
  const env = stubRaceEnv(store);
  const saved: number[] = [];
  try {
    const state = {} as typeof defaultState;
    const io = stubIo() as unknown as { saveBestModels: () => void };
    io.saveBestModels = () => void saved.push(1);
    const race = new ClimbRace(state, io as never, 0);
    race.initialize();

    const group1 = race.groups.find((g) => g.layer === 1)!;
    const teacher = new NeuralNetwork(10, 3, 1);
    teacher.score = 500;
    group1.best = { brain: teacher, score: 500 };

    expect(race.setTrainFrom(2, 1)).toBe(true);
    const group2 = race.groups.find((g) => g.layer === 2)!;
    const student = group2.pool[0];
    const frozen = student.brain!.score;
    const seedBefore = group2.scores.seed;
    const savedBefore = saved.length;

    // the climber is teacher-driven, so the run earns nothing for the student
    for (let now = 0; now < 40; now++) race.update(now * 16);
    expect(student.brain!.score).toBe(frozen);
    expect(group2.scores.seed).toBe(seedBefore);
    expect(group2.best).toBeNull();
    expect(saved.length).toBe(savedBefore);
  } finally {
    env.restore();
  }
});

test('the end of a run resets the selection to free training', () => {
  const store = new Map<string, string>();
  const env = stubRaceEnv(store);
  try {
    const state = {} as typeof defaultState;
    const race = new ClimbRace(state, stubIo(), 0);
    race.initialize();

    const group1 = race.groups.find((g) => g.layer === 1)!;
    group1.best = { brain: new NeuralNetwork(10, 3, 1), score: 10 };
    expect(race.setTrainFrom(2, 1)).toBe(true);
    expect(store.has(trainFromKey('climb', 2))).toBe(true);

    // a new seed ends the run: the group goes back to free training, its
    // disqualification flag is dropped and the persisted choice is gone
    race.applyUserSeed(99);
    const group2 = race.groups.find((g) => g.layer === 2)!;
    expect(group2.trainFrom).toBeNull();
    expect(group2.distillRun).toBe(false);
    expect(group2.pool.length).toBeGreaterThan(1);
    expect(store.has(trainFromKey('climb', 2))).toBe(false);
    expect(loadTrainFrom('climb', 2)).toBeNull();
  } finally {
    env.restore();
  }
});
