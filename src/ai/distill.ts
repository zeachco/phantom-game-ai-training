import { type NeuralNetwork, type OutputRanges, teachingRate } from './Network';

/**
 * Distillation data. A teacher drives the entity, so every frame hands the
 * student one sample of a stream whose consecutive entries are nearly
 * identical: imitation on the trajectory alone barely moves the weights, no
 * matter the learning rate.
 *
 * So the student also learns from random probes of the same input space, a
 * plain supervised data set made on the fly. Probe values stay inside the
 * range each input has actually produced, which is learned from the live
 * frames, so a sensor that never exceeds 0.3 is not asked about 0.9 while a
 * signed delta input can go negative.
 */
export class Distiller {
  /** how many random probes each frame costs on top of the live sample */
  static PROBES_PER_FRAME = 5;

  /** lowest and highest value seen per input, unknown until the first frame */
  #min: number[];
  #max: number[];

  /** the game's applied control ranges, trained toward and read back as the live error */
  public outputRanges: OutputRanges = [];
  /** mean pre-step loss over the last frame's train calls, the real-time loss */
  public lastLoss: number | null = null;
  /** per-output applied error of the live sample of the last frame, the
   *  error the driven car is actually experiencing right now */
  public lastErrors: number[] | null = null;

  constructor(
    public inputCount: number,
    public probesPerFrame = Distiller.PROBES_PER_FRAME,
    outputRanges: OutputRanges = [],
  ) {
    this.#min = new Array(inputCount).fill(Infinity);
    this.#max = new Array(inputCount).fill(-Infinity);
    this.outputRanges = outputRanges;
  }

  /**
   * The sampling range of one input: the canonical [-1, 1] control range
   * widened by whatever the input has been seen outside of it. Sensors live in
   * [0, 1] and signed inputs like a gate delta go negative, so the probes cover
   * the whole box the brain can be asked about rather than the narrow slice a
   * teacher trajectory happens to visit.
   */
  rangeOf(input: number): [number, number] {
    const min = this.#min[input];
    const max = this.#max[input];
    const low = Number.isFinite(min) ? Math.min(min, 0) : 0;
    const high = Number.isFinite(max) ? Math.max(max, 1) : 1;
    return [low, high];
  }

  #observe(inputs: number[]) {
    const count = Math.min(this.inputCount, inputs.length);
    for (let i = 0; i < count; i++) {
      const value = inputs[i];
      if (!Number.isFinite(value)) continue;
      if (value < this.#min[i]) this.#min[i] = value;
      if (value > this.#max[i]) this.#max[i] = value;
    }
  }

  /** a uniform draw of the observed input box */
  sample(): number[] {
    const probe = new Array<number>(this.inputCount);
    for (let i = 0; i < this.inputCount; i++) {
      const [lo, hi] = this.rangeOf(i);
      probe[i] = lo + (hi - lo) * Math.random();
    }
    return probe;
  }

  /**
   * One distillation frame: the live sample first, because it is the behaviour
   * being copied right now, then a handful of probes so every frame teaches
   * the teacher's function and not just its current position on it.
   */
  step(
    brain: NeuralNetwork,
    teacher: NeuralNetwork,
    inputs: number[],
    frames: number,
  ): void {
    const rate = teachingRate(frames);
    // the live sample first, because it is the behaviour being copied right
    // now; its error is the one the driven car is experiencing
    const liveLoss = brain.train(inputs, teacher.process(inputs), rate, this.outputRanges);
    this.lastErrors = brain.lastErrors;
    this.#observe(inputs);
    let loss = liveLoss;
    for (let i = 0; i < this.probesPerFrame; i++) {
      const probe = this.sample();
      loss += brain.train(probe, teacher.process(probe), rate, this.outputRanges);
    }
    this.lastLoss = loss / (this.probesPerFrame + 1);
  }
}

/**
 * The contract of train-from: the teacher's internal structure (depth, kind)
 * may differ from the student's, but its inputs and outputs must match the
 * game's dimensions exactly, otherwise the teacher's answers are truncated or
 * zero-padded and the student learns a different function.
 */
export function brainIoMatches(
  brain: { inputCount: number; outputCount: number } | null | undefined,
  inputCount: number,
  outputCount: number,
): boolean {
  return (
    !!brain &&
    brain.inputCount === inputCount &&
    brain.outputCount === outputCount
  );
}

/**
 * The distiller of an entity, created on its first distilled frame. Passing
 * null builds one, so an entity only has to keep the returned value.
 */
export function distillStep(
  distiller: Distiller | null,
  brain: NeuralNetwork,
  teacher: NeuralNetwork,
  inputs: number[],
  frames: number,
  outputRanges: OutputRanges = [],
): Distiller {
  const active = distiller ?? new Distiller(inputs.length, undefined, outputRanges);
  active.step(brain, teacher, inputs, frames);
  return active;
}
