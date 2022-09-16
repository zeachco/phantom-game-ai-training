import { isSameObject } from '../utilities/object';
import type { NeuralNetwork } from './Network';

/**
 * index is the layer amount
 * value is a list of sorted NeuralNetwork by score
 */

export type ModelsByLayerCount = (Omit<NeuralNetwork, 'mutate'> & {
  diff?: number;
  date?: string;
})[];

export function fileUtilities(game = '') {
  const name = (layer: number) => `${game}_${layer}`;

  return {
    saveBestModels,
    loadAllModelLayers,
    discardModels,
  };
  function saveModels(
    layers: number,
    models: NeuralNetwork[],
    namespace = name(layers),
  ) {
    const olds = loadModels(layers);
    const exclude: (keyof NeuralNetwork)[] = [
      'id',
      'version',
      'mutationIndex',
      'mutationFactor',
      'score',
    ];
    const name = `${models.length}x ${layers}-${models[0]?.version}`;
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

  function loadModels(layers: number, namespace = name(layers)) {
    let models: ModelsByLayerCount = [];
    try {
      const data = localStorage.getItem(namespace);
      if (!data) throw new Error(`not found`);
      models = JSON.parse(data);
      console.debug(
        `Retreived ${models.length} gen-${models[0].version} for layer ${layers}`,
      );
    } catch {
      console.debug(`Nothing for layer ${layers}`);
    }
    return models;
  }

  /**
   * Receives all neural networks with a score and determine how to same them
   * stored by compatibility (neural networks are easier to mutate from similar neural network complexity AKA same amount of levels)
   */
  function saveBestModels(models: NeuralNetwork[], amountPerComplexity = 1) {
    const save: NeuralNetwork[][] = new Array();
    models.forEach((model) => {
      const space = model.levels.length;
      const previous = save[space] || [];
      if (previous.length >= amountPerComplexity) return;
      save[space] = [...previous, model].sort((a, b) => b.score - a.score);
    });

    console.info(`💾 Saving best ${amountPerComplexity} models...`);
    save.forEach((models, layersNb) => saveModels(layersNb, models));
  }

  function loadAllModelLayers(maxLayer = 1) {
    const load: ModelsByLayerCount[] = new Array();
    try {
      for (let i = 1; i <= maxLayer; i++) {
        const model = loadModels(i);
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
}
