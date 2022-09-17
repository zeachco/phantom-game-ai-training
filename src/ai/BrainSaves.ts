import { NeuralNetwork } from './Network';

export type TopModels = Omit<NeuralNetwork, 'mutate'>[];

/**
 * Regroupment of neural networks that allows for I/O manipulation
 * and comparaison.
 */
export class BrainSaves {
  /**
   * Map to differentiate network types (incompatible between them)
   */
  public brainGroups = new Map<string, TopModels>()
  constructor(public namespace = '') {}

  addLayer(name: string, models: TopModels[] = []) {
    this.brainGroups[name] = models;
  }

  bestPerformingModel(): NeuralNetwork | undefined {
    return this.sortByModel()[0];
  }

  sortByModel(): NeuralNetwork[] {
    return this.layers
      .map((l) => this.getModel(l))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  }

  getModel(layer, index = 0): NeuralNetwork | undefined {
    return this.layers[layer] && this.layers[layer][index];
  }

  set(name:string, models: TopModels) {
    this.brainGroups.set(name, models.sort())
  }

  save(layer = 0) {
    const olds = this.load(layer);
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
      localStorage.setItem(this.#filename(layer));
    }
  }

  load(layer = 0) {
    for (let i = 1; i < this.maxLayers; i++) {
      if (layer && i !== layer) continue;
      localStorage.(this.#filename(i));
    }
  }

  discard(layer = 0) {
    for (let i = 1; i < this.maxLayers; i++) {
      if (layer && i !== layer) continue;
      localStorage.removeItem(this.#filename(i));
    }
  }

  #filename(layer: number) {
    return `${this.namespace}_${layer}`;
  }
}
