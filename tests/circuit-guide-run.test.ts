import { expect, test } from 'bun:test';
import { NeuralNetwork } from '../src/ai/Network';
import type { ModelsByLayerCount } from '../src/ai/utils';
import { CircuitRace } from '../src/games/circuit/classes/CircuitRace';
import { config } from '../src/games/circuit/classes/Config';
import type { defaultState } from '../src/games/circuit/utilities';
import { loadTrainFrom } from '../src/utilities/trainFrom';

/** headless stand-ins for the DOM pieces the circuit car and track touch */
function makeContext() {
  const noop = () => {};
  return {
    font: '',
    textAlign: '',
    textBaseline: '',
    fillStyle: '',
    globalCompositeOperation: 'source-over',
    fillText: noop,
    clearRect: noop,
    fillRect: noop,
    drawImage: noop,
  };
}

function stubCircuitEnv(store: Map<string, string>) {
  const original = {
    localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    Image: Object.getOwnPropertyDescriptor(globalThis, 'Image'),
    Path2D: Object.getOwnPropertyDescriptor(globalThis, 'Path2D'),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => void store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      addEventListener: () => {},
      removeEventListener: () => {},
      createElement: (tag: string) =>
        tag === 'canvas'
          ? { width: 0, height: 0, getContext: () => makeContext() }
          : {},
    },
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class {
      src = '';
      onload: (() => void) | null = null;
      complete = false;
    },
  });
  Object.defineProperty(globalThis, 'Path2D', {
    configurable: true,
    value: class {
      moveTo() {}
      lineTo() {}
      closePath() {}
    },
  });
  function restore() {
    for (const [key, descriptor] of [
      ['localStorage', original.localStorage],
      ['document', original.document],
      ['Image', original.Image],
      ['Path2D', original.Path2D],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
  return { restore };
}

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

function makeRace() {
  const state = {} as typeof defaultState;
  const race = new CircuitRace(state, stubIo(), 0);
  race.initialize();
  // no crash risk while lap progress is steered by hand
  state.obstacles = [];
  return { state, race };
}

/** a stationary champion on layer 1 that steers the student straight */
function makeTeacher(race: CircuitRace) {
  const group1 = race.groups.find((group) => group.layer === 1);
  const free = race.groups.find((group) => group.layer === 3)?.pool[0];
  if (!group1) throw new Error('missing layer-1 group');
  if (!free?.brain) throw new Error('missing free car');
  const teacher = new NeuralNetwork(
    free.brain.inputCount,
    free.brain.outputCount,
    1,
  );
  teacher.process = () => [0, 0, 0];
  teacher.score = 42;
  group1.best = { brain: teacher, score: 42 };
  return teacher;
}

test('the circuit guide kills the student after a lap and a half', () => {
  const store = new Map<string, string>();
  const env = stubCircuitEnv(store);
  try {
    const { race } = makeRace();
    const teacher = makeTeacher(race);
    const group2 = race.groups.find((group) => group.layer === 2);
    if (!group2) throw new Error('missing layer-2 group');
    expect(race.setTrainFrom(2, 1)).toBe(true);
    const student = group2.pool[0];

    race.update(1000);
    expect(student.teacherFrames).toBeGreaterThan(0);
    expect(student.guideDriven).toBe(true);

    // one lap plus half the second: the guide is still driving
    student.laps = 1;
    student.nextCheckpoint = config.CHECKPOINTS / 2 - 1;
    race.update(2000);
    expect(group2.distillRun).toBe(true);
    expect(group2.trainFrom).toBe(1);

    // the halfway gate of the second lap ends the run: the student dies on
    // the spot, its position and timing having been shaped by the teacher
    student.nextCheckpoint = config.CHECKPOINTS / 2;
    race.update(3000);
    expect(group2.distillRun).toBe(false);
    expect(group2.trainFrom).toBeNull();
    expect(loadTrainFrom('circuit', 2)).toBeNull();
    expect(student.damaged).toBe(true);
    // the run is kept: the trained student becomes the group champion
    expect(group2.best).not.toBeNull();
    expect(group2.best?.brain).not.toBe(teacher);

    race.update(4000);
    expect(student.teacher).toBeNull();
    expect(student.distillRun).toBe(false);
  } finally {
    env.restore();
  }
});

test('a guide-driven student dies at the halfway point of the second lap', () => {
  const store = new Map<string, string>();
  const env = stubCircuitEnv(store);
  try {
    const { state, race } = makeRace();
    makeTeacher(race);
    const group2 = race.groups.find((group) => group.layer === 2);
    if (!group2) throw new Error('missing layer-2 group');
    expect(race.setTrainFrom(2, 1)).toBe(true);
    const student = group2.pool[0];
    race.update(1000); // the guide drives, tainting this car's completion
    expect(student.guideDriven).toBe(true);

    // at the halfway point of the second lap the student dies on the spot:
    // the teacher shaped its position and timing, so the run ends there
    student.laps = 1;
    student.nextCheckpoint = config.CHECKPOINTS / 2;
    race.update(2000);
    expect(student.damaged).toBe(true);
    expect(student.finished).toBe(false);
    expect(group2.distillRun).toBe(false);
    expect(group2.trainFrom).toBeNull();
    // the tainted run never banks a finish
    expect(race.completedFinishes.has('2')).toBe(false);
    expect(group2.scores.finished[String(race.seed)]).toBeUndefined();

    // after the corpse fades the group respawns as a full normal pool
    student.deathTime = 0;
    race.update(config.DEAD_LIFETIME + 1);
    expect(group2.pool).not.toContain(student);
    expect(group2.pool.length).toBe(config.CARS_PER_GROUP);
    const free = group2.pool[0];
    expect(free.guideDriven).toBe(false);

    // a finish by a car no guide ever piloted is a real finish
    const circuit = state.circuit;
    if (!circuit) throw new Error('missing circuit');
    const lapGate = circuit.checkpoints[config.CHECKPOINTS - 1];
    free.laps = 2;
    free.nextCheckpoint = config.CHECKPOINTS - 1;
    free.x = lapGate.x;
    free.y = lapGate.y;
    race.update(2 * config.DEAD_LIFETIME); // sitting on the lap gate: lap three
    expect(free.finished).toBe(true);
    expect(race.completedFinishes.has('2')).toBe(true);
    expect(group2.scores.finished[String(race.seed)]).toBe(true);
    expect(group2.mutationOnly).toBe(true);
  } finally {
    env.restore();
  }
});
