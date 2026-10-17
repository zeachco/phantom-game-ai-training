import { expect, test } from 'bun:test';
import { NeuralNetwork } from '../src/ai/Network';
import {
  baseScores,
  clientId,
  fetchBaseModels,
  loadBaseModels,
  makeSubmitChecker,
  recordBaseScores,
  resetSubmitStateForTests,
  SERVER_URL,
  setPaceForTests,
} from '../src/ai/serverSync';
import { fileUtilities } from '../src/ai/utils';

/** Same localStorage mock as neural-saves.test.ts */
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

async function withFetch<T>(
  handler: (url: string, init?: RequestInit) => Response,
  run: () => T | Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  // The real fetch resolves a Promise; keep the shape so .then/.finally
  // chains in the code under test behave exactly like in the browser.
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(String(url), init))) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

const json = (data: unknown): Response =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const flush = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Submit tests run with tiny paces and a clean slate, so no test leaves a
 * pending retry timer or a 60s cooldown that would leak into the next one. */
function quickPace(): void {
  resetSubmitStateForTests();
  setPaceForTests({ cooldownMs: 0, backoffStartMs: 0, backoffCapMs: 0 });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function brain(score: number) {
  return {
    version: 1,
    score,
    mutationFactor: 0.5,
    mutationIndex: 1,
    diff: 0,
    date: '2026-01-01T00:00:00.000Z',
    kind: 'neural',
    levels: [
      {
        weights: [
          [0.1, 0.2],
          [0.3, 0.4],
          [0.5, 0.6],
        ],
      },
      {
        weights: [
          [0.7, 0.8],
          [0.9, 1],
        ],
      },
    ],
  };
}

function serverDoc(id: string, game: string, group: string, score: number) {
  return { _id: id, game, group, score, model: brain(score), submittedAt: 1 };
}

test('clientId is a stable v4 uuid persisted in localStorage', async () => {
  const { store, storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    const a = clientId();
    const b = clientId();
    expect(a).toBe(b);
    expect(UUID_RE.test(a)).toBe(true);
    expect(store.get('phantom_client_id')).toBe(a);
  });
});

test('fetchBaseModels keeps the best model per group, ignores foreign groups', async () => {
  const docs = [
    serverDoc('1', 'cave', 'cave_5', 100),
    serverDoc('2', 'cave', 'cave_5', 150),
    serverDoc('3', 'cave', 'cave_1', 50),
    serverDoc('4', 'cave', 'other_5', 999),
    { _id: '5', game: 'cave', group: 'cave_2', score: 10, model: null },
  ];
  await withStorage(makeStorage().storage as Storage, async () => {
    await withFetch(
      (url) => {
        expect(url).toBe(`${SERVER_URL}/api/models?game=cave&limit=200`);
        return json({ count: docs.length, models: docs });
      },
      async () => {
        const found = (await fetchBaseModels('cave')) as Record<
          string,
          { score: number }[]
        >;
        expect(Object.keys(found).sort()).toEqual(['cave_1', 'cave_5']);
        expect(found.cave_5[0].score).toBe(150);
        expect(found.cave_1[0].score).toBe(50);
      },
    );
  });
});

test('fetchBaseModels gives up on errors and non-OK answers, but a reachable-empty server is a valid (empty) answer', async () => {
  await withStorage(makeStorage().storage as Storage, async () => {
    await withFetch(
      () => {
        throw new Error('offline');
      },
      async () => {
        expect(await fetchBaseModels('cave')).toBeNull();
      },
    );
    await withFetch(
      () => new Response('nope', { status: 500 }),
      async () => {
        expect(await fetchBaseModels('cave')).toBeNull();
      },
    );
    await withFetch(
      () => json({ count: 0, models: [] }),
      async () => {
        expect(await fetchBaseModels('cave')).toEqual({});
      },
    );
  });
});

test('loadBaseModels records an empty snapshot for a reachable-empty server', async () => {
  const { store, storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    await withFetch(
      () => json({ count: 0, models: [] }),
      async () => {
        const res = await loadBaseModels('cave', fileUtilities('cave'));
        expect(res.source).toBe('none');
        expect(res.written).toEqual([]);
        // the server was queried and held nothing: a valid empty snapshot
        expect(store.get('phantom_base_cave')).toBe('{}');
        expect(baseScores('cave')).toEqual({});
      },
    );
  });
});

