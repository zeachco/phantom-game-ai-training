import type { NeuralNetwork } from "./Network";

export function fileUtilities(gameName = "") {
  return {
    loadModel: () => loadModel(gameName),
    saveModel: (model: NeuralNetwork) => saveModel(model, gameName),
    discardModel: () => discardModel(gameName),
    saveScore: (score: number) => saveScore(gameName, score),
    loadScore: () => loadScore(gameName),
  };
}

export function loadModel(game: string) {
  try {
    const data = localStorage.getItem(`${game}_model`);
    return JSON.parse(data) as NeuralNetwork;
  } catch (err) {
    console.log(err);
    return;
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
  const model = loadModel(game);
  if (isSameModel(network, model)) {
    console.error("model is identical");
  } else {
    const data = JSON.stringify(network);
    console.log(
      `saving ${`${game}_model`} (generation #${network.generation})`,
    );
    localStorage.setItem(namespace, data);
  }
}

export function discardModel(game: string) {
  localStorage.removeItem(`${game}_model`);
}

export function saveScore(game: string, score = 0) {
  localStorage.setItem(`${game}_score`, score.toString());
}

export function loadScore(game: string) {
  return parseFloat(localStorage.getItem(`${game}_score`) || "0");
}
