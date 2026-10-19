import { rand } from '../utilities/math';
import { clampOutput, Level, NeuralNetwork, TEACHING_RATE } from './Network';
import type { ModelsByLayerCount } from './utils';

/** storage namespace, mixed brains stay apart from the regular ones */
export const MIXED_KIND = 'mixed';
const MIN_MUT_FACTOR = 0.1;

/** input -> hidden -> experts, picking a brain does not deserve more depth */
export const MIXED_LEVELS = 2;

export interface MixedOptions {
  /** nodes of the single hidden layer of the selector */
  hiddenNodes?: number;
  /** odds [0-1] of rerolling every weight leading to one expert */
  resetChance?: number;
}

/**
 * Brain that drives through another brain.
 *
 * The inputs go through a shallow selector (one hidden layer) whose outputs map
 * one to one to the trained brains loaded from the saves. The winning expert
 * then receives those same original inputs and produces the actual controls, so
 * the run can switch between an evasion specialist and a distance maximizer
 * depending on what the sensors see.
 */
export class MixedNetwork extends NeuralNetwork {
  public kind = MIXED_KIND;
  /** stable slot of each expert, stored to detect a library change between runs */
  public expertIds: string[] = [];
  public resetChance = 0.15;
  /** expert currently driving */
  public selectedIndex = 0;
  /** frames spent driving with each expert */
  public selectionCounts: number[] = [];
  /** strategy changes during the run */
  public switches = 0;

  /** shared and never mutated, they are saved on their own namespace already */
  #experts: NeuralNetwork[] = [];
  #lastInputs: number[] = [];
  /** controls the experts drive with, the selector outputs are experts instead */
  #outputNb = 0;
  /** shares are read several times a frame, they only move when a pass runs */
  #shares: number[] | null = null;

  constructor(
    inputNb: number,
    outputNb: number,
    experts: NeuralNetwork[] = [],
    options: MixedOptions = {},
  ) {
    // levels are built here instead of being interpolated by the base class
    super(1, 1, 0);

    this.#experts = experts.filter(
      (e) => e.inputCount === inputNb && e.outputCount === outputNb,
    );

    if (!this.#experts.length) {
      throw new Error(
        `No expert matching ${inputNb} inputs / ${outputNb} outputs`,
      );
    }

