import { describe, expect, test } from 'bun:test';

/**
 * Minimal DOM and Storage stubs for testing groupActions.ts.
 */
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

interface FakeElement {
  tagName: string;
  className: string;
  type: string;
  textContent: string;
  title: string;
  hidden: boolean;
  disabled: boolean;
  value: string;
  length: number;
  id: string;
  htmlFor: string;
  min: string;
  max: string;
  step: string;
  style: Record<string, string>;
  dataset: Record<string, string>;
  children: FakeElement[];
  parentElement: FakeElement | null;
  isConnected: boolean;
  listeners: Record<string, ((e?: unknown) => void)[]>;
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
    contains: (token: string) => boolean;
  };
  appendChild: (child: FakeElement) => FakeElement;
  append: (...children: (FakeElement | string)[]) => void;
  addEventListener: (type: string, listener: (e?: unknown) => void) => void;
  removeEventListener: (type: string, listener: (e?: unknown) => void) => void;
  setAttribute: (name: string, val: string) => void;
  removeAttribute: (name: string) => void;
  remove: () => void;
  getContext?: (type: string) => unknown;
}

function createFakeElement(tagName: string): FakeElement {
  const classes = new Set<string>();
  const listeners: Record<string, ((e?: unknown) => void)[]> = {};
  const children: FakeElement[] = [];

  const el: FakeElement = {
    tagName: tagName.toUpperCase(),
    className: '',
    type: '',
    textContent: '',
    title: '',
    hidden: false,
    disabled: false,
    value: '',
    length: 0,
    id: '',
    htmlFor: '',
    min: '',
    max: '',
    step: '',
    style: {},
    dataset: {},
    children,
    parentElement: null,
    isConnected: false,
    listeners,
    classList: {
      add: (...tokens: string[]) => {
        for (const t of tokens) classes.add(t);
        el.className = Array.from(classes).join(' ');
      },
      remove: (...tokens: string[]) => {
        for (const t of tokens) classes.delete(t);
        el.className = Array.from(classes).join(' ');
      },
      contains: (token: string) => classes.has(token),
    },
    appendChild: (child: FakeElement) => {
      children.push(child);
      child.parentElement = el;
      child.isConnected = el.isConnected;
      return child;
    },
    append: (...items: (FakeElement | string)[]) => {
      for (const item of items) {
        if (typeof item === 'object' && item !== null) {
          children.push(item);
          item.parentElement = el;
          item.isConnected = el.isConnected;
        }
      }
    },
    addEventListener: (type: string, listener: (e?: unknown) => void) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    },
    removeEventListener: (type: string, listener: (e?: unknown) => void) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter((l) => l !== listener);
    },
    setAttribute: (_name: string, _val: string) => {},
    removeAttribute: (_name: string) => {},
    remove: () => {
      if (el.parentElement) {
        const idx = el.parentElement.children.indexOf(el);
        if (idx >= 0) el.parentElement.children.splice(idx, 1);
        el.parentElement = null;
        el.isConnected = false;
      }
    },
  };
  if (tagName.toLowerCase() === 'canvas') {
    el.getContext = () => ({});
  }
  return el;
}

function stubEnvironment() {
  const { store, storage } = makeStorage();
  const body = createFakeElement('body');
  body.isConnected = true;

  const fakeDocument = {
    body,
    createElement: (tag: string) => createFakeElement(tag),
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const origDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const origStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const origConfirm = Object.getOwnPropertyDescriptor(globalThis, 'confirm');
  const origFetch = globalThis.fetch;
  const origRAF = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: fakeDocument,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  let confirmReturn = true;
  let lastConfirmMsg = '';
  Object.defineProperty(globalThis, 'confirm', {
    configurable: true,
    value: (msg: string) => {
      lastConfirmMsg = msg;
      return confirmReturn;
    },
  });
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (cb: FrameRequestCallback) => setTimeout(cb, 0),
  });

  return {
    store,
    storage,
    fakeDocument,
    setConfirm(val: boolean) {
      confirmReturn = val;
    },
    getLastConfirm() {
      return lastConfirmMsg;
    },
    restore() {
      if (origDocument) Object.defineProperty(globalThis, 'document', origDocument);
      else Reflect.deleteProperty(globalThis, 'document');
      if (origStorage) Object.defineProperty(globalThis, 'localStorage', origStorage);
      else Reflect.deleteProperty(globalThis, 'localStorage');
      if (origConfirm) Object.defineProperty(globalThis, 'confirm', origConfirm);
      else Reflect.deleteProperty(globalThis, 'confirm');
      if (origRAF) Object.defineProperty(globalThis, 'requestAnimationFrame', origRAF);
      else Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
      globalThis.fetch = origFetch;
    },
  };
}

