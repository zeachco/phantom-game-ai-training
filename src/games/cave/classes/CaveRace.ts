import type { Scene } from 'three';
import { brainIoMatches } from '../../../ai/distill';
import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../../../ai/Mixed';
import { NeuralNetwork } from '../../../ai/Network';
import {
  type fileUtilities,
  networkLevelSizes,
  PLAYER_COLOR,
} from '../../../ai/utils';
import { gameNow } from '../../../utilities/gameClock';
import { lerp } from '../../../utilities/math';
import {
  expertLibraryShape,
  refreshExperts,
} from '../../../utilities/race/expertLibrary';
import {
  isExplorerSlot,
  type SlotPolicy,
  slotMutation,
  slotSource,
} from '../../../utilities/race/slotPolicy';
import { globalRecordFromScores } from '../../../utilities/scoreRecords';
import {
  loadTrainFroms,
  saveTrainFrom,
  studentLabel,
  trainedBrain,
  withTrainedBrain,
} from '../../../utilities/trainFrom';
import { ControlType } from '../types';
import {
  brainId,
  defaultState,
  type Group,
  loadScores,
  saveScores,
} from '../utilities';
import { Ball, getCaveBrainDimensions } from './Ball';
import { Cave } from './Cave';
import { config } from './Config';

export type CaveModelIo = ReturnType<typeof fileUtilities>;

/** the explorer/scout slot policy for this game's pool shapes and the
 *  gates a group has banked on the current seed; the demo profile is
 *  mutations only, so no explorer or scout ever replaces one of its slots */
const slotPolicy: SlotPolicy<Group> = {
  poolSize: config.CARS_PER_GROUP,
  finishedPoolSize: config.FINISHED_CARS_PER_GROUP,
  explorerSlots: config.EXPLORER_CARS,
  explorerLimit: config.EXPLORER_LAP_LIMIT,
  mutationLadderCap: config.MUTATION_LADDER_CAP,
  finishedSwarmDivisor: config.FINISHED_SWARM_DIVISOR,
  progress: (group) => {
    let gates = 0;
    for (const key of Object.keys(group.gateTimes))
      gates += group.gateTimes[key].length;
    return gates;
  },
  demo: config.DEMO,
};

/**
 * Owns the non-visual part of a cave run: model pools, score promotion,
 * gauge/crash deaths, respawns and seed progression. It is the cave twin of
 * the circuit's CircuitRace, with gates standing in for laps and the section
 * gauge standing in for the checkpoint budget.
 */
export class CaveRace {
  public cave: Cave;
  public seed: number;
  /** seeds completed so far, drives the mutation anneal exactly like laps */
  public laps = 0;
  public readonly groups: Group[] = [];
  public seedChangeAt = 0;

  #experts: NeuralNetwork[] = [];
  #completedBrainIndices = new Set<string>();
  #completedFinishes = new Map<
    string,
    { score: number | null; totalFrames: number }
  >();
  /** fastest split for each gate on the current cave */
  #bestGateFrames: number[] = [];
  /** fastest finish on the current cave */
  #bestFinishFrames = Infinity;
  /** scratch ranking buffer, repopulated each step so update never allocates */
  #ranked: Ball[] = [];
  #humanFinishCelebrated = false;
  #pendingSaves = new Set<Group>();
  #onHumanCrash?: () => void;
  #onHumanFinish?: () => void;
  #onSeedChanged?: (seed: number) => void;
  #onReset?: () => void;

  constructor(
    private readonly state: typeof defaultState,
    private readonly io: CaveModelIo,
    seed: number,
    private readonly scene: Scene,
    options: {
      onHumanCrash?: () => void;
      onHumanFinish?: () => void;
      onSeedChanged?: (seed: number) => void;
      onReset?: () => void;
    } = {},
  ) {
    this.seed = seed;
    this.cave = new Cave(seed, scene);
    this.#onHumanCrash = options.onHumanCrash;
    this.#onHumanFinish = options.onHumanFinish;
    this.#onSeedChanged = options.onSeedChanged;
    this.#onReset = options.onReset;
  }

