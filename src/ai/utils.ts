import { isSameObject } from '../utilities/object';
import { DEFAULT_KIND, type NeuralNetwork } from './Network';

/** Utility for colors for controllers */
export const CTRL_COLORS = [
  '#ffffdd', // mixed
  '#ff0000', // 1
  '#00aaff', // 2
  '#ffff00', // 3
  '#00ff00', // 4
  '#ff69ff', // 5
  '#00ffff', // 6
  '#ff8800', // 7
  '#447722', // 8
  '#aa22ff', // 9
];

export const PLAYER_COLOR = '#ddffbb';

/**
 * Persisted weights keep this many decimals. Full float64 text is ~18 chars
 *  per weight and the hall of fame of every layer together overflows the
 *  ~5 MB localStorage budget, while 3 decimals still resolves 1000 steps per
 *  weight, far finer than any mutation factor the games use.
 */
export const SAVE_PRECISION = 3;
const SAVE_SCALE = 10 ** SAVE_PRECISION;

/**
 * index is the layer amount
 * value is a list of sorted NeuralNetwork by score
 */

export type ModelsByLayerCount = (
  | (Omit<NeuralNetwork, 'mutate'> & {
      diff?: number;
      date?: string;
    })
  // biome-ignore lint/suspicious/noExplicitAny: saved models are loosely typed (mixed brains add expertIds/selectionCounts, some callers pass a single item), tightening this needs a wider refactor
  | any
)[];

/** The exact node counts a saved network must have at each level boundary. */
export interface ModelShape {
  levelSizes: number[];
  /** Saved mixed brains must keep their selector kind separate from regular brains. */
  kind?: string;
  requireKind?: boolean;
  /** Mixed brains may also identify the expert slots they route to. */
  expertIds?: string[];
}

/** Matches the layer sizing used by NeuralNetwork without constructing a brain. */
export function networkLevelSizes(
  inputCount: number,
  outputCount: number,
  layerCount: number,
) {
  return Array.from({ length: layerCount + 1 }, (_value, index) =>
    Math.floor(inputCount + ((outputCount - inputCount) * index) / layerCount),
  );
}

/**
 * Checks the complete persisted shape before it can reach NeuralNetwork.hydrate
 * or mutate. JSON is untrusted here: malformed rows, ragged matrices, and
 * changed sensor/control dimensions all otherwise fail later in the game loop.
 */
export function isModelShapeValid(
  model: unknown,
  shape: ModelShape,
): model is ModelsByLayerCount[number] {
  if (
    !shape.levelSizes.length ||
    shape.levelSizes.some((size) => !Number.isInteger(size) || size < 1)
  )
    return false;
  if (!model || typeof model !== 'object') return false;
  const saved = model as {
    levels?: unknown;
    kind?: unknown;
    expertIds?: unknown;
  };
  if (
    !Array.isArray(saved.levels) ||
    saved.levels.length !== shape.levelSizes.length - 1
  )
    return false;
  if (
    shape.kind &&
    (shape.requireKind
      ? saved.kind !== shape.kind
      : saved.kind !== undefined && saved.kind !== shape.kind)
  )
    return false;
  if (shape.expertIds) {
    if (
      saved.expertIds !== undefined &&
      (!Array.isArray(saved.expertIds) ||
        saved.expertIds.length !== shape.expertIds.length ||
        saved.expertIds.some((id, index) => id !== shape.expertIds?.[index]))
    )
      return false;
  }

  return saved.levels.every((level, index) => {
    if (!level || typeof level !== 'object') return false;
    const weights = (level as { weights?: unknown }).weights;
    const inputCount = shape.levelSizes[index];
    const outputCount = shape.levelSizes[index + 1];
    return (
      Array.isArray(weights) &&
      weights.length === inputCount &&
      weights.every(
        (row) =>
          Array.isArray(row) &&
          row.length === outputCount &&
          row.every(
            (weight) => typeof weight === 'number' && Number.isFinite(weight),
          ),
      )
    );
  });
}

