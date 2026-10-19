import { expect, test } from 'bun:test';
import { MixedNetwork } from '../src/ai/Mixed';
import {
  clampOutput,
  NeuralNetwork,
  teachingRate,
  TEACHING_FRAMES,
  TEACHING_RATE,
} from '../src/ai/Network';
import type { ModelsByLayerCount } from '../src/ai/utils';
import { ClimbRace } from '../src/games/climb/classes/ClimbRace';
import type { defaultState } from '../src/games/climb/utilities';
import {
  loadTrainFrom,
  loadTrainFroms,
  saveTrainFrom,
  studentLabel,
  TRAINING_EMOJI,
  trainedBrain,
  trainFromKey,
  withTrainedBrain,
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
  expect(loss).toBeLessThan(first * 0.01);
  // the loss is the clamped one: past the applied range it plateaus at zero,
  // so the outputs are asserted on that same range
  expect(Math.abs(clampOutput(out[0]) - 1)).toBeLessThan(5e-3);
  expect(Math.abs(clampOutput(out[1]) - 0)).toBeLessThan(5e-3);
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

test('a trained brain keeps its weights but not its disqualified score', () => {
  const source = new NeuralNetwork(2, 2, 1);
  for (const level of source.levels)
    for (const row of level.weights) row.fill(0.5);
  source.score = 999;

  const trained = trainedBrain(source, 40);
  // the weights are the student's, the score is the group's previous one
  expect(trained.score).toBe(40);
  expect(trained.levels.map((level) => level.weights)).toEqual(
    source.levels.map((level) => level.weights),
  );
  // it is a copy: the live student is not the saved model
  expect(trained).not.toBe(source);
  trained.levels[0].weights[0][0] = 1;
  expect(source.levels[0].weights[0][0]).toBe(0.5);

  // the trained brain heads the group's save list, inside the window
  const saved = [source, source, new NeuralNetwork(2, 2, 1)];
  const list = withTrainedBrain(saved, trained, 2);
  expect(list.length).toBe(2);
  expect(list[0]).toBe(trained);
});

test('the next generation starts from the weights the student just learned', () => {
  const store = new Map<string, string>();
  const env = stubRaceEnv(store);
  try {
    const state = {} as typeof defaultState;
    const race = new ClimbRace(state, stubIo(), 0);
    race.initialize();

    const group1 = race.groups.find((g) => g.layer === 1)!;
    const teacher = new NeuralNetwork(10, 3, 1);
    teacher.process = () => [1, 0, 0];
    teacher.score = 500;
    group1.best = { brain: teacher, score: 500 };

    expect(race.setTrainFrom(2, 1)).toBe(true);
    const group2 = race.groups.find((g) => g.layer === 2)!;
    // train for a while, then remember what the student learned
    for (let now = 0; now < 30; now++) race.update(now * 16);
    const learned = JSON.stringify(
      group2.pool[0].brain!.levels.map((level) => level.weights),
    );

    // the run ends on a new seed and hands the trained weights to group 2
    race.applyUserSeed(99);
    const trainedGroup = race.groups.find((g) => g.layer === 2)!;
    expect(trainedGroup.trainFrom).toBeNull();
    expect(trainedGroup.distillRun).toBe(false);
    expect(
      JSON.stringify(
        trainedGroup.best?.brain.levels.map((level) => level.weights),
      ),
    ).toBe(learned);
    // the score stays where the group was, the run sets no record
    expect(trainedGroup.best?.score).toBe(0);
    expect(
      JSON.stringify(
        state.sortedModels[2][0].levels.map((level) => level.weights),
      ),
    ).toBe(learned);

    // the freshly spawned first slot mutates with a zero factor: an exact copy
    expect(
      JSON.stringify(
        trainedGroup.pool[0].brain!.levels.map((level) => level.weights),
      ),
    ).toBe(learned);
  } finally {
    env.restore();
  }
});

test('a long distillation stays finite instead of overflowing', () => {
  // a wide fan-in against a loud teacher: the raw step used to grow with every
  // frame until the weights reached Infinity, and a saved brain kept that
  const inputs = new Array(25).fill(0.8);
  const teacher = new NeuralNetwork(25, 3, 1);
  teacher.process = () => [1, 1, 1];
  const student = new NeuralNetwork(25, 3, 1);
  for (let i = 0; i < 2000; i++) student.train(inputs, teacher.process(inputs));

  const weights = student.levels.flatMap((level) =>
    level.weights.flatMap((row) => row),
  );
  expect(weights.every((weight) => Number.isFinite(weight))).toBe(true);
  expect(Math.max(...weights.map(Math.abs))).toBeLessThan(1000);
  // and it did learn: the applied control follows the teacher
  for (const value of student.process(inputs))
    expect(Math.abs(clampOutput(value) - 1)).toBeLessThan(0.35);
});

test('the teaching step starts eager and settles over 10000 frames', () => {
  // higher at first, then only decreasing until it reaches the base rate
  expect(teachingRate(0)).toBeCloseTo(TEACHING_RATE * 4, 6);
  expect(teachingRate(0)).toBeGreaterThan(teachingRate(1));
  expect(teachingRate(TEACHING_FRAMES / 2)).toBeCloseTo(TEACHING_RATE * 2.5, 6);
  expect(teachingRate(TEACHING_FRAMES)).toBeCloseTo(TEACHING_RATE, 6);
  // the schedule is over: a long run keeps polishing at the base rate
  expect(teachingRate(TEACHING_FRAMES * 3)).toBeCloseTo(TEACHING_RATE, 6);

  let previous = teachingRate(0);
  for (let frame = 100; frame <= TEACHING_FRAMES; frame += 100) {
    const rate = teachingRate(frame);
    expect(rate).toBeLessThanOrEqual(previous);
    previous = rate;
  }
});

test('only the applied control range is learned, not the raw output', () => {
  // the games clamp outputs to [-1, 1]: a target of 50 steers like 1
  const student = new NeuralNetwork(2, 1, 1);
  for (let frame = 0; frame < 400; frame++)
    student.train([1, 1], [50], teachingRate(frame));

  const [out] = student.process([1, 1]);
  // the raw output may sit past the bound, the applied value is what matters
  expect(clampOutput(out)).toBeCloseTo(1, 2);
  expect(Number.isFinite(out)).toBe(true);
  expect(clampOutput(50)).toBe(1);
  expect(clampOutput(-50)).toBe(-1);
});

test('a deep teacher is distilled through the clamped signal without diverging', () => {
  // 9 levels is the deepest the games build, and its raw outputs reach the
  // hundreds: the old loss chased those and blew the weights up
  const teacher = new NeuralNetwork(25, 4, 9);
  const student = new NeuralNetwork(25, 4, 9);
  let seed = 12345;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const sample = () => new Array(25).fill(0).map(random);

  /** the gap between the two answers, measured on the applied control range */
  const gap = () => {
    let error = 0;
    for (let i = 0; i < 20; i++) {
      const inputs = sample();
      const out = student.process(inputs).map(clampOutput);
      const target = teacher.process(inputs).map(clampOutput);
      for (let k = 0; k < out.length; k++) error += (out[k] - target[k]) ** 2;
    }
    return error / 80;
  };
  const before = gap();

  for (let frame = 0; frame < 4000; frame++) {
    const inputs = sample();
    student.train(inputs, teacher.process(inputs), teachingRate(frame));
  }

  const weights = student.levels.flatMap((level) =>
    level.weights.flatMap((row) => row),
  );
  expect(weights.every((weight) => Number.isFinite(weight))).toBe(true);
  expect(Math.max(...weights.map(Math.abs))).toBeLessThan(1000);
  // it cannot fully copy a saturated 9 level teacher, but it closes over half
  // of the gap and never diverges
  expect(gap()).toBeLessThan(before / 2);
});
