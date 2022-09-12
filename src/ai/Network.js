import { lerp } from "../utilities/math";
export class NeuralNetwork {
    generation = 0;
    levels;
    constructor(inputNb, outputNb, intermediateLayers = 6) {
        const levelStructure = [];
        if (inputNb < outputNb) {
            throw new Error("requires more inputs than outputs");
        }
        const step = Math.ceil(inputNb / (intermediateLayers + 1));
        this.levels = [];
        this.levels.push(new Level(inputNb, outputNb));
        // this.levels.push(new Level(out, outputNb));
        // for (let l = inputNb; l > outputNb; l -= step) {
        //   const outCount = Math.max(outputNb, l);
        //   this.levels.push(new Level(l, outCount));
        // }
        // 16, .. 4
        // const levels = [inputNb, ...[], outputNb];
        // for (let i = 0; i < levels.length - 1; i++) {
        //   this.levels.push(new Level(levels[i], levels[i + 1]));
        // }
    }
    static feedForward(givenInputs, network) {
        let outputs = Level.feedForward(givenInputs, network.levels[0]);
        for (let i = 1; i < network.levels.length; i++) {
            outputs = Level.feedForward(outputs, network.levels[i]);
        }
        return outputs;
    }
    fork(network, amount = 0.9) {
        this.generation = network.generation + 1;
        for (let l = 0; l < network.levels.length; l++) {
            for (let b = 0; b < this.levels[l].biases.length; b++) {
                this.levels[l].biases = lerp(network.levels[l].biases[b], Math.random() * 2 - 1, amount);
            }
            for (let i = 0; i < this.levels[l].weights.length; i++) {
                for (let j = 0; j < this.levels[l].weights[i].length; j++) {
                    this.levels[l].weights[i][j] = lerp(network.levels[l].weights[i][j], Math.random() * 2 - 1, amount);
                }
            }
        }
    }
}
export class Level {
    inputs;
    outputs;
    biases;
    weights;
    constructor(inputCount = 1, outputCount = 1) {
        this.inputs = new Array(inputCount);
        this.outputs = new Array(outputCount);
        this.biases = new Array(outputCount);
        this.weights = [];
        for (let i = 0; i < inputCount; i++) {
            this.weights[i] = new Array(outputCount);
        }
        Level.#randomize(this);
    }
    static #randomize(level) {
        for (let i = 0; i < level.inputs.length; i++) {
            for (let j = 0; j < level.outputs.length; j++) {
                level.weights[i][j] = Math.random() * 2 - 1;
            }
        }
        for (let i = 0; i < level.biases.length; i++) {
            level.biases[i] = Math.random() * 2 - 1;
        }
    }
    static feedForward(givenInputs, level) {
        for (let i = 0; i < level.inputs.length; i++) {
            level.inputs[i] = givenInputs[i];
        }
        for (let i = 0; i < level.outputs.length; i++) {
            let sum = 0;
            for (let j = 0; j < level.inputs.length; j++) {
                sum += level.inputs[j] * level.weights[j][i];
            }
            if (sum > level.biases[i]) {
                level.outputs[i] = 1;
            }
            else {
                level.outputs[i] = 0;
            }
        }
        return level.outputs;
    }
}
