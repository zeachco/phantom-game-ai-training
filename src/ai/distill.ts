import { LEARNING_STEP_PERCENT } from '../utilities/learningRate';
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
  /** the trainer's loss graph plots at most this many recent frames */
  static HISTORY_LIMIT = 300;

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
  /** the frame losses since the run started, oldest first, capped so the
   *  trainer's loss graph stays a sliding window */
  public lossHistory: number[] = [];

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
    const rate = (teachingRate(frames) * LEARNING_STEP_PERCENT) / 100;
    // the live sample first, because it is the behaviour being copied right
    // now; its error is the one the driven car is experiencing
    const liveLoss = brain.train(
      inputs,
      teacher.process(inputs),
      rate,
      this.outputRanges,
    );
    this.lastErrors = brain.lastErrors;
    this.#observe(inputs);
    let loss = liveLoss;
    for (let i = 0; i < this.probesPerFrame; i++) {
      const probe = this.sample();
      loss += brain.train(
        probe,
        teacher.process(probe),
        rate,
        this.outputRanges,
      );
    }
    this.lastLoss = loss / (this.probesPerFrame + 1);
    this.lossHistory.push(this.lastLoss);
    if (this.lossHistory.length > Distiller.HISTORY_LIMIT)
      this.lossHistory.shift();
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
  const active =
    distiller ?? new Distiller(inputs.length, undefined, outputRanges);
  active.step(brain, teacher, inputs, frames);
  return active;
}

/**
 * The per-entity distillation state every game's entity update repeats:
 * the teacher-swap reset, the decayed frame counter, the probe distiller,
 * and the error capture. The entity keeps the public surface: `teacher`
 * and `distillRun` are set by the game loop, while `teacherFrames`,
 * `distiller`, and `distillErrors` are read through this object.
 */
export class DistillDriver {
  /** frames this entity has been distilling, the step decays over them */
  public teacherFrames = 0;
  /** the probe data of its training run, built on the first distilled frame */
  public distiller: Distiller | null = null;
  /** per-output applied error of the last live sample, for the network view */
  public distillErrors: number[] | null = null;
  /** the last teacher seen: a swap restarts the decayed step and the probes */
  #lastTeacher: NeuralNetwork | null = null;

  constructor(
    public brain: NeuralNetwork,
    private outputRanges: OutputRanges,
  ) {}

  /**
   * A teacher-driven run is not the student's own output, so its score is
   * not updated: whatever the frame earns is written back before returning.
   * Returns the score to restore at frame end, or null for free training,
   * which keeps earning.
   */
  freezeScore(
    teacher: NeuralNetwork | null,
    distillRun: boolean,
  ): number | null {
    return teacher || distillRun ? this.brain.score : null;
  }

  /**
   * One brain-decision frame. While a teacher drives, returns the
   * teacher's applied output (a copy: Network.process reuses its output
   * array, and distillStep evaluates several probe inputs after the live
   * action) and advances the distillation; otherwise clears the run state
   * and returns the student's own output. `distillRun` says the entity
   * belongs to a teacher-driven run even without a live teacher (no
   * champion to copy yet), which keeps teacherFrames from decaying to
   * zero.
   */
  frame(
    teacher: NeuralNetwork | null,
    distillRun: boolean,
    inputs: number[],
  ): number[] {
    if (teacher) {
      if (teacher !== this.#lastTeacher) {
        // a new teacher: restart the decayed step and the probe ranges
        this.#lastTeacher = teacher;
        this.teacherFrames = 0;
        this.distiller = null;
      }
      // distillation: the teacher drives the entity, the own brain
      // backpropagates toward the teacher's applied output on the same
      // inputs
      const outputs = teacher.process(inputs).slice();
      this.distiller = distillStep(
        this.distiller,
        this.brain,
        teacher,
        inputs,
        this.teacherFrames++,
        this.outputRanges,
      );
      this.distillErrors = this.distiller.lastErrors;
      return outputs;
    }
    this.#lastTeacher = null;
    if (!distillRun) this.teacherFrames = 0;
    this.distiller = null;
    this.distillErrors = null;
    return this.brain.process(inputs);
  }
}
