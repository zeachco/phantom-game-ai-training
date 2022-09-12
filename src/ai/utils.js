export function loadModel(game) {
    try {
        const model = localStorage.getItem(`${game}_model`);
        return JSON.parse(model);
    }
    catch (err) {
        console.log(err);
        return null;
    }
}
export function isSameModel(modelA, modelB) {
    if (!modelA || !modelB)
        return false;
    const noGeneration = (key, value) => (key === "generation" ? 0 : value);
    return (JSON.stringify(modelA, noGeneration) ===
        JSON.stringify(modelB, noGeneration));
}
export function saveModel(brain, game) {
    const model = loadModel(`${game}_model`);
    if (isSameModel(brain, model)) {
        console.error("model is identical");
    }
    else {
        const data = JSON.stringify(brain);
        localStorage.setItem(`${game}_model`, data);
    }
}
export function discardModel(game) {
    localStorage.removeItem(`${game}_model`);
}
