import { isSameObject } from '../utilities/object';
import { DEFAULT_KIND, type NeuralNetwork } from './Network';

/**
 * index is the layer amount
 * value is a list of sorted NeuralNetwork by score
 */

export type ModelsByLayerCount = (
  | (Omit<NeuralNetwork, 'mutate'> & {
      diff?: number;
      date?: string;
    })
  | any
)[];

export function fileUtilities(game = '') {
  /** regular brains keep their historical namespace, other kinds get their own */
  const name = (layer: number, kind: string = DEFAULT_KIND) =>
    kind === DEFAULT_KIND ? `${game}_${layer}` : `${game}_${kind}_${layer}`;

  return {
    saveBestModels,
    loadAllModelLayers,
    discardModels,
    exportModels,
    importModels,
  };
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
    const name = `${models.length}x ${kind} ${layers}-${models[0]?.version}`;
    const diff = olds[0] ? models[0].score - olds[0].score : models[0].score;
    const score = `${models[0].score.toFixed(4)} ${diff.toFixed(10)}`;
    if (diff < 0) {
      console.info(`💣 ${name} scores ${score}`);
      const save = olds.map((m) => ({ ...m, diff, date: new Date() }));
      const data = JSON.stringify(save);
      localStorage.setItem(namespace, data);
    } else if (isSameObject(models, olds, exclude)) {
      console.info(`😬 ${name} is identical to previous version`);
    } else {
      const save = models.map((m) => ({
        ...m,
        version: m.version + 1,
        diff,
        date: new Date(),
      }));
      const data = JSON.stringify(save);
      console.info(`👍 ${name} scores ${score}`);
      localStorage.setItem(namespace, data);
    }
  }

  function loadModels(
    layers: number,
    kind: string = DEFAULT_KIND,
    namespace = name(layers, kind),
  ) {
    let models: ModelsByLayerCount[number] = [];
    try {
      const data = localStorage.getItem(namespace);
      if (!data) throw new Error(`not found`);
      models = JSON.parse(data);
    } catch {
      console.debug(`Nothing for layer ${layers} of ${kind}`);
    }
    return models;
  }

  /**
   * Receives all neural networks with a score and determine how to same them
   * stored by compatibility (neural networks are easier to mutate from similar neural network complexity AKA same amount of levels)
   * Kinds are kept apart, an orchestrator and a regular brain of the same depth
   * are not interchangeable.
   */
  function saveBestModels(models: NeuralNetwork[], amountPerComplexity = 1) {
    const byKind: Record<string, NeuralNetwork[][]> = {};
    models.forEach((model) => {
      const kind = model.kind || DEFAULT_KIND;
      const save = (byKind[kind] = byKind[kind] || []);
      const space = model.levels.length;
      const previous = save[space] || [];
      if (previous.length >= amountPerComplexity) return;
      save[space] = [...previous, model].sort((a, b) => b.score - a.score);
    });

    console.info(`💾 Saving best ${amountPerComplexity} models...`);
    Object.keys(byKind).forEach((kind) =>
      byKind[kind].forEach((models, layersNb) =>
        saveModels(layersNb, models, kind),
      ),
    );
  }

  function loadAllModelLayers(maxLayer = 1, kind: string = DEFAULT_KIND) {
    const load: ModelsByLayerCount[] = new Array();
    try {
      for (let i = 1; i <= maxLayer; i++) {
        const model = loadModels(i, kind);
        if (model) load[i] = model;
      }
    } catch (err) {
      console.error(err);
    }
    return load;
  }

  function discardModels() {
    localStorage.clear();
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
      localStorage.setItem(key, JSON.stringify(data));
      written.push(key);
    });
    return written;
  }
}
