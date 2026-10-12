import { expect, test } from 'bun:test';
import { NeuralNetwork } from '../src/ai/Network';
import { fileUtilities } from '../src/ai/utils';

function makeStorage(maxModels = Infinity) {
  const store = new Map<string, string>();
  const target = {};
  const storage = new Proxy(target, {
    get: (_target, property: string | symbol) => {
      if (property === 'getItem')
        return (key: string) => store.get(key) ?? null;
      if (property === 'setItem')
        return (key: string, value: string) => {
          if (JSON.parse(value).length > maxModels)
            throw new DOMException('quota exceeded', 'QuotaExceededError');
          store.set(key, value);
        };
      if (property === 'removeItem')
        return (key: string) => void store.delete(key);
      if (property === 'clear') return () => void store.clear();
      if (property === 'key')
        return (index: number) => Array.from(store.keys())[index] ?? null;
      if (property === 'length') return store.size;
      return undefined;
    },
    ownKeys: () => Array.from(store.keys()),
    getOwnPropertyDescriptor: (_target, property: string | symbol) =>
      store.has(String(property))
        ? {
            configurable: true,
            enumerable: true,
            value: store.get(String(property)),
          }
        : undefined,
  });
  return { store, storage };
}

function withStorage<T>(storage: Storage, run: () => T): T {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  try {
    return run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

test('neural saves omit runtime arrays and shrink float payloads', () => {
  const { store, storage } = makeStorage();
  withStorage(storage as Storage, () => {
    const brain = new NeuralNetwork(36, 4, 5);
    const full = JSON.stringify([brain]).length;
    const io = fileUtilities('cave');
    io.saveModelList(5, [brain]);

    const savedRaw = store.get('cave_5');
    if (!savedRaw) throw new Error('model save was not written');
    const saved = JSON.parse(savedRaw);
    expect(savedRaw.length).toBeLessThan(full * 0.6);
    expect(saved[0].levels[0].inputs).toBeUndefined();
    expect(saved[0].levels[0].outputs).toBeUndefined();
    expect(saved[0].levels[0].weights[0][0]).toBe(
      Math.round(brain.levels[0].weights[0][0] * 1000) / 1000,
    );
  });
});

test('neural saves keep the newest model when the full hall of fame exceeds quota', () => {
  const { store, storage } = makeStorage(1);
  withStorage(storage as Storage, () => {
    const io = fileUtilities('cave');
    io.saveModelList(2, [
      new NeuralNetwork(12, 3, 2),
      new NeuralNetwork(12, 3, 2),
    ]);

    const savedRaw = store.get('cave_2');
    if (!savedRaw) throw new Error('quota fallback did not write a model');
    expect(JSON.parse(savedRaw).length).toBe(1);
  });
});

test('compactSaves rewrites old model payloads without touching score records', () => {
  const { store, storage } = makeStorage();
  withStorage(storage as Storage, () => {
    const brain = new NeuralNetwork(36, 4, 5);
    const oldModels = JSON.stringify([brain]);
    const scores = JSON.stringify({ total: 12, history: {} });
    storage.setItem('cave_5', oldModels);
    storage.setItem('cave_score_5', scores);

    fileUtilities('cave').compactSaves();

    const compacted = store.get('cave_5');
    if (!compacted) throw new Error('legacy model save was removed');
    expect(compacted.length).toBeLessThan(oldModels.length);
    expect(store.get('cave_score_5')).toBe(scores);
  });
});