    const hiddenNodes = Math.max(
      2,
      options.hiddenNodes || Math.ceil((inputNb + this.#experts.length) / 2),
    );

    this.levels = [
      new Level(inputNb, hiddenNodes),
      new Level(hiddenNodes, this.#experts.length),
    ];

    this.#outputNb = outputNb;
    this.expertIds = expertSlotIds(this.#experts);
    this.selectionCounts = this.#experts.map(() => 0);
    this.resetChance = options.resetChance ?? this.resetChance;
  }

  get experts() {
    return this.#experts;
  }

  get activeExpert(): NeuralNetwork | undefined {
    return this.#experts[this.selectedIndex];
  }

  /** depth of each expert, what the games map their brain colors on */
  get expertLayers() {
    return this.#experts.map((expert) => expert.levels.length);
  }

  /** share of the run each expert has been driving, sums up to 1 */
  get selectionShares() {
    if (!this.#shares) {
      const total = this.selectionCounts.reduce((sum, n) => sum + (n || 0), 0);
      this.#shares = this.selectionCounts.map((n) =>
        total ? (n || 0) / total : 0,
      );
    }
    return this.#shares;
  }

  get id() {
    return [MIXED_KIND, this.version, this.mutationIndex].join('-');
  }

  /** the last level picks an expert, the controls come out of that expert */
  get outputCount() {
    return this.#outputNb;
  }

  process(inputs: number[]) {
    this.#lastInputs = inputs;
    const { index, outputs } = this.#forward(inputs);

    if (index !== this.selectedIndex) this.switches++;
    this.selectedIndex = index;
    this.selectionCounts[index] = (this.selectionCounts[index] || 0) + 1;
    this.#shares = null;

    return outputs;
  }

  /**
   * Distills the selector: the student's output is the softmax-weighted blend
   * of the experts' outputs on the same inputs, pulled toward `targets`. The
   * experts stay frozen (they are shared), only the routing weights move, so
   * each state learns to hand the controls to the expert whose behavior the
   * teacher showed there. Returns the pre-step loss.
   */
  public train(
    inputs: number[],
    targets: number[],
    learningRate: number = TEACHING_RATE,
  ): number {
    const activations: number[][] = [inputs];
    let selection = inputs;
    for (const level of this.levels) {
      selection = Level.feedForward(selection, level);
      activations.push(selection);
    }

    const shares = softmax(selection);
    const expertOutputs = this.#experts.map((expert) => expert.process(inputs));
    const outCount = this.#outputNb;
    const blended = new Array<number>(outCount).fill(0);
    for (let i = 0; i < shares.length; i++) {
      const share = shares[i];
      if (!share) continue;
      const outputs = expertOutputs[i];
      for (let k = 0; k < outCount; k++) blended[k] += share * outputs[k];
    }

    let loss = 0;
    // the same clamped error plain brains use: only [-1, 1] is ever applied
    for (let k = 0; k < outCount; k++) {
      const error = clampOutput(blended[k]) - clampOutput(targets[k] ?? 0);
      loss += error * error;
    }

    // softmax blend: the raw selector output j owns the share (E_j - y) of the
    // output-space error, exactly as for a weighted mixture of experts
    const deltas = new Array<number>(selection.length).fill(0);
    for (let j = 0; j < selection.length; j++) {
      const share = shares[j];
      if (!share) continue;
      const outputs = expertOutputs[j];
      let acc = 0;
      for (let k = 0; k < outCount; k++) {
        acc +=
          (clampOutput(blended[k]) - clampOutput(targets[k] ?? 0)) *
          (outputs[k] - blended[k]);
      }
      deltas[j] = (2 * share * acc) / outCount;
    }

    NeuralNetwork.applyGradients(
      this.levels,
      activations,
      deltas,
      learningRate,
    );
    return loss;
  }

  /**
   * Replays the last pass. Experts are shared between every mixed car so
   * their activations belong to whoever ran last, the visualizer calls this to
   * get the ones of the brain it is about to draw.
   */
  replay() {
    if (this.#lastInputs.length) this.#forward(this.#lastInputs);
  }

  mutate(network: ModelsByLayerCount[number]) {
    this.#assertCompatible(network);
    // selectors need bigger jumps than a driving brain, no expert is a dead end
    this.mutationFactor = Math.min(
      1,
      Math.max(this.mutationFactor, MIN_MUT_FACTOR),
    );
    super.mutate(network);
    this.#rerollExperts();
  }

  /**
   * Copies the selector weights of a save, exactly. The experts are shared
   * between every mixed brain, so this never touches their weights. A save
   * whose selector shape no longer matches is ignored, the brain keeps its
   * constructor's random selector.
   */
  public adoptSelector(saved: ModelsByLayerCount[number]): void {
    const levels = saved.levels ?? [];
    for (let l = 0; l < this.levels.length; l++) {
      const source = levels[l]?.weights;
      const level = this.levels[l];
      if (!source || source.length !== level.weights.length) return;
      for (let i = 0; i < source.length; i++) {
        if (source[i].length !== level.weights[i].length) return;
        level.weights[i] = [...source[i]];
      }
    }
    this.version = saved.version ?? 0;
  }

  /**
   * Rebuilds a drivable mixed brain out of a save: the selector adopts the
   * stored weights, the (shared) experts are left untouched. Null when the
   * save no longer matches the expert library it routes to.
   */
  static fromSave(
    saved: ModelsByLayerCount[number],
    inputNb: number,
    outputNb: number,
    experts: NeuralNetwork[],
    options: MixedOptions = {},
  ): MixedNetwork | null {
    const selector = saved?.levels;
    if (!selector?.length || !experts.length) return null;
    const last = selector[selector.length - 1];
    if (last?.weights?.[0]?.length !== experts.length) return null;
    const brain = new MixedNetwork(inputNb, outputNb, experts, options);
    brain.adoptSelector(saved);
    brain.score = saved.score || 0;
    return brain;
  }

  /** first pass picks the expert, second pass replays the original inputs into it */
  #forward(inputs: number[]) {
    const selection = NeuralNetwork.feedForward(inputs, this);

    let index = 0;
    for (let i = 1; i < selection.length; i++) {
      if (selection[i] > selection[index]) index = i;
    }

    const expert = this.#experts[index];
    const outputs = expert
      ? expert.process(inputs)
      : new Array(this.outputCount).fill(0);

    return { index, outputs };
  }

  /**
   * Wipes every weight leading to an expert so a strategy gets reconsidered from
   * scratch instead of drifting, a selector that locked on one brain rarely
   * escapes with small nudges alone.
   */
  #rerollExperts() {
    if (this.mutationFactor <= 0) return;
    const selection = this.levels[this.levels.length - 1];
    for (let j = 0; j < selection.outputs.length; j++) {
      if (Math.random() > this.resetChance * this.mutationFactor) continue;
      for (let i = 0; i < selection.inputs.length; i++) {
        selection.weights[i][j] = rand();
      }
    }
  }

  #assertCompatible(network: ModelsByLayerCount[number]) {
    const levels = network?.levels || [];
    if (levels.length !== this.levels.length) {
      throw new Error(
        `Mixed save has ${levels.length} levels, expected ${this.levels.length}`,
      );
    }
    const saved = levels[levels.length - 1].weights[0].length;
    if (saved !== this.#experts.length) {
      throw new Error(
        `Mixed save targets ${saved} experts, ${
          this.#experts.length
        } are loaded`,
      );
    }
    const savedIds = (network.expertIds || []).join();
    if (savedIds && savedIds !== this.expertIds.join()) {
      throw new Error(`Expert library changed since the mixed brain was saved`);
    }
  }
}