test('loadBaseModels prefers the server and records the base scores', async () => {
  const { store, storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    await withFetch(
      (url) =>
        url.includes('/api/models')
          ? json({
              count: 2,
              models: [
                serverDoc('1', 'cave', 'cave_5', 150),
                serverDoc('2', 'cave', 'cave_1', 50),
              ],
            })
          : new Response('unexpected', { status: 404 }),
      async () => {
        const res = await loadBaseModels('cave', fileUtilities('cave'));
        expect(res.source).toBe('server');
        expect(res.written.sort()).toEqual(['cave_1', 'cave_5']);
        expect(baseScores('cave')).toEqual({ cave_1: 50, cave_5: 150 });
        expect(store.get('cave_5')).toBeDefined();
        expect(store.get('phantom_base_cave')).toBe(
          JSON.stringify({ cave_5: 150, cave_1: 50 }),
        );
      },
    );
  });
});

test('loadBaseModels is server-only: an unreachable server leaves local saves untouched', async () => {
  const { store, storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    storage.setItem('cave_1', JSON.stringify([brain(99)]));
    await withFetch(
      () => {
        throw new Error('offline');
      },
      async () => {
        const res = await loadBaseModels('cave', fileUtilities('cave'));
        expect(res.source).toBe('none');
        expect(res.written).toEqual([]);
        // no bundled preset is fetched or written; the visitor's save wins
        expect(JSON.parse(store.get('cave_1') || '[]')[0].score).toBe(99);
        expect(store.get('cave_2')).toBeUndefined();
      },
    );
  });
});

test('loadBaseModels with onlyMissing keeps the visitor\u2019s existing groups', async () => {
  const { store, storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    storage.setItem('cave_1', JSON.stringify([brain(99)]));
    await withFetch(
      (url) =>
        url.includes('/api/models')
          ? json({
              count: 2,
              models: [
                serverDoc('1', 'cave', 'cave_1', 60),
                serverDoc('2', 'cave', 'cave_2', 80),
              ],
            })
          : new Response('no', { status: 404 }),
      async () => {
        const res = await loadBaseModels('cave', fileUtilities('cave'), true);
        expect(res.written).toEqual(['cave_2']);
        // the reference scores cover every group the source knew about
        expect(baseScores('cave')).toEqual({ cave_1: 60, cave_2: 80 });
        // the visitor's own save is untouched
        expect(JSON.parse(store.get('cave_1'))[0].score).toBe(99);
      },
    );
  });
});

test('makeSubmitChecker submits a beating group once, with the client id', async () => {
  const { storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    await withFetch(
      (url, init) => {
        calls.push({ url, init });
        return json({ created: 1, ids: ['x'] });
      },
      async () => {
        quickPace();
        recordBaseScores('cave', { cave_5: 100 });
        const checker = makeSubmitChecker('cave');

        checker('cave_5', [brain(90)]);
        await flush();
        expect(calls.length).toBe(0);

        checker('cave_5', [brain(90), brain(150)]);
        await flush();
        expect(calls.length).toBe(1);
        const call = calls[0];
        expect(call.url).toBe(`${SERVER_URL}/api/models`);
        expect(call.init?.method).toBe('POST');
        const body = JSON.parse(String(call.init?.body));
        expect(body.game).toBe('cave');
        expect(body.group).toBe('cave_5');
        expect(body.score).toBe(150);
        expect(body.model.score).toBe(150);
        const header = call.init?.headers as Record<string, string>;
        expect(UUID_RE.test(header['x-client-id'])).toBe(true);

        checker('cave_5', [brain(90), brain(150)]);
        await flush();
        expect(calls.length).toBe(1); // signature recorded, no resubmit
      },
    );
  });
});

test('makeSubmitChecker bootstraps when the server has no reference yet', async () => {
  const { storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    let calls = 0;
    await withFetch(
      () => {
        calls += 1;
        return json({ created: 1, ids: [] });
      },
      async () => {
        quickPace();
        // a fresh visitor never queried the server: the first save goes up
        const checker = makeSubmitChecker('cave');
        checker('cave_9', [brain(150)]);
        await flush();
        expect(calls).toBe(1);

        checker('cave_9', [brain(150)]);
        await flush();
        expect(calls).toBe(1); // signature recorded, no resubmit
      },
    );
  });
});