  /** the human ball has no brain, group, or saved weights */
  public spawnHuman() {
    const spawn = this.cave.getSpawn();
    const ball = new Ball(
      spawn,
      ControlType.HUMAN,
      config.BALL_MAX_SPEED,
      'human',
      PLAYER_COLOR,
      1,
      undefined,
      0,
      this.cave,
    );
    this.state.human = ball;
    this.state.balls.push(ball);
    this.state.living++;
  }

  #maxMutation() {
    return lerp(
      config.MAX_MUTATION_LVL,
      config.MIN_MUTATION_LVL,
      Math.min(1, this.laps / config.MUTATION_LAP_DECAY),
    );
  }

  #spawnBall(group: Group, slot: number) {
    const spawn = this.cave.getSpawn();
    const ball = new Ball(
      spawn,
      ControlType.AI,
      config.BALL_MAX_SPEED,
      studentLabel(brainId(group.layer, slot), group.distillRun),
      '',
      group.layer,
      group.isMixed
        ? (inputCount, outputCount) =>
            new MixedNetwork(inputCount, outputCount, this.#experts, {
              hiddenNodes: config.MIXED_HIDDEN_NODES,
              resetChance: config.MIXED_RESET_CHANCE,
            })
        : undefined,
      0,
      this.cave,
    );
    const source = slotSource(group, slot, this.state.sortedModels, slotPolicy);
    if (source && ball.brain) {
      ball.brain.mutationIndex = slot;
      ball.brain.mutationFactor = slotMutation(
        group,
        slot,
        this.#maxMutation(),
        slotPolicy,
      );
      try {
        ball.brain.mutate(source.brain);
      } catch {
        // the saved brain no longer fits the current sensors: this ball keeps
        // the constructor's random brain and starts fresh
      }
    } else if (isExplorerSlot(group, slot, slotPolicy) && ball.brain) {
      ball.brain.mutationIndex = slot;
      ball.brain.mutationFactor = 1;
    }
    return ball;
  }

  #refreshExperts() {
    const { inputCount, outputCount } = getCaveBrainDimensions();
    this.#experts = refreshExperts(
      this.state,
      inputCount,
      outputCount,
      config.MIXED_EXPERTS_PER_LAYER,
      config.MIXED_MIN_EXPERTS,
      config.MIXED_ENABLED,
    );
    return this.#experts;
  }

  #buildPools() {
    // a distilling group keeps its teacher across cave rebuilds
    const trainFroms = new Map(
      this.groups.map((group) => [group.key, group.trainFrom]),
    );
    this.groups.length = 0;
    const hydrated = this.#refreshExperts();

    if (config.MIXED_ENABLED && hydrated.length >= config.MIXED_MIN_EXPERTS) {
      this.groups.push({
        key: 'mixed',
        layer: 0,
        isMixed: true,
        pool: [],
        mutationOnly: false,
        trainFrom: trainFroms.get('mixed') ?? null,
        distillRun: false,
        teacher: null,
        hydratedTeacher: null,
        best: this.state.sortedMixed[MIXED_LEVELS]?.[0]
          ? {
              brain: this.state.sortedMixed[MIXED_LEVELS][0],
              score: this.state.sortedMixed[MIXED_LEVELS][0].score || 0,
            }
          : null,
        seedBest: null,
        ghostScore: 0,
        scores: {
          current: this.seed,
          total: 0,
          seed: 0,
          phantom: 0,
          history: {},
          finished: {},
        },
        gateTimes: {},
      });
    }

    for (let layer = 1; layer <= config.MAX_NETWORK_LAYERS; layer++) {
      this.groups.push({
        key: String(layer),
        layer,
        isMixed: false,
        pool: [],
        mutationOnly: false,
        trainFrom: trainFroms.get(String(layer)) ?? null,
        distillRun: false,
        teacher: null,
        hydratedTeacher: null,
        best: this.state.sortedModels[layer]?.[0]
          ? {
              brain: this.state.sortedModels[layer][0],
              score: this.state.sortedModels[layer][0].score || 0,
            }
          : null,
        seedBest: null,
        ghostScore: 0,
        scores: {
          current: this.seed,
          total: 0,
          seed: 0,
          phantom: 0,
          history: {},
          finished: {},
        },
        gateTimes: {},
      });
    }

    // restored selections must be known before the pools spawn: a distilling
    // group only fields its single student car
    this.#restoreTrainFroms();
    for (const group of this.groups) {
      group.scores = loadScores(group, this.seed);
      group.ghostScore = group.scores.seed;
      group.mutationOnly = group.scores.finished[String(this.seed)] === true;
      group.pool = this.#spawnSlots(group).map((slot) =>
        this.#spawnBall(group, slot),
      );
    }
    this.state.groups = this.groups;
  }

  /** Restore the persisted distillation targets the in-memory carryover did
   *  not cover, on a fresh page load every group starts free. */
  #restoreTrainFroms() {
    // a group carried over with a target is mid-training: single student car,
    // disqualified score
    for (const group of this.groups)
      group.distillRun = group.trainFrom !== null;
    for (const [student, target] of loadTrainFroms('cave')) {
      if (student === target) continue;
      const group = this.groups.find((candidate) =>
        student === 'mixed' ? candidate.isMixed : candidate.layer === student,
      );
      if (!group || group.trainFrom !== null) continue;
      group.trainFrom = target;
      // a restored selection is an active training run: one student car and a
      // disqualified score until the run ends
      group.distillRun = true;
    }
  }

  #groupOf(ball: Ball) {
    if (!ball.useAI) return undefined;
    const key =
      ball.brain instanceof MixedNetwork ? 'mixed' : String(ball.brainLayers);
    return this.groups.find((group) => group.key === key);
  }

  /**
   * Point a group at another one for distillation: the group's balls are
   * driven by the target's champion brain while their own brains
   * backpropagate toward it. Pass null to free the group back to its own
   * line. A group cannot distill from itself.
   */
  public setTrainFrom(
    value: number | 'mixed',
    target: number | 'mixed' | null,
    persist = true,
  ): boolean {
    const group = this.groups.find((candidate) =>
      value === 'mixed' ? candidate.isMixed : candidate.layer === value,
    );
    if (!group || (target !== null && value === target)) return false;
    group.trainFrom = target;
    if (target !== null) group.distillRun = true;
    if (persist) saveTrainFrom('cave', value, target);
    // a training run needs exactly one student ball, so restart the group with
    // a single fresh one instead of leaving its whole swarm on the teacher
    if (target !== null) this.#restartAsStudent(group);
    return true;
  }

  /**
   * Replace a group's pool with the single student ball a training run drives,
   * marking it with the training emoji so the panel and the cave agree.
   */
  #restartAsStudent(group: Group) {
    const corpses = new Set(group.pool);
    const oldLiving = group.pool.filter((ball) => !ball.damaged).length;
    this.state.balls = this.state.balls.filter((ball) => !corpses.has(ball));
    group.pool = this.#spawnSlots(group).map((slot) =>
      this.#spawnBall(group, slot),
    );
    this.state.balls.push(...group.pool);
    this.state.living += group.pool.length - oldLiving;
  }

  /**
   * The end of a run: every distillation selection goes back to free training
   * and its disqualification flag is dropped, together with the persisted
   * choice so a reload starts from a clean, measurable run.
   */
  #endDistillRuns() {
    for (const group of this.groups) {
      if (group.trainFrom === null && !group.distillRun) continue;
      this.#keepTrainedBrain(group);
      group.trainFrom = null;
      group.distillRun = false;
      saveTrainFrom('cave', group.isMixed ? 'mixed' : group.layer, null);
    }
  }

  /**
   * Hand the student's trained weights to the next generation: the brain takes
   * the place of the group's base model, so the next run mutates from what the
   * student learned. Its score is the one the group already had, a disjoint
   * run never sets a record.
   */
  #keepTrainedBrain(group: Group) {
    const student = group.pool[0];
    const brain = student?.brain;
    // if no teacher ever drove the run nothing was distilled: the student's
    // weights are untrained and must not replace the group's champion
    if (!student || !brain || !student.teacherFrames) return;
    const trained = trainedBrain(brain, group.best?.score ?? 0);
    group.best = { brain: trained, score: trained.score };
    if (group.isMixed) {
      this.state.sortedMixed[MIXED_LEVELS] = withTrainedBrain(
        this.state.sortedMixed[MIXED_LEVELS] ?? [],
        trained,
        config.HALL_OF_FAME_SIZE,
      );
    } else {
      this.state.sortedModels[group.layer] = withTrainedBrain(
        this.state.sortedModels[group.layer] ?? [],
        trained,
        config.HALL_OF_FAME_SIZE,
      );
    }
    this.#persistGroup(group);
    saveScores(group);
  }

  /** The score of the brain the group is distilling from, null for free
   *  training or while the target has no champion yet. */
  public teacherScore(value: number | 'mixed'): number | null {
    const group = this.groups.find((candidate) =>
      value === 'mixed' ? candidate.isMixed : candidate.layer === value,
    );
    if (!group || group.trainFrom === null) return null;
    return this.#teacherBrain(group.trainFrom)?.score ?? null;
  }

  /** The brain a distilling group imitates: the target group's champion,
   *  null while the target has none yet. Champions loaded from the saves are
   *  plain data with no methods, so a raw one is hydrated once (mixed brains
   *  against the current expert library) and cached until it is replaced. */
  #teacherBrain(target: number | 'mixed'): NeuralNetwork | null {
    const key = target === 'mixed' ? 'mixed' : String(target);
    const group = this.groups.find((candidate) => candidate.key === key);
    const champion = group?.best?.brain ?? null;
    if (!champion) return null;
    if (typeof champion.process === 'function') return champion;
    const cached = group.hydratedTeacher;
    if (cached?.champion === champion) return cached.brain;
    const { inputCount, outputCount } = getCaveBrainDimensions();
    const brain = group.isMixed
      ? MixedNetwork.fromSave(
          champion,
          inputCount,
          outputCount,
          this.#experts,
          {
            hiddenNodes: config.MIXED_HIDDEN_NODES,
          },
        )
      : NeuralNetwork.hydrate(champion);
    if (!brain) return null;
    // train-from only needs matching inputs and outputs: any depth or kind is
    // fine, but a mismatched brain would teach a different function
    if (!brainIoMatches(brain, inputCount, outputCount)) return null;
    group.hydratedTeacher = { champion, brain };
    return brain;
  }

  /** Record a gate split before it can become the new reference. */
  #recordGateTiming(ball: Ball) {
    if (ball.completedGateIndex < 0) return;
    const index = ball.completedGateIndex;
    const frames = ball.completedGateFrames;
    const best = this.#bestGateFrames[index];
    ball.lastGateIndex = index;
    ball.lastGateFrames = frames;
    ball.lastGateDelta = typeof best === 'number' ? frames - best : null;
    if (typeof best !== 'number' || frames < best)
      this.#bestGateFrames[index] = frames;
  }

  /** Record the final total before it becomes the new cave reference. */
  #recordFinishTiming(ball: Ball) {
    const frames = ball.totalRaceFrames;
    ball.lastFinishFrames = frames;
    ball.lastFinishDelta = Number.isFinite(this.#bestFinishFrames)
      ? frames - this.#bestFinishFrames
      : null;
    if (frames < this.#bestFinishFrames) this.#bestFinishFrames = frames;
  }

  #promote(group: Group, ball: Ball) {
    // a teacher-driven run is disqualified: it would only save the teacher's
    // behavior under the student's name
    if (group.distillRun) return;
    const brain = JSON.parse(JSON.stringify(ball.brain)) as NeuralNetwork;
    group.best = { brain, score: ball.brain.score };
    this.#pendingSaves.add(group);
    const saves = group.isMixed
      ? this.state.sortedMixed
      : this.state.sortedModels;
    if (group.isMixed) {
      saves[MIXED_LEVELS] = [brain];
      this.#refreshExperts();
    } else {
      saves[group.layer] = [brain, ...(saves[group.layer] || [])].slice(
        0,
        config.HALL_OF_FAME_SIZE,
      );
    }
  }

  #settle(group: Group, ball: Ball) {
    // a teacher-driven run is not the student's own output: it never settles
    if (group.distillRun) return;
    if (!ball.useAI || ball.brain.score <= group.scores.seed) return;
    group.scores.seed = ball.brain.score;
    group.seedBest = {
      brain: JSON.parse(JSON.stringify(ball.brain)) as NeuralNetwork,
      score: ball.brain.score,
    };
    this.#promote(group, ball);
  }

  #markFinished(group: Group) {
    if (group.distillRun) return;
    group.mutationOnly = true;
    group.scores.finished[String(this.seed)] = true;
    this.#pendingSaves.add(group);
  }

  public flushPendingSaves() {
    for (const group of this.#pendingSaves) {
      this.#persistGroup(group);
      saveScores(group);
    }
    this.#pendingSaves.clear();
  }

  /** regular groups persist their whole hall of fame, mixed the single
   *  champion save */
  #persistGroup(group: Group) {
    if (!group.best) return;
    if (group.isMixed) this.io.saveBestModels([group.best.brain], 1);
    else
      this.io.saveModelList(
        group.layer,
        this.state.sortedModels[group.layer] || [group.best.brain],
      );
  }

  /** Clear one saved champion and rebuild only that group's ladder. */
  public resetBrainGroup(value: number | 'mixed') {
    const groupIndex = this.groups.findIndex((candidate) =>
      value === 'mixed' ? candidate.isMixed : candidate.layer === value,
    );
    if (groupIndex < 0) return;

    const oldGroup = this.groups[groupIndex];
    const oldPool = new Set(oldGroup.pool);
    const oldLiving = oldGroup.pool.filter((ball) => !ball.damaged).length;
    this.state.balls = this.state.balls.filter((ball) => !oldPool.has(ball));
    const group: Group = {
      ...oldGroup,
      pool: [],
      mutationOnly: false,
      best: null,
      seedBest: null,
      gateTimes: {},
    };
    this.groups[groupIndex] = group;
    this.#pendingSaves.delete(oldGroup);

    if (group.isMixed) this.state.sortedMixed[MIXED_LEVELS] = [];
    else this.state.sortedModels[group.layer] = [];
    if (!group.isMixed) this.#refreshExperts();

    group.pool = new Array(config.CARS_PER_GROUP);
    for (let slot = 0; slot < config.CARS_PER_GROUP; slot++)
      group.pool[slot] = this.#spawnBall(group, slot);
    this.state.balls.push(...group.pool);
    this.state.living += group.pool.length - oldLiving;
  }

  #spawnSlots(group: Group) {
    // a teacher-driven run needs a single student, nothing more
    if (group.distillRun) return [0];
    if (group.mutationOnly)
      return Array.from(
        { length: config.FINISHED_CARS_PER_GROUP },
        (_value, slot) => slot + 1,
      );
    return Array.from(
      { length: config.CARS_PER_GROUP },
      (_value, slot) => slot,
    );
  }

  #respawnGroup(group: Group, now: number) {
    if (
      group.pool.length === 0 ||
      group.pool.some((ball) => !ball.damaged) ||
      group.pool.some((ball) => now - ball.deathTime <= config.DEAD_LIFETIME)
    )
      return;

    if (!group.distillRun && group.pool.some((ball) => ball.finished))
      group.mutationOnly = true;
    const corpses = new Set(group.pool);
    this.state.balls = this.state.balls.filter((ball) => !corpses.has(ball));
    group.pool = this.#spawnSlots(group).map((slot) =>
      this.#spawnBall(group, slot),
    );
    this.state.balls.push(...group.pool);
    this.state.living += group.pool.length;
  }

  /** Restart the weakest group as a student of the strongest available
   *  champion, ranking groups by the global dashboard total. */
  #autoTrainAfterGroupDeath(student: Group) {
    const globalScore = (group: Group) =>
      globalRecordFromScores(group.scores).globalScore;
    if (globalScore(student) > Math.min(...this.groups.map(globalScore)))
      return;
    const guide = this.groups
      .filter(
        (group) =>
          group !== student &&
          this.#teacherBrain(group.isMixed ? 'mixed' : group.layer) !== null,
      )
      .sort((a, b) => globalScore(b) - globalScore(a))[0];
    if (!guide || globalScore(guide) - globalScore(student) < 1) return;
    this.setTrainFrom(
      student.isMixed ? 'mixed' : student.layer,
      guide.isMixed ? 'mixed' : guide.layer,
      false,
    );
  }

  #onDeath(ball: Ball): Group | null {
    this.state.living--;
    let deadGroup: Group | null = null;
    ball.deathTime = gameNow();

    if (ball.useAI) {
      const group = this.#groupOf(ball);
      if (group) {
        const wasDistillRun = group.distillRun;
        if (wasDistillRun) {
          this.#keepTrainedBrain(group);
          group.trainFrom = null;
          group.distillRun = false;
          saveTrainFrom('cave', group.isMixed ? 'mixed' : group.layer, null);
        }
        // A gauge death is the ball's natural end of run: promote its brain
        // when it is the group's best so the next spawn mutates from it.
        if (!wasDistillRun) this.#settle(group, ball);
        if (
          !wasDistillRun &&
          group.pool.every((candidate) => candidate.damaged)
        )
          deadGroup = group;
        if (ball.deathCause === 'gauge') this.#pendingSaves.add(group);
        if (
          !wasDistillRun &&
          group.scores.seed > 0 &&
          ball.brain.score >= group.scores.seed - Number.EPSILON
        ) {
          group.ghostScore = ball.brain.score;
          this.#pendingSaves.add(group);
        }
      }
    }
    this.flushPendingSaves();

    if (this.state.human && ball === this.state.human) {
      ball.controls.dispose();
      this.state.human = undefined;
      this.spawnHuman();
      this.#onHumanCrash?.();
    }
    return deadGroup;
  }

  #regenerateCave() {
    // a new cave ends the training run: the selection goes back to free
    // training so the next run measures the student itself
    this.#endDistillRuns();
    this.cave.dispose();
    this.cave = new Cave(this.seed, this.scene);
    this.#completedBrainIndices.clear();
    this.#completedFinishes.clear();
    this.#humanFinishCelebrated = false;
    this.#bestGateFrames = [];
    this.#bestFinishFrames = Infinity;
    this.seedChangeAt = 0;
    this.state.cave = this.cave;
    this.#onSeedChanged?.(this.seed);
    this.#buildPools();

    for (const group of this.groups) {
      group.seedBest = null;
      saveScores(group);
    }
    this.state.balls = this.groups.flatMap((group) => group.pool);
    if (this.state.human) {
      this.state.human.controls.dispose();
      this.state.human = undefined;
    }
    this.spawnHuman();
    this.state.living = this.state.balls.filter((ball) => !ball.damaged).length;
  }

  public applyUserSeed(seed: number) {
    this.seed = seed;
    this.laps = 0;
    this.#regenerateCave();
  }

  #advanceSeed() {
    this.laps++;
    this.seed++;
    this.#regenerateCave();
  }

  public initialize() {
    this.#bestGateFrames = [];
    this.#bestFinishFrames = Infinity;
    this.#humanFinishCelebrated = false;
    Object.assign(this.state, defaultState);
    const { inputCount, outputCount } = getCaveBrainDimensions();
    this.state.sortedModels = this.io.loadAllModelLayers(
      config.MAX_NETWORK_LAYERS,
      undefined,
      (layers) => ({
        levelSizes: networkLevelSizes(inputCount, outputCount, layers),
      }),
    );

    const { width, slotIds } = expertLibraryShape(
      this.state.sortedModels,
      inputCount,
      outputCount,
      config.MIXED_EXPERTS_PER_LAYER,
    );
    this.state.sortedMixed = this.io.loadAllModelLayers(
      MIXED_LEVELS,
      MIXED_KIND,
      () => ({
        levelSizes: [inputCount, config.MIXED_HIDDEN_NODES, width],
        kind: MIXED_KIND,
        requireKind: true,
        expertIds: slotIds,
      }),
    );
    this.state.cave = this.cave;
    this.#buildPools();
    this.state.balls = this.groups.flatMap((group) => group.pool);
    this.spawnHuman();
    this.state.living = this.state.balls.length;
    this.#onReset?.();
  }

  /** Advance one fixed simulation step, leaving rendering and HUD outside. */
  public update(now: number) {
    // Stream the cave to cover every living ball.
    let minS = Infinity;
    let maxS = -Infinity;
    const deadGroups = new Set<Group>();
    for (const ball of this.state.balls) {
      if (ball.damaged) continue;
      minS = Math.min(minS, ball.s);
      maxS = Math.max(maxS, ball.s);
    }
    if (!Number.isFinite(minS)) {
      minS = 0;
      maxS = 0;
    }
    this.cave.update(
      minS - config.CAVE_CHUNKS_BEHIND * config.CAVE_SEGMENT_LENGTH,
      maxS + config.CAVE_CHUNKS_AHEAD * config.CAVE_SEGMENT_LENGTH,
      1 / 60,
    );

    // Race position pays a small per-frame premium: 1st place earns
    // POSITION_SCORE_SCALE each frame, 2nd half as much, and so on. The same
    // position scales the section bonus a ball banks when it advances.
    const ranked = this.#ranked;
    ranked.length = 0;
    for (const ball of this.state.balls) {
      if (!ball.damaged) ranked.push(ball);
    }
    ranked.sort((a, b) => b.s - a.s);
    for (let i = 0; i < ranked.length; i++) {
      ranked[i].racePosition = i + 1;
      // a teacher-driven run is not the student's own output: no score
      if (!this.#groupOf(ranked[i])?.distillRun)
        ranked[i].brain.score += config.POSITION_SCORE_SCALE / (i + 1);
    }

    for (const group of this.groups)
      group.teacher =
        group.trainFrom === null ? null : this.#teacherBrain(group.trainFrom);
    let savePoint = false;
    for (const ball of this.state.balls) {
      const alive = !ball.damaged;
      const racing = !ball.finished;
      const group = this.#groupOf(ball);
      ball.teacher = group?.teacher ?? null;
      ball.distillRun = group?.distillRun ?? false;
      ball.update(this.cave);
      if (racing && ball.finished && !ball.damaged)
        this.#recordFinishTiming(ball);
      if (alive && ball.damaged) {
        const deadGroup = this.#onDeath(ball);
        if (deadGroup) deadGroups.add(deadGroup);
      }
      if (racing && ball.finished && !ball.damaged) {
        const group = this.#groupOf(ball);
        if (group) {
          this.#settle(group, ball);
          this.#markFinished(group);
        }
      }
      if (ball.passedGate) {
        ball.passedGate = false;
        savePoint = true;
        this.#recordGateTiming(ball);
        const group = this.#groupOf(ball);
        if (group) {
          this.#pendingSaves.add(group);
          if (!group.gateTimes[ball.label]) group.gateTimes[ball.label] = [];
          group.gateTimes[ball.label].push(ball.completedGateFrames);
        }
      }
    }
    for (const group of deadGroups) this.#autoTrainAfterGroupDeath(group);

    for (let i = this.state.balls.length - 1; i >= 0; i--) {
      const ball = this.state.balls[i];
      if (
        !ball.useAI &&
        ball.damaged &&
        now - ball.deathTime > config.DEAD_LIFETIME
      )
        this.state.balls.splice(i, 1);
    }
    for (const group of this.groups) this.#respawnGroup(group, now);

    // Track which categories completed this cave, and celebrate the human's
    // first finish when no AI had already finished.
    for (const ball of this.state.balls) {
      if (!ball.finished || !ball.useAI) continue;
      const key =
        ball.brain instanceof MixedNetwork ? 'mixed' : String(ball.brainLayers);
      this.#completedBrainIndices.add(key);
      const previous = this.#completedFinishes.get(key);
      if (!previous || ball.lastFinishFrames < previous.totalFrames)
        this.#completedFinishes.set(key, {
          score: ball.brain.score,
          totalFrames: ball.lastFinishFrames,
        });
    }
    const human = this.state.human;
    if (
      human?.finished &&
      !this.#humanFinishCelebrated &&
      this.#completedFinishes.size === 0
    ) {
      this.#humanFinishCelebrated = true;
      this.#onHumanFinish?.();
    }

    if (this.#completedBrainIndices.size >= 3 && !this.seedChangeAt) {
      this.flushPendingSaves();
      this.seedChangeAt = now + 10_000;
    }
    if (this.seedChangeAt && now >= this.seedChangeAt) this.#advanceSeed();
    if (savePoint) this.flushPendingSaves();
  }

  public saveAll() {
    for (const group of this.groups) {
      this.#persistGroup(group);
      saveScores(group);
    }
  }

  public refreshLeaderboard() {
    this.state.balls.sort((a, b) => b.brain.score - a.brain.score);
    this.state.sortedBalls = this.state.balls;
  }
}
