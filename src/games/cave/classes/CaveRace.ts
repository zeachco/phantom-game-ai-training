import type { Scene } from 'three';
import { MixedNetwork } from '../../../ai/Mixed';
import { type fileUtilities, PLAYER_COLOR } from '../../../ai/utils';
import { gameNow } from '../../../utilities/gameClock';
import { brainKey, type GroupBase } from '../../../utilities/groupScores';
import { lerp } from '../../../utilities/math';
import { RaceBase, type RaceProfile } from '../../../utilities/race/RaceBase';
import {
  isExplorerSlot,
  type SlotPolicy,
  slotMutation,
  slotSource,
} from '../../../utilities/race/slotPolicy';
import { saveTrainFrom, studentLabel } from '../../../utilities/trainFrom';
import { ControlType } from '../../../utilities/types';
import { brainId, defaultState, type Group } from '../utilities';
import { Ball, getCaveBrainDimensions } from './Ball';
import { Cave } from './Cave';
import { config } from './Config';

export type CaveModelIo = ReturnType<typeof fileUtilities>;

/** the explorer/scout slot policy for this game's pool shapes and the
 *  gates a group has banked on the current seed; the demo profile is
 *  mutations only, so no explorer or scout ever replaces one of its slots */
const slotPolicy: SlotPolicy<Group> = {
  poolSize: config.CARS_PER_GROUP,
  explorerSlots: config.EXPLORER_CARS,
  explorerLimit: config.EXPLORER_LAP_LIMIT,
  mutationLadderCap: config.MUTATION_LADDER_CAP,
  progress: (group) => {
    let gates = 0;
    for (const key of Object.keys(group.gateTimes))
      gates += group.gateTimes[key].length;
    return gates;
  },
  demo: config.DEMO,
};

/** the shared race lifecycle profile for this game, from its config */
const raceProfile: RaceProfile = {
  game: 'cave',
  carsPerGroup: config.CARS_PER_GROUP,
  hallOfFameSize: config.HALL_OF_FAME_SIZE,
  deadLifetime: config.DEAD_LIFETIME,
  maxNetworkLayers: config.MAX_NETWORK_LAYERS,
  mixedEnabled: config.MIXED_ENABLED,
  mixedMinExperts: config.MIXED_MIN_EXPERTS,
  mixedHiddenNodes: config.MIXED_HIDDEN_NODES,
  mixedExpertsPerLayer: config.MIXED_EXPERTS_PER_LAYER,
};

/**
 * Owns the non-visual part of a cave run: model pools, score promotion,
 * gauge/crash deaths, respawns and seed progression. It is the cave twin of
 * the circuit's CircuitRace, with gates standing in for laps and the section
 * gauge standing in for the checkpoint budget.
 */
export class CaveRace extends RaceBase<Ball, typeof defaultState, Group> {
  public cave: Cave;
  /** seeds completed so far, drives the mutation anneal exactly like laps */
  public laps = 0;

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
  #onHumanCrash?: () => void;
  #onHumanFinish?: () => void;
  #onSeedChanged?: (seed: number) => void;

  constructor(
    state: typeof defaultState,
    io: CaveModelIo,
    seed: number,
    private readonly scene: Scene,
    options: {
      onHumanCrash?: () => void;
      onHumanFinish?: () => void;
      onSeedChanged?: (seed: number) => void;
      onReset?: () => void;
    } = {},
  ) {
    super(state, io, seed, raceProfile, { onReset: options.onReset });
    this.cave = new Cave(seed, scene);
    this.#onHumanCrash = options.onHumanCrash;
    this.#onHumanFinish = options.onHumanFinish;
    this.#onSeedChanged = options.onSeedChanged;
  }

  protected override get entities(): Ball[] {
    return this.state.balls;
  }
  protected override set entities(balls: Ball[]) {
    this.state.balls = balls;
  }
  protected override get sortedEntities(): Ball[] {
    return this.state.sortedBalls;
  }
  protected override set sortedEntities(balls: Ball[]) {
    this.state.sortedBalls = balls;
  }

