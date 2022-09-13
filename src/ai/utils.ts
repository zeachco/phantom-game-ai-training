import { config } from '../games/highway/Config';
import { isSameObject } from '../utilities/object';
import type { NeuralNetwork } from './Network';

/**
 * index is the layer amount
 * value is a list of sorted NeuralNetwork by score
 */
export type ModelsByLayerCount = Omit<NeuralNetwork, 'mutate'>[];

export function fileUtilities(game = '') {
  const name = (layer: number) => `${game}_${layer}`;

  return {
    saveBestModels,
    loadAllModelLayers,
  };
  function saveModels(
    layers: number,
    models: NeuralNetwork[],
    namespace = name(layers),
    allowLower = false,
  ) {
    const olds = loadModels(layers);
    const exclude: (keyof NeuralNetwork)[] = [
      'id',
      'version',
      'mutationIndex',
      'mutationFactor',
      'score',
    ];
    if (olds[0] && olds[0].score > models[0].score) {
      console.debug(
        `skipping save based on score ${olds[0].score} > ${models[0].score}`,
      );
    } else if (isSameObject(models, olds, exclude)) {
      // console.error('models are identical');
    } else {
      const data = JSON.stringify(models);
      console.log(
        `saving ${models.length} gen-${models[0]?.version} ${game} models (${layers} layers).`,
      );
      localStorage.setItem(namespace, data);
      return 1;
    }
    return 0;
  }

  function loadModels(layers: number, namespace = name(layers)) {
    let models: ModelsByLayerCount = [];
    try {
      const data = localStorage.getItem(namespace);
      if (!data) throw new Error(`not found`);
      models = JSON.parse(data);
      console.log(
        `Retreived ${models.length} gen-${models[0].version} for layer ${layers}`,
      );
    } catch {
      console.log(`Nothing for layer ${layers}`);
    }
    return models;
  }

  /**
   * Receives all neural networks with a score and determine how to same them
   * stored by compatibility (neural networks are easier to mutate from similar neural network complexity AKA same amount of levels)
   */
  function saveBestModels(models: NeuralNetwork[], amountPerComplexity = 1) {
    console.groupCollapsed(
      `Saving ${config.MAX_NETWORK_LAYERS} models configs`,
    );
    const save: NeuralNetwork[][] = new Array(config.MAX_NETWORK_LAYERS);
    models.forEach((model) => {
      const space = model.levels.length;
      const previous = save[space] || [];
      if (previous.length >= amountPerComplexity) return;
      save[space] = [...previous, model].sort((a, b) => b.score - a.score);
    });

    let count = 0;
    save.forEach((models, layersNb) => (count += saveModels(layersNb, models)));
    console.log(`Written ${count}/${config.MAX_NETWORK_LAYERS} models`);
    console.groupEnd();
  }

  function loadAllModelLayers(maxLayer = config.MAX_NETWORK_LAYERS) {
    console.groupCollapsed(`Loading ${maxLayer} models configs...`);
    const load: ModelsByLayerCount[] = new Array(config.MAX_NETWORK_LAYERS);
    try {
      for (let i = 1; i <= maxLayer; i++) {
        const model = loadModels(i);
        if (!model) continue;
        load[i] = model.map((m) => ({ ...m, score: 0 }));
      }
    } catch (err) {
      console.error(err);
    }
    console.groupEnd();
    return load;
  }
}
