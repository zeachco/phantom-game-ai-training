import type { Scene } from 'three';
import {
  expertSlotIds,
  hydrateExperts,
  MIXED_KIND,
  MIXED_LEVELS,
  MixedNetwork,
} from '../../../ai/Mixed';
import type { NeuralNetwork } from '../../../ai/Network';
import {
  type fileUtilities,
  networkLevelSizes,
  PLAYER_COLOR,
} from '../../../ai/utils';
import { lerp } from '../../../utilities/math';
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

  get completedFinishes() {
    return this.#completedFinishes;
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

  #slotMutation(group: Group, slot: number) {
    if (slot === 0) return 0;
    if (this.#isScoutSlot(group, slot))
      return Math.max(
        Number.MIN_VALUE,
        this.#maxMutation() / config.MUTATION_LADDER_CAP,
      );
    const divisor = group.mutationOnly
      ? config.FINISHED_SWARM_DIVISOR
      : Math.min(slot, config.MUTATION_LADDER_CAP);
    return Math.max(Number.MIN_VALUE, this.#maxMutation() / divisor);
  }

  /** gates claimed by this group's balls on the current seed, accumulated
   *  across pool respawns: 0 right after the seed changed */
  #groupSeedGates(group: Group) {
    let gates = 0;
    for (const key of Object.keys(group.gateTimes))
      gates += group.gateTimes[key].length;
    return gates;
  }

  #isExplorerSlot(group: Group, slot: number) {
    // the demo profile is mutations only, so no random explorer and no scout
    // ever replaces one of its three slots
    if (config.DEMO) return false;
    if (slot === 0) return false;
    if (this.#groupSeedGates(group) >= config.EXPLORER_LAP_LIMIT) return false;
    const size = group.mutationOnly
      ? config.FINISHED_CARS_PER_GROUP
      : config.CARS_PER_GROUP;
    return slot >= size - config.EXPLORER_CARS;
  }

  #isScoutSlot(group: Group, slot: number) {
    if (config.DEMO) return false;
    if (group.mutationOnly || group.isMixed) return false;
    return slot === config.CARS_PER_GROUP - 1 - config.EXPLORER_CARS;
  }

  #scoutSource(group: Group): { brain: NeuralNetwork; score: number } | null {
    const library = this.state.sortedModels[group.layer] || [];
    if (library.length < 2) return null;
    const saved = library[library.length - 1] as NeuralNetwork;
    return { brain: saved, score: saved.score || 0 };
  }

  #slotSource(
    group: Group,
    slot: number,
  ): { brain: NeuralNetwork; score: number } | null {
    if (!group.best) return null;
    if (this.#isExplorerSlot(group, slot)) return null;
    if (this.#isScoutSlot(group, slot))
      return this.#scoutSource(group) ?? group.best;
    return group.best;
  }

  #spawnBall(group: Group, slot: number) {
    const spawn = this.cave.getSpawn();
    const ball = new Ball(
      spawn,
      ControlType.AI,
      config.BALL_MAX_SPEED,
      brainId(group.layer, slot),
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
    const source = this.#slotSource(group, slot);
    if (source && ball.brain) {
      ball.brain.mutationIndex = slot;
      ball.brain.mutationFactor = this.#slotMutation(group, slot);
      try {
        ball.brain.mutate(source.brain);
      } catch (err) {
        console.error(
          `Line ${group.layer} save does not fit the current sensors, starting fresh.\nReset data with ${location.href}&clear=true`,
          err instanceof Error ? err.message : err,
        );
      }
    } else if (this.#isExplorerSlot(group, slot) && ball.brain) {
      ball.brain.mutationIndex = slot;
      ball.brain.mutationFactor = 1;
    }
    return ball;
  }

  #refreshExperts() {
    this.#experts = [];
    if (!config.MIXED_ENABLED) return this.#experts;

    const { inputCount, outputCount } = getCaveBrainDimensions();
    const hydrated = hydrateExperts(
      this.state.sortedModels,
      inputCount,
      outputCount,
      config.MIXED_EXPERTS_PER_LAYER,
    );
    if (hydrated.length < config.MIXED_MIN_EXPERTS) {
      console.debug(
        `🧭 Mixed brain needs ${config.MIXED_MIN_EXPERTS} trained brains, ${hydrated.length} available`,
      );
      return this.#experts;
    }
    this.#experts = hydrated;
    return this.#experts;
  }

  #buildPools() {
    this.groups.length = 0;
    const hydrated = this.#refreshExperts();

    if (config.MIXED_ENABLED && hydrated.length >= config.MIXED_MIN_EXPERTS) {
      this.groups.push({
        key: 'mixed',
        layer: 0,
        isMixed: true,
        pool: [],
        mutationOnly: false,
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

  #groupOf(ball: Ball) {
    if (!ball.useAI) return undefined;
    const key =
      ball.brain instanceof MixedNetwork ? 'mixed' : String(ball.brainLayers);
    return this.groups.find((group) => group.key === key);
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
    const brain = JSON.parse(JSON.stringify(ball.brain)) as NeuralNetwork;
    group.best = { brain, score: ball.brain.score };
    this.#pendingSaves.add(group);
    const saves = group.isMixed
      ? this.state.sortedMixed
      : this.state.sortedModels;
    if (group.isMixed) {
      saves[group.layer] = [brain];
      this.#refreshExperts();
    } else {
      saves[group.layer] = [brain, ...(saves[group.layer] || [])].slice(
        0,
        config.HALL_OF_FAME_SIZE,
      );
    }
  }

  #settle(group: Group, ball: Ball) {
    if (!ball.useAI || ball.brain.score <= group.scores.seed) return;
    group.scores.seed = ball.brain.score;
    group.seedBest = {
      brain: JSON.parse(JSON.stringify(ball.brain)) as NeuralNetwork,
      score: ball.brain.score,
    };
    this.#promote(group, ball);
  }

  #markFinished(group: Group) {
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

    if (group.isMixed) this.state.sortedMixed[group.layer] = [];
    else this.state.sortedModels[group.layer] = [];
    if (!group.isMixed) this.#refreshExperts();

    group.pool = new Array(config.CARS_PER_GROUP);
    for (let slot = 0; slot < config.CARS_PER_GROUP; slot++)
      group.pool[slot] = this.#spawnBall(group, slot);
    this.state.balls.push(...group.pool);
    this.state.living += group.pool.length - oldLiving;
    this.state.sortedBalls = this.state.balls.slice();
  }

  #spawnSlots(group: Group) {
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

    if (group.pool.some((ball) => ball.finished)) group.mutationOnly = true;
    const corpses = new Set(group.pool);
    this.state.balls = this.state.balls.filter((ball) => !corpses.has(ball));
    group.pool = this.#spawnSlots(group).map((slot) =>
      this.#spawnBall(group, slot),
    );
    this.state.balls.push(...group.pool);
    this.state.living += group.pool.length;
  }

  #onDeath(ball: Ball) {
    this.state.living--;
    ball.deathTime = performance.now();

    if (ball.useAI) {
      const group = this.#groupOf(ball);
      if (group) {
        // A gauge death is the ball's natural end of run: promote its brain
        // when it is the group's best so the next spawn mutates from it.
        this.#settle(group, ball);
        if (ball.deathCause === 'gauge') this.#pendingSaves.add(group);
        if (
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
  }

  #regenerateCave() {
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
    this.state.population = this.state.balls.length;
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
    this.state.playing = true;
    const { inputCount, outputCount } = getCaveBrainDimensions();
    this.state.sortedModels = this.io.loadAllModelLayers(
      config.MAX_NETWORK_LAYERS,
      undefined,
      (layers) => ({
        levelSizes: networkLevelSizes(inputCount, outputCount, layers),
      }),
    );

    const experts = hydrateExperts(
      this.state.sortedModels,
      inputCount,
      outputCount,
      config.MIXED_EXPERTS_PER_LAYER,
    );
    this.state.sortedMixed = this.io.loadAllModelLayers(
      MIXED_LEVELS,
      MIXED_KIND,
      () => ({
        levelSizes: [inputCount, config.MIXED_HIDDEN_NODES, experts.length],
        kind: MIXED_KIND,
        requireKind: true,
        expertIds: expertSlotIds(experts),
      }),
    );
    this.state.cave = this.cave;
    this.#buildPools();
    this.state.balls = this.groups.flatMap((group) => group.pool);
    this.spawnHuman();
    this.state.population = this.state.balls.length;
    this.state.living = this.state.balls.length;
    this.#onReset?.();
  }

  /** Advance one fixed simulation step, leaving rendering and HUD outside. */
  public update(now: number) {
    // Stream the cave to cover every living ball.
    let minS = Infinity;
    let maxS = -Infinity;
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
    const living = this.state.balls.filter((ball) => !ball.damaged);
    const ranked = living.slice().sort((a, b) => b.s - a.s);
    for (let i = 0; i < ranked.length; i++) {
      ranked[i].racePosition = i + 1;
      ranked[i].brain.score += config.POSITION_SCORE_SCALE / (i + 1);
    }

    let savePoint = false;
    for (const ball of this.state.balls) {
      const alive = !ball.damaged;
      const racing = !ball.finished;
      ball.update(this.cave);
      if (racing && ball.finished && !ball.damaged)
        this.#recordFinishTiming(ball);
      if (alive && ball.damaged) this.#onDeath(ball);
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
      !Array.from(this.#completedFinishes.keys()).some((key) => key !== 'human')
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

  /** Reorders the live ball list by score; only the throttled HUD reads it. */
  public refreshLeaderboard() {
    this.state.balls.sort((a, b) => b.brain.score - a.brain.score);
    this.state.sortedBalls = this.state.balls;
  }
}