  /** the human ball has no brain, group, or saved weights */
  public override spawnHuman() {
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

  protected override spawnEntity(group: Group, slot: number): Ball {
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
            new MixedNetwork(inputCount, outputCount, this.experts, {
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

  protected override respawnHuman(): void {
    if (this.state.human) {
      this.state.human.controls.dispose();
      this.state.human = undefined;
    }
    this.spawnHuman();
  }

  // the cave state has no population counter, the living count is enough
  protected override onRebuilt(): void {}

  protected override brainDimensions() {
    return getCaveBrainDimensions();
  }

  protected override createGroup(core: GroupBase<Ball>): Group {
    return { ...core, seedBest: null, gateTimes: {} };
  }

  protected override poolFinished(group: Group): boolean {
    return group.pool.some((ball) => ball.finished);
  }

  #maxMutation() {
    return lerp(
      config.MAX_MUTATION_LVL,
      config.MIN_MUTATION_LVL,
      Math.min(1, this.laps / config.MUTATION_LAP_DECAY),
    );
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

  #settle(group: Group, ball: Ball) {
    // a teacher-driven run is not the student's own output: it never settles
    if (group.distillRun) return;
    if (!ball.useAI || ball.brain.score <= group.scores.seed) return;
    group.scores.seed = ball.brain.score;
    group.seedBest = {
      brain: JSON.parse(JSON.stringify(ball.brain)) as typeof ball.brain,
      score: ball.brain.score,
    };
    this.promote(group, ball);
  }

  #onDeath(ball: Ball): Group | null {
    this.state.living--;
    let deadGroup: Group | null = null;
    ball.deathTime = gameNow();

    if (ball.useAI) {
      const group = this.groupOf(ball);
      if (group) {
        const wasDistillRun = group.distillRun;
        if (wasDistillRun) {
          this.keepTrainedBrain(group);
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
        if (ball.deathCause === 'gauge') this.pendingSaves.add(group);
        if (
          !wasDistillRun &&
          group.scores.seed > 0 &&
          ball.brain.score >= group.scores.seed - Number.EPSILON
        ) {
          group.ghostScore = ball.brain.score;
          this.pendingSaves.add(group);
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
    this.endDistillRuns();
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
    this.finishRegenerate();
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
    this.loadSavedModels();
    this.state.cave = this.cave;
    this.initializeCore();
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
      if (!this.groupOf(ranked[i])?.distillRun)
        ranked[i].brain.score += config.POSITION_SCORE_SCALE / (i + 1);
    }

    for (const group of this.groups)
      group.teacher =
        group.trainFrom === null ? null : this.teacherBrain(group.trainFrom);
    let savePoint = false;
    for (const ball of this.state.balls) {
      const alive = !ball.damaged;
      const racing = !ball.finished;
      const group = this.groupOf(ball);
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
        const group = this.groupOf(ball);
        if (group) {
          this.#settle(group, ball);
          this.markFinished(group);
        }
      }
      if (ball.passedGate) {
        ball.passedGate = false;
        savePoint = true;
        this.#recordGateTiming(ball);
        const group = this.groupOf(ball);
        if (group) {
          this.pendingSaves.add(group);
          if (!group.gateTimes[ball.label]) group.gateTimes[ball.label] = [];
          group.gateTimes[ball.label].push(ball.completedGateFrames);
        }
      }
    }
    for (const group of deadGroups) this.autoTrainAfterGroupDeath(group);

    for (let i = this.state.balls.length - 1; i >= 0; i--) {
      const ball = this.state.balls[i];
      if (
        !ball.useAI &&
        ball.damaged &&
        now - ball.deathTime > config.DEAD_LIFETIME
      )
        this.state.balls.splice(i, 1);
    }
    for (const group of this.groups) this.respawnGroup(group, now);

    // Track which categories completed this cave, and celebrate the human's
    // first finish when no AI had already finished.
    for (const ball of this.state.balls) {
      if (!ball.finished || !ball.useAI) continue;
      const key = brainKey(ball.brain, ball.brainLayers);
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
    else if (this.seedTimedOut(now)) {
      // no winner within the seed's 10-minute limit: restart from seed 0
      this.flushPendingSaves();
      this.applyUserSeed(0);
    }
    if (savePoint) this.flushPendingSaves();
  }
}
