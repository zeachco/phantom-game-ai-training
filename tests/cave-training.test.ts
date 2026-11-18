import { expect, test } from 'bun:test';
import { NeuralNetwork } from '../src/ai/Network';
import { fileUtilities } from '../src/ai/utils';
import { installLocalStorage, makeStorage } from './testEnv';

test('cave model saves use the cave_ prefix and round-trip', () => {
  const { store, storage } = makeStorage();
  const restore = installLocalStorage(storage);
  try {
    const io = fileUtilities('cave');
    const brain = new NeuralNetwork(54, 3, 2);
    io.saveModelList(2, [brain]);

    expect([...store.keys()]).toEqual(['cave_2']);
    const loaded = io.loadAllModelLayers(9);
    expect(loaded[2]?.length).toBe(1);
    for (const key of store.keys()) expect(key.startsWith('cave_')).toBe(true);
  } finally {
    restore();
  }
});