describe('groupActions Delete remote handler', () => {
  test('danger style modifier is added to deleteBtn', async () => {
    const env = stubEnvironment();
    try {
      const { createGroupActions } = await import('../src/utilities/groupActions');
      const panel = createGroupActions({
        game: 'circuit',
        io: {
          importModels: () => [],
          discardModel: () => {},
          discardGameModels: () => {},
        },
        label: (v) => String(v),
        seedBest: () => null,
        globalBest: () => null,
        resetLocal: () => {},
        reinitialize: () => {},
        groups: [1, 2, 3, 4, 'mixed'],
        trainFrom: () => null,
        setTrainFrom: () => {},
        teacherScore: () => null,
      });

      // Find the Delete remote button
      function findBtn(el: FakeElement, text: string): FakeElement | undefined {
        if (el.textContent === text && el.tagName === 'BUTTON') return el;
        for (const child of el.children) {
          const found = findBtn(child, text);
          if (found) return found;
        }
        return undefined;
      }

      const root = panel.el as unknown as FakeElement;
      const deleteBtn = findBtn(root, 'Delete remote');
      expect(deleteBtn).toBeDefined();
      expect(deleteBtn!.classList.contains('group-panel-btn-danger')).toBe(true);
    } finally {
      env.restore();
    }
  });

  test('a. server confirms (fetch ok, deleted > 0) with a numeric group => remote delete happens AND local saves are removed', async () => {
    const env = stubEnvironment();
    try {
      const discarded: { layers: number; kind?: string }[] = [];
      let gameDiscarded = 0;

      // Seed local storage
      env.store.set('circuit_4', 'saved_model_data');
      env.store.set('circuit_mixed_2', 'saved_mixed_data');

      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        expect(init?.method).toBe('DELETE');
        expect(String(url)).toContain('group=circuit_4');
        return new Response(JSON.stringify({ deleted: 2 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }) as typeof fetch;

      const { createGroupActions } = await import('../src/utilities/groupActions');
      const panel = createGroupActions({
        game: 'circuit',
        io: {
          importModels: () => [],
          discardModel: (layers, kind) => {
            discarded.push({ layers, kind });
          },
          discardGameModels: () => {
            gameDiscarded++;
          },
        },
        label: (v) => String(v),
        seedBest: () => null,
        globalBest: () => null,
        resetLocal: () => {},
        reinitialize: () => {},
        groups: [1, 2, 3, 4, 'mixed'],
        trainFrom: () => null,
        setTrainFrom: () => {},
        teacherScore: () => null,
      });

      panel.apply(4);

      function findBtn(el: FakeElement, text: string): FakeElement | undefined {
        if (el.textContent === text && el.tagName === 'BUTTON') return el;
        for (const child of el.children) {
          const found = findBtn(child, text);
          if (found) return found;
        }
        return undefined;
      }

      const deleteBtn = findBtn(panel.el as unknown as FakeElement, 'Delete remote');
      expect(deleteBtn).toBeDefined();

      // Trigger click
      const clickHandler = deleteBtn!.listeners['click']?.[0];
      expect(clickHandler).toBeDefined();
      await clickHandler();

      expect(env.getLastConfirm()).toBe(
        'Delete circuit_4 from the server? This removes the publicly stored models of the group and the local save.',
      );
      expect(gameDiscarded).toBe(0);
      expect(discarded).toEqual([
        { layers: 4, kind: undefined },
        { layers: 2, kind: 'mixed' },
      ]);
    } finally {
      env.restore();
    }
  });

  test('b. server confirms with deleted === 0 => local saves are STILL removed', async () => {
    const env = stubEnvironment();
    try {
      const discarded: { layers: number; kind?: string }[] = [];
      let gameDiscarded = 0;

      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return new Response(JSON.stringify({ deleted: 0 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }) as typeof fetch;

      const { createGroupActions } = await import('../src/utilities/groupActions');
      const panel = createGroupActions({
        game: 'circuit',
        io: {
          importModels: () => [],
          discardModel: (layers, kind) => {
            discarded.push({ layers, kind });
          },
          discardGameModels: () => {
            gameDiscarded++;
          },
        },
        label: (v) => String(v),
        seedBest: () => null,
        globalBest: () => null,
        resetLocal: () => {},
        reinitialize: () => {},
        groups: [1, 2, 3, 4, 'mixed'],
        trainFrom: () => null,
        setTrainFrom: () => {},
        teacherScore: () => null,
      });

      panel.apply(4);

      function findBtn(el: FakeElement, text: string): FakeElement | undefined {
        if (el.textContent === text && el.tagName === 'BUTTON') return el;
        for (const child of el.children) {
          const found = findBtn(child, text);
          if (found) return found;
        }
        return undefined;
      }

      const deleteBtn = findBtn(panel.el as unknown as FakeElement, 'Delete remote');
      const clickHandler = deleteBtn!.listeners['click']?.[0];
      await clickHandler();

      expect(discarded).toEqual([
        { layers: 4, kind: undefined },
        { layers: 2, kind: 'mixed' },
      ]);
      expect(gameDiscarded).toBe(0);
    } finally {
      env.restore();
    }
  });

  test('c. fetch fails / all results null (offline) => NO local discards recorded', async () => {
    const env = stubEnvironment();
    try {
      const discarded: { layers: number; kind?: string }[] = [];
      let gameDiscarded = 0;

      globalThis.fetch = (async () => {
        throw new Error('network down');
      }) as typeof fetch;

      const { createGroupActions } = await import('../src/utilities/groupActions');
      const panel = createGroupActions({
        game: 'circuit',
        io: {
          importModels: () => [],
          discardModel: (layers, kind) => {
            discarded.push({ layers, kind });
          },
          discardGameModels: () => {
            gameDiscarded++;
          },
        },
        label: (v) => String(v),
        seedBest: () => null,
        globalBest: () => null,
        resetLocal: () => {},
        reinitialize: () => {},
        groups: [1, 2, 3, 4, 'mixed'],
        trainFrom: () => null,
        setTrainFrom: () => {},
        teacherScore: () => null,
      });

      panel.apply(4);

      function findBtn(el: FakeElement, text: string): FakeElement | undefined {
        if (el.textContent === text && el.tagName === 'BUTTON') return el;
        for (const child of el.children) {
          const found = findBtn(child, text);
          if (found) return found;
        }
        return undefined;
      }

      const deleteBtn = findBtn(panel.el as unknown as FakeElement, 'Delete remote');
      const clickHandler = deleteBtn!.listeners['click']?.[0];
      await clickHandler();

      expect(discarded).toEqual([]);
      expect(gameDiscarded).toBe(0);
    } finally {
      env.restore();
    }
  });

  test('d. all view (value 0) with a confirmed result => discardGameModels() called exactly once', async () => {
    const env = stubEnvironment();
    try {
      const discarded: { layers: number; kind?: string }[] = [];
      let gameDiscarded = 0;

      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return new Response(JSON.stringify({ deleted: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }) as typeof fetch;

      const { createGroupActions } = await import('../src/utilities/groupActions');
      const panel = createGroupActions({
        game: 'circuit',
        io: {
          importModels: () => [],
          discardModel: (layers, kind) => {
            discarded.push({ layers, kind });
          },
          discardGameModels: () => {
            gameDiscarded++;
          },
        },
        label: (v) => String(v),
        seedBest: () => null,
        globalBest: () => null,
        resetLocal: () => {},
        reinitialize: () => {},
        groups: [1, 2, 3, 4, 'mixed'],
        trainFrom: () => null,
        setTrainFrom: () => {},
        teacherScore: () => null,
      });

      panel.apply(0);

      function findBtn(el: FakeElement, text: string): FakeElement | undefined {
        if (el.textContent === text && el.tagName === 'BUTTON') return el;
        for (const child of el.children) {
          const found = findBtn(child, text);
          if (found) return found;
        }
        return undefined;
      }

      const deleteBtn = findBtn(panel.el as unknown as FakeElement, 'Delete remote');
      const clickHandler = deleteBtn!.listeners['click']?.[0];
      await clickHandler();

      expect(env.getLastConfirm()).toBe(
        'Delete all circuit models from the server and remove all local saves?',
      );
      expect(gameDiscarded).toBe(1);
      expect(discarded).toEqual([]);
    } finally {
      env.restore();
    }
  });

  test('mixed view with a confirmed result => io.discardModel(MIXED_LEVELS, MIXED_KIND)', async () => {
    const env = stubEnvironment();
    try {
      const discarded: { layers: number; kind?: string }[] = [];
      let gameDiscarded = 0;

      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return new Response(JSON.stringify({ deleted: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }) as typeof fetch;

      const { createGroupActions } = await import('../src/utilities/groupActions');
      const panel = createGroupActions({
        game: 'circuit',
        io: {
          importModels: () => [],
          discardModel: (layers, kind) => {
            discarded.push({ layers, kind });
          },
          discardGameModels: () => {
            gameDiscarded++;
          },
        },
        label: (v) => String(v),
        seedBest: () => null,
        globalBest: () => null,
        resetLocal: () => {},
        reinitialize: () => {},
        groups: [1, 2, 3, 4, 'mixed'],
        trainFrom: () => null,
        setTrainFrom: () => {},
        teacherScore: () => null,
      });

      panel.apply('mixed');

      function findBtn(el: FakeElement, text: string): FakeElement | undefined {
        if (el.textContent === text && el.tagName === 'BUTTON') return el;
        for (const child of el.children) {
          const found = findBtn(child, text);
          if (found) return found;
        }
        return undefined;
      }

      const deleteBtn = findBtn(panel.el as unknown as FakeElement, 'Delete remote');
      const clickHandler = deleteBtn!.listeners['click']?.[0];
      await clickHandler();

      expect(env.getLastConfirm()).toBe(
        'Delete circuit_mixed_2 from the server? This removes the publicly stored models of the group and the local save.',
      );
      expect(gameDiscarded).toBe(0);
      expect(discarded).toEqual([{ layers: 2, kind: 'mixed' }]);
    } finally {
      env.restore();
    }
  });

  test('a confirmed delete resets the experiment', async () => {
    const env = stubEnvironment();
    try {
      let resets = 0;

      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        return new Response(JSON.stringify({ deleted: 2 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }) as typeof fetch;

      const { createGroupActions } = await import('../src/utilities/groupActions');
      const panel = createGroupActions({
        game: 'circuit',
        io: {
          importModels: () => [],
          discardModel: () => {},
          discardGameModels: () => {},
        },
        label: (v) => String(v),
        seedBest: () => null,
        globalBest: () => null,
        resetLocal: () => {},
        reinitialize: () => {
          resets++;
        },
        groups: [1, 2, 3, 4, 'mixed'],
        trainFrom: () => null,
        setTrainFrom: () => {},
        teacherScore: () => null,
      });

      panel.apply(4);

      function findBtn(el: FakeElement, text: string): FakeElement | undefined {
        if (el.textContent === text && el.tagName === 'BUTTON') return el;
        for (const child of el.children) {
          const found = findBtn(child, text);
          if (found) return found;
        }
        return undefined;
      }

      const deleteBtn = findBtn(panel.el as unknown as FakeElement, 'Delete remote');
      const clickHandler = deleteBtn!.listeners['click']?.[0];
      await clickHandler();

      expect(resets).toBe(1);
    } finally {
      env.restore();
    }
  });

  test('an offline delete does not reset the experiment', async () => {
    const env = stubEnvironment();
    try {
      let resets = 0;

      globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
        throw new Error('network down');
      }) as typeof fetch;

      const { createGroupActions } = await import('../src/utilities/groupActions');
      const panel = createGroupActions({
        game: 'circuit',
        io: {
          importModels: () => [],
          discardModel: () => {},
          discardGameModels: () => {},
        },
        label: (v) => String(v),
        seedBest: () => null,
        globalBest: () => null,
        resetLocal: () => {},
        reinitialize: () => {
          resets++;
        },
        groups: [1, 2, 3, 4, 'mixed'],
        trainFrom: () => null,
        setTrainFrom: () => {},
        teacherScore: () => null,
      });

      panel.apply(4);

      function findBtn(el: FakeElement, text: string): FakeElement | undefined {
        if (el.textContent === text && el.tagName === 'BUTTON') return el;
        for (const child of el.children) {
          const found = findBtn(child, text);
          if (found) return found;
        }
        return undefined;
      }

      const deleteBtn = findBtn(panel.el as unknown as FakeElement, 'Delete remote');
      const clickHandler = deleteBtn!.listeners['click']?.[0];
      await clickHandler();

      expect(resets).toBe(0);
    } finally {
      env.restore();
    }
  });
});