export function fileUtilities(game = '') {
  /** regular brains keep their historical namespace, other kinds get their own */
  const name = (layer: number, kind: string = DEFAULT_KIND) =>
    kind === DEFAULT_KIND ? `${game}_${layer}` : `${game}_${kind}_${layer}`;

  return {
    saveBestModels,
    saveModelList,
    loadAllModelLayers,
    compactSaves,
    discardModels,
    discardModel,
    discardGameModels,
    exportModels,
    importModels,
  };
  /** Strips inputs/outputs and quantizes weights on write. */
  function compactModel(model: unknown) {
    const { levels, ...rest } = model as NeuralNetwork;
    return {
      ...rest,
      levels: (levels || []).map((l) => ({
        weights: (l.weights || []).map((row) =>
          row.map((weight) => Math.round(weight * SAVE_SCALE) / SAVE_SCALE),
        ),
      })),
    };
  }
  /** Writes a list with quota-safe degradation. */
  function writeModels(namespace: string, models: unknown[]): boolean {
    for (let keep = models.length; keep >= 1; keep--) {
      try {
        localStorage.setItem(
          namespace,
          JSON.stringify(models.slice(0, keep).map(compactModel)),
        );
        return true;
      } catch (err) {
        if (keep === 1)
          console.warn(`Could not save ${namespace}, storage is full`, err);
      }
    }
    return false;
  }
  /**
   * Rewrites this game's model saves in the compact format. Saves written
   *  before the format change carried full float text and the per-level
   *  scratch arrays, which together overflow the storage budget; this
   *  reclaims that space at boot instead of waiting for every layer to
   *  promote again.
   */
  function compactSaves() {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(`${game}_`)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let models: unknown;
      try {
        models = JSON.parse(raw);
      } catch {
        continue;
      }
      if (!isSavedModelList(models)) continue;
      const compact = JSON.stringify(models.map(compactModel));
      if (compact.length >= raw.length) continue;
      writeModels(key, models);
    }
  }

  function isSavedModelList(value: unknown): value is NeuralNetwork[] {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(
        (model) => !!model && Array.isArray((model as NeuralNetwork).levels),
      )
    );
  }
  function saveModels(
    layers: number,
    models: NeuralNetwork[],
    kind: string = DEFAULT_KIND,
    namespace = name(layers, kind),
  ) {
    const olds = loadModels(layers, kind);
    const exclude: (keyof NeuralNetwork)[] = [
      'id',
      'version',
      'mutationIndex',
      'mutationFactor',
      'score',
    ];
    const label = `${models.length}x ${kind} ${layers}-${models[0]?.version}`;
    const diff = olds[0] ? models[0].score - olds[0].score : models[0].score;
    const score = `${models[0].score.toFixed(4)} ${diff.toFixed(10)}`;
    if (diff < 0) {
      writeModels(
        namespace,
        olds.map((m) => ({ ...m, diff, date: new Date() })),
      );
    } else if (isSameObject(models.map(compactModel), olds, exclude)) {
      // No save occurred, so keep the console quiet.
    } else {
      const save = models.map((m) => ({
        ...m,
        version: m.version + 1,
        diff,
        date: new Date(),
      }));
      console.info(`👍 ${label} scores ${score}`);
      writeModels(namespace, save);
    }
  }

  /**
   * Writes the given list into the layer namespace in compact form.
   * saveBestModels keeps only the top one per complexity; the circuit's hall
   * of fame keeps several recent lines per layer, so it stores that window.
   */
  function saveModelList(
    layers: number,
    models: NeuralNetwork[],
    kind: string = DEFAULT_KIND,
    namespace = name(layers, kind),
  ) {
    writeModels(namespace, models);
  }

  function loadModels(
    layers: number,
    kind: string = DEFAULT_KIND,
    namespace = name(layers, kind),
    shape?: ModelShape,
  ) {
    const data = localStorage.getItem(namespace);
    if (!data) return [] as ModelsByLayerCount[number];

    try {
      let models = JSON.parse(data);
      // saves from before the multi-model era hold a single network object
      if (models && !Array.isArray(models)) models = [models];
      if (
        !Array.isArray(models) ||
        (shape &&
          (!models.length ||
            !models.every((model) => isModelShapeValid(model, shape))))
      ) {
        throw new Error('incompatible model shape');
      }
      return models as ModelsByLayerCount[number];
    } catch (err) {
      // A bad group is removed immediately, so it cannot be encountered again
      // by a later spawn, save, or mixed-expert hydration.
      localStorage.removeItem(namespace);
      console.warn(`Discarding invalid save ${namespace}`, err);
      return [] as ModelsByLayerCount[number];
    }
  }

  /**
   * Receives all neural networks with a score and determine how to same them
   * stored by compatibility (neural networks are easier to mutate from similar neural network complexity AKA same amount of levels)
   * Kinds are kept apart, a mixed brain and a regular brain of the same depth
   * are not interchangeable.
   */
  function saveBestModels(models: NeuralNetwork[], amountPerComplexity = 1) {
    const byKind: Record<string, NeuralNetwork[][]> = {};
    models.forEach((model) => {
      const kind = model.kind || DEFAULT_KIND;
      byKind[kind] = byKind[kind] || [];
      const save = byKind[kind];
      const space = model.levels.length;
      const previous = save[space] || [];
      if (previous.length >= amountPerComplexity) return;
      save[space] = [...previous, model].sort((a, b) => b.score - a.score);
    });

    Object.keys(byKind).forEach((kind) => {
      byKind[kind].forEach((models, layersNb) => {
        saveModels(layersNb, models, kind);
      });
    });
  }

  function loadAllModelLayers(
    maxLayer = 1,
    kind: string = DEFAULT_KIND,
    shapeForLayer?: (layers: number) => ModelShape,
  ) {
    const load: ModelsByLayerCount[] = [];
    for (let i = 1; i <= maxLayer; i++) {
      const model = loadModels(i, kind, name(i, kind), shapeForLayer?.(i));
      if (model.length) load[i] = model;
    }
    return load;
  }

  function discardModels() {
    localStorage.clear();
  }

  /** drops the saved weights of one brain, by layer depth and kind */
  function discardModel(layers: number, kind: string = DEFAULT_KIND) {
    localStorage.removeItem(name(layers, kind));
  }

  /** drops every saved brain of this game, other games keep their saves */
  function discardGameModels() {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(`${game}_`)) localStorage.removeItem(key);
    }
  }

  /** all stored models of this game, keyed by their storage key */
  function exportModels(): Record<string, ModelsByLayerCount[number][]> {
    const models: Record<string, ModelsByLayerCount[number][]> = {};
    Object.keys(localStorage).forEach((key) => {
      if (!key.startsWith(`${game}_`)) return;
      try {
        const data = JSON.parse(localStorage.getItem(key) || '');
        if (Array.isArray(data)) models[key] = data;
      } catch {
        console.warn(`Skipping unreadable save ${key}`);
      }
    });
    return models;
  }

  /** replaces the saves of this game with the given storage key -> models map */
  function importModels(models: Record<string, unknown> | null): string[] {
    const written: string[] = [];
    Object.entries(models || {}).forEach(([key, data]) => {
      if (!key.startsWith(`${game}_`) || !Array.isArray(data)) {
        console.warn(`Skipping incompatible model entry ${key}`);
        return;
      }
      if (writeModels(key, data)) written.push(key);
    });
    return written;
  }
}

export function clamp(min: number, max: number, val: number) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}
