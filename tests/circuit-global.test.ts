import { expect, test } from 'bun:test';
import {
  globalRecordForGroup,
  globalRecordFromScores,
} from '../src/games/circuit/utilities';

/** Same localStorage mock as server-sync.test.ts */
function makeStorage() {
  const store = new Map<string, string>();
  const target = {};
  const storage = new Proxy(target, {
    get: (_target, property: string | symbol) => {
      if (property === 'getItem')
        return (key: string) => store.get(key) ?? null;
      if (property === 'setItem')
        return (key: string, value: string) => void store.set(key, value);
      if (property === 'removeItem')
        return (key: string) => void store.delete(key);
      if (property === 'clear') return () => void store.clear();
      if (property === 'key')
        return (index: number) => Array.from(store.keys())[index] ?? null;
      if (property === 'length') return store.size;
      return undefined;
    },
    ownKeys: () => Array.from(store.keys()),
    getOwnPropertyDescriptor: (_target, property) =>
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

async function withStorage<T>(
  storage: Storage,
  run: () => T | Promise<T>,
): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  try {
    return await run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

test('globalRecordFromScores calculates sum and count across history and live seed', () => {
  const res = globalRecordFromScores({
    current: 3,
    seed: 50,
    history: { '1': 100, '2': 200 },
  });
  expect(res).toEqual({ globalScore: 350, trackCount: 3 });
});

test('globalRecordFromScores ignores live seed if current seed is already folded into history', () => {
  const res = globalRecordFromScores({
    current: 3,
    seed: 20,
    history: { '3': 90, '1': 100 },
  });
  expect(res).toEqual({ globalScore: 190, trackCount: 2 });
});

test('globalRecordFromScores with empty history and live seed', () => {
  const res = globalRecordFromScores({
    current: 7,
    seed: 40,
    history: {},
  });
  expect(res).toEqual({ globalScore: 40, trackCount: 1 });
});

test('globalRecordForGroup reads from localStorage and handles keys, missing, corrupt', async () => {
  const { store, storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    // globalRecordForGroup('circuit_3') reads circuit_score_3
    store.set(
      'circuit_score_3',
      JSON.stringify({
        current: 3,
        seed: 50,
        history: { '1': 100, '2': 200 },
      }),
    );
    expect(globalRecordForGroup('circuit_3')).toEqual({
      globalScore: 350,
      trackCount: 3,
    });

    // globalRecordForGroup('circuit_mixed_2') reads circuit_score_mixed_2
    store.set(
      'circuit_score_mixed_2',
      JSON.stringify({
        current: 5,
        seed: 25,
        history: { '1': 100 },
      }),
    );
    expect(globalRecordForGroup('circuit_mixed_2')).toEqual({
      globalScore: 125,
      trackCount: 2,
    });

    // missing key -> null
    expect(globalRecordForGroup('circuit_4')).toBeNull();

    // corrupt JSON -> null
    store.set('circuit_score_9', 'not valid json');
    expect(globalRecordForGroup('circuit_9')).toBeNull();

    // non-circuit key (e.g. 'cave_5') -> null
    expect(globalRecordForGroup('cave_5')).toBeNull();
  });
});
