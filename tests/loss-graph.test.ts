import { describe, expect, test } from 'bun:test';
import { Distiller } from '../src/ai/distill';
import { NeuralNetwork } from '../src/ai/Network';

describe('distiller loss history', () => {
  test('each step appends the frame loss, oldest first', () => {
    const student = new NeuralNetwork(3, 2, 1);
    const teacher = new NeuralNetwork(3, 2, 1);
    const distiller = new Distiller(3, 1, []);
    distiller.step(student, teacher, [0.1, 0.2, 0.3], 0);
    expect(distiller.lossHistory).toHaveLength(1);
    expect(distiller.lossHistory[0]).toBe(distiller.lastLoss);
    distiller.step(student, teacher, [0.4, 0.2, 0.3], 1);
    expect(distiller.lossHistory).toHaveLength(2);
    expect(distiller.lossHistory[1]).toBe(distiller.lastLoss);
  });

  test('the history is capped at HISTORY_LIMIT, dropping the oldest', () => {
    const student = new NeuralNetwork(2, 2, 1);
    const teacher = new NeuralNetwork(2, 2, 1);
    const distiller = new Distiller(2, 0, []);
    for (let i = 0; i < Distiller.HISTORY_LIMIT + 5; i++)
      distiller.step(student, teacher, [0.5, 0.5], i);
    expect(distiller.lossHistory).toHaveLength(Distiller.HISTORY_LIMIT);
  });
});

/**
 * Minimal DOM and storage stubs for the loss-graph row of groupActions.ts,
 * the canvas gets a proxy context that accepts any method or style.
 */
interface AnyEl {
  [key: string]: any;
}

function makeCtx(): AnyEl {
  const state: Record<string, unknown> = {};
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop in state) return state[prop];
        return () => {};
      },
      set(_target, prop: string, value: unknown) {
        state[prop] = value;
        return true;
      },
    },
  ) as AnyEl;
}

function makeElement(tag: string, ctx: AnyEl): AnyEl {
  const classes = new Set<string>();
  const el: AnyEl = {
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    title: '',
    hidden: false,
    disabled: false,
    value: '',
    length: 0,
    type: '',
    id: '',
    htmlFor: '',
    style: {},
    children: [] as AnyEl[],
    parentElement: null as AnyEl | null,
    clientWidth: 0,
    clientHeight: 0,
    width: 0,
    height: 0,
    classList: {
      add: (...tokens: string[]) => {
        for (const token of tokens) classes.add(token);
        el.className = Array.from(classes).join(' ');
      },
      remove: () => {},
      contains: (token: string) => classes.has(token),
    },
    appendChild: (child: AnyEl) => {
      el.children.push(child);
      child.parentElement = el;
      return child;
    },
    append: (...items: AnyEl[]) => {
      for (const item of items) {
        if (item && typeof item === 'object') {
          el.children.push(item);
          item.parentElement = el;
        }
      }
    },
    addEventListener: () => {},
    setAttribute: () => {},
    getContext: () => (tag === 'canvas' ? ctx : null),
  };
  return el;
}

function stubEnvironment(): () => void {
  const store = new Map<string, string>();
  const ctx = makeCtx();
  const origDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const origStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage',
  );
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: (tag: string) => makeElement(tag, ctx) },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  });
  return () => {
    if (origDocument)
      Object.defineProperty(globalThis, 'document', origDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (origStorage)
      Object.defineProperty(globalThis, 'localStorage', origStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  };
}

describe('trainer loss graph row', () => {
  test('hidden outside training, showing the latest loss while distilling', async () => {
    const restore = stubEnvironment();
    try {
      const { createGroupActions } = await import(
        '../src/utilities/groupActions'
      );
      const panel = createGroupActions({
        game: 'highway',
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
        groups: [1, 2, 3, 'mixed'],
        trainFrom: () => null,
        setTrainFrom: () => {},
        teacherScore: () => null,
      });
      panel.apply(2);

      function findLossRow(el: AnyEl): AnyEl | null {
        if (
          typeof el.className === 'string' &&
          el.className.includes('group-panel-loss-row')
        )
          return el;
        for (const child of el.children ?? []) {
          const found = findLossRow(child);
          if (found) return found;
        }
        return null;
      }

      const row = findLossRow(panel.el as AnyEl);
      expect(row).toBeDefined();
      const canvas = row!.children.find((c) => c.tagName === 'CANVAS');
      expect(canvas).toBeDefined();

      // null or empty: the row stays or returns to hidden
      panel.drawLossGraph(null);
      expect(row!.hidden).toBe(true);

      // a distilling student: the row shows and reports the newest loss
      panel.drawLossGraph([0.5, 0.3, 0.25, 0.25]);
      expect(row!.hidden).toBe(false);
      const value = row!.children.find(
        (c) => c.className === 'group-panel-value',
      );
      expect(value.textContent).toBe((0.25).toPrecision(2));

      panel.drawLossGraph([]);
      expect(row!.hidden).toBe(true);

      panel.drawLossGraph([1, 2]);
      expect(row!.hidden).toBe(false);
    } finally {
      restore();
    }
  });
});
