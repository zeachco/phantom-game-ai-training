/**
 * The shared headless environment for the tests: a Map-backed localStorage
 * installed on globalThis (with the function that puts the previous one
 * back), and a seeded generator so the measurements do not change between
 * runs. Each test file keeps its own stubs for the browser bits it touches
 * (document, history, confirm, ...); only the storage and the seed are the
 * same everywhere.
 */

/**
 * A Map-backed storage with the Storage surface the games use. The proxy
 * answers Object.keys(localStorage) with the stored keys, the way the
 * browser's storage does, so the enumeration paths (compactSaves,
 * discardGameModels, exportModels) run against the mock. Pass a Map to
 * wrap a store the test owns and asserts on.
 */
export function makeStorage(store = new Map<string, string>()): {
  store: Map<string, string>;
  storage: Storage;
} {
  const storage = new Proxy(
    {},
    {
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
    },
  ) as Storage;
  return { store, storage };
}

/**
 * Put a storage on globalThis.localStorage and return the function that
 * puts the previous one back. Call it again to reinstall; each call
 * restores whatever was there when it ran.
 */
export function installLocalStorage(storage: Storage): () => void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  return () => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  };
}

/** a seeded generator, so the measurement does not change between runs */
export function seededGenerator(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}
