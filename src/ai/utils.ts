import type { NeuralNetwork } from "./Network";

export function fileUtilities(gameName = "") {
  return {
    loadModel: () => loadModel(gameName),
    saveModel: (model) => saveModel(model, gameName),
    discardModel: () => discardModel(gameName),
  };
}

export function loadModel(game: string): NeuralNetwork | null {
  try {
    const data = localStorage.getItem(`${game}_model`);
    const model = JSON.parse(data) as NeuralNetwork;
    if (!model) return;
    console.log(`loaded generation #${model.generation}`);
    return model;
  } catch (err) {
    console.log(err);
    return null;
  }
}

export function isSameModel(modelA: NeuralNetwork, modelB: NeuralNetwork) {
  if (!modelA || !modelB) return false;
  const noGeneration = (key, value) => (key === "generation" ? 0 : value);
  return (
    JSON.stringify(modelA, noGeneration) ===
    JSON.stringify(modelB, noGeneration)
  );
}

export function saveModel(network: NeuralNetwork, game: string) {
  const namespace = `${game}_model`;
  const model = loadModel(namespace);
  if (isSameModel(network, model)) {
    console.error("model is identical");
  } else {
    const data = JSON.stringify(network);
    console.log(`saving ${namespace} (generation #${network.generation})`);
    localStorage.setItem(namespace, data);
  }
}

export function discardModel(game: string) {
  localStorage.removeItem(`${game}_model`);
}