/** Softmax over the selector's raw outputs, numerically stable */
function softmax(values: number[]): number[] {
  const peak = Math.max(...values, 0);
  const weights = values.map((value) => Math.exp(value - peak));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

/**
 * Slot of each expert, `layer.rank`. A brain keeps training between runs so its
 * `id` changes every generation, while the strategy sitting behind a given
 * selector output stays "the layer N specialist". Comparing slots lets the
 * selector keep its routing over an improving library, and still catch the case
 * where a layer appears or disappears and shifts every index after it.
 */
export function expertSlotIds(experts: NeuralNetwork[]) {
  const seen: Record<number, number> = {};
  return experts.map((expert) => {
    const layer = expert.levels.length;
    seen[layer] = (seen[layer] || 0) + 1;
    return `${layer}.${seen[layer]}`;
  });
}

/**
 * Turns every saved brain into a selectable expert. The index of an expert is
 * its position here, so the order has to stay stable between runs or the
 * selector ends up pointing at a different strategy than the one it learned.
 */
export function hydrateExperts(
  saves: ModelsByLayerCount[],
  inputNb: number,
  outputNb: number,
  perLayer = 1,
): NeuralNetwork[] {
  const experts: NeuralNetwork[] = [];

  saves.forEach((models) => {
    if (!models?.length) return;
    models.slice(0, perLayer).forEach((saved) => {
      // a mixed brain picking a mixed brain would only add indirection
      if (!saved?.levels?.length || saved.kind === MIXED_KIND) {
        return;
      }
      const expert = NeuralNetwork.hydrate(saved);
      if (expert.inputCount !== inputNb || expert.outputCount !== outputNb)
        return;
      experts.push(expert);
    });
  });

  return experts;
}