test('makeSubmitChecker resubmits when the server lost the model', async () => {
  const { storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    let calls = 0;
    await withFetch(
      () => {
        calls += 1;
        return json({ created: 1, ids: [] });
      },
      async () => {
        quickPace();
        recordBaseScores('cave', { cave_5: 100 });
        const checker = makeSubmitChecker('cave');
        checker('cave_5', [brain(150)]);
        await flush();
        expect(calls).toBe(1);

        // the server's best dropped below this model (e.g. the DB was reset):
        // the recorded signature is stale and the model goes back up
        recordBaseScores('cave', { cave_5: 80 });
        checker('cave_5', [brain(150)]);
        await flush();
        expect(calls).toBe(2);

        // the server holds at least this score again: quiet
        recordBaseScores('cave', { cave_5: 150 });
        checker('cave_5', [brain(150)]);
        await flush();
        expect(calls).toBe(2);
      },
    );
  });
});

test('makeSubmitChecker backoffs on failure and retries automatically', async () => {
  const { storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    let ok = false;
    let calls = 0;
    await withFetch(
      () => {
        calls += 1;
        return new Response('ok', { status: ok ? 200 : 500 });
      },
      async () => {
        resetSubmitStateForTests();
        setPaceForTests({
          cooldownMs: 0,
          backoffStartMs: 30,
          backoffCapMs: 100,
        });
        recordBaseScores('cave', { cave_5: 100 });
        const checker = makeSubmitChecker('cave');

        checker('cave_5', [brain(150)]);
        await flush(20);
        expect(calls).toBe(1); // the first attempt failed
        // during the backoff window, saves of the same model are skipped
        checker('cave_5', [brain(150)]);
        await flush(5);
        expect(calls).toBe(1);

        ok = true;
        await flush(60); // the retry timer fires at ~30ms
        expect(calls).toBe(2);
      },
    );
  });
});

test('makeSubmitChecker serializes submits one at a time', async () => {
  const { storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    await withFetch(
      () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        calls += 1;
        return new Promise<Response>((resolve) =>
          setTimeout(() => {
            active -= 1;
            resolve(json({ created: 1, ids: [] }));
          }, 25),
        );
      },
      async () => {
        quickPace();
        recordBaseScores('cave', { cave_7: 100, cave_8: 100 });
        const checker = makeSubmitChecker('cave');
        checker('cave_7', [brain(150)]);
        checker('cave_8', [brain(160)]); // enqueued behind the first
        await flush(100);
        expect(calls).toBe(2);
        expect(maxActive).toBe(1);
      },
    );
  });
});

test('makeSubmitChecker throttles per group and re-checks at the boundary', async () => {
  const { storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    let calls = 0;
    let lastScore = 0;
    await withFetch(
      (_url, init) => {
        calls += 1;
        lastScore = Number(JSON.parse(String(init?.body)).score);
        return json({ created: 1, ids: [] });
      },
      async () => {
        resetSubmitStateForTests();
        setPaceForTests({ cooldownMs: 40, backoffStartMs: 0, backoffCapMs: 0 });
        recordBaseScores('cave', { cave_9: 100 });
        const checker = makeSubmitChecker('cave');

        checker('cave_9', [brain(150)]);
        await flush(5);
        expect(calls).toBe(1);
        expect(lastScore).toBe(150);

        // a better model during the cooldown is throttled...
        checker('cave_9', [brain(150), brain(160)]);
        await flush(5);
        expect(calls).toBe(1);
        // ...but the boundary re-check sends the current champion
        await flush(60);
        expect(calls).toBe(2);
        expect(lastScore).toBe(160);
      },
    );
  });
});

test('fileUtilities onSaved submits a promoted model that beats the base', async () => {
  const { storage } = makeStorage();
  await withStorage(storage as Storage, async () => {
    let calls = 0;
    let group = '';
    await withFetch(
      (url, init) => {
        calls += 1;
        expect(url).toBe(`${SERVER_URL}/api/models`);
        group = String(JSON.parse(String(init?.body)).group);
        return new Response('ok', { status: 200 });
      },
      async () => {
        quickPace();
        recordBaseScores('cave', { cave_5: 100 });
        const io = fileUtilities('cave', makeSubmitChecker('cave'));

        const beating = new NeuralNetwork(12, 3, 2);
        beating.score = 150;
        io.saveModelList(5, [beating]);
        await flush();
        expect(calls).toBe(1);
        expect(group).toBe('cave_5');

        const below = new NeuralNetwork(12, 3, 2);
        below.score = 90;
        io.saveModelList(5, [below]);
        await flush();
        expect(calls).toBe(1); // below the base: no submit
      },
    );
  });
});
