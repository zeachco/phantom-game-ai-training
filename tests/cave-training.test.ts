import { expect, test } from 'bun:test';
import { NeuralNetwork } from '../src/ai/Network';
import { fileUtilities } from '../src/ai/utils';

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

test('cave model saves use the cave_ prefix and round-trip', () => {
  const { store, storage } = stubStorage();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  try {
    const io = fileUtilities('cave');
    const brain = new NeuralNetwork(54, 3, 2);
    io.saveModelList(2, [brain]);

    expect([...store.keys()]).toEqual(['cave_2']);
    const loaded = io.loadAllModelLayers(9);
    expect(loaded[2]?.length).toBe(1);
    for (const key of store.keys()) expect(key.startsWith('cave_')).toBe(true);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
