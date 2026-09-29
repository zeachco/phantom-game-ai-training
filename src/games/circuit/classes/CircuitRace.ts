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
import { Car, getCircuitBrainDimensions } from './Car';
import { Circuit } from './Circuit';
import { config } from './Config';

export type CircuitModelIo = ReturnType<typeof fileUtilities>;

/**
 * Owns the non-visual part of a circuit race: model pools, score promotion,
 * deaths, respawns, and seed progression. The entry point only coordinates
 * canvases and browser controls now.
 */
export class CircuitRace {
  public circuit: Circuit;
  public seed: number;
  public laps = 0;
  public readonly groups: Group[] = [];
  public seedChangeAt = 0;

  #experts: NeuralNetwork[] = [];
  #completedBrainIndices = new Set<string>();
  #completedFinishes = new Map<
    string,
    { score: number | null; totalFrames: number }
  >();
  /** fastest split for each checkpoint on the current track */
  #bestCheckpointFrames: number[] = [];
  /** fastest completed lap and finish on the current track */
  #bestLapFrames = Infinity;
  #bestFinishFrames = Infinity;
  #pendingSaves = new Set<Group>();
  #onHumanCrash?: () => void;
  #onSeedChanged?: (seed: number) => void;
  #onReset?: () => void;

  constructor(
    private readonly state: typeof defaultState,
    private readonly io: CircuitModelIo,
    seed: number,
    options: {
      onHumanCrash?: () => void;
      onSeedChanged?: (seed: number) => void;
      onReset?: () => void;
    } = {},
  ) {
    this.seed = seed;
    this.circuit = new Circuit(seed);
    this.#onHumanCrash = options.onHumanCrash;
    this.#onSeedChanged = options.onSeedChanged;
    this.#onReset = options.onReset;
  }

  get completedFinishes() {
    return this.#completedFinishes;
  }

  /** the human car has no brain, group, or saved weights */
  public spawnHuman() {
    const spawn = this.circuit.getSpawn();
    const car = new Car(
      spawn.x,
      spawn.y,
      spawn.angle,
      ControlType.HUMAN,
      config.CAR_MAX_SPEED,
      '🕹',
      'white',
      1,
    );
    car.setColor(PLAYER_COLOR);
    this.state.human = car;
    this.state.cars.push(car);
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
    const divisor = group.mutationOnly
      ? config.FINISHED_SWARM_DIVISOR
      : Math.min(slot, config.MUTATION_LADDER_CAP);
    return Math.max(Number.MIN_VALUE, this.#maxMutation() / divisor);
  }

  #spawnCar(group: Group, slot: number) {
    const spawn = this.circuit.getSpawn();
    const car = new Car(
      spawn.x,
      spawn.y,
      spawn.angle,
      ControlType.AI,
      config.CAR_MAX_SPEED,
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
    );
    if (group.best && car.brain) {
      car.brain.mutationIndex = slot;
      car.brain.mutationFactor = this.#slotMutation(group, slot);
      try {
        car.brain.mutate(group.best.brain);
      } catch (err) {
        console.error(
          `Line ${group.layer} save does not fit the current sensors, starting fresh.\nReset data with ${location.href}&clear=true`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    return car;
  }

  #refreshExperts() {
    this.#experts = [];
    if (!config.MIXED_ENABLED) return this.#experts;

    const { inputCount, outputCount } = getCircuitBrainDimensions();
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
        lapTimes: {},
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
        lapTimes: {},
      });
    }

    for (const group of this.groups) {
      group.scores = loadScores(group, this.seed);
      // Every generated track starts with a fresh active comparison. Earlier
      // records remain in history for the HUD, not as a ghost or race goal.
      group.ghostScore = group.scores.seed;
      group.mutationOnly = group.scores.finished[String(this.seed)] === true;
      group.pool = this.#spawnSlots(group).map((slot) =>
        this.#spawnCar(group, slot),
      );
    }
    this.state.groups = this.groups;
  }

  #groupOf(car: Car) {
    const key =
      car.brain instanceof MixedNetwork ? 'mixed' : String(car.brainLayers);
    return this.groups.find((group) => group.key === key);
  }

  /** Record a checkpoint split before it can become the new reference. */
  #recordCheckpointTiming(car: Car) {
    const index = car.completedCheckpointIndex;
    if (index < 0) return;

    const frames = car.completedCheckpointFrames;
    const best = this.#bestCheckpointFrames[index];
    car.lastCheckpointIndex = index;
    car.lastCheckpointFrames = frames;
    car.lastCheckpointDelta = typeof best === 'number' ? frames - best : null;
    if (typeof best !== 'number' || frames < best)
      this.#bestCheckpointFrames[index] = frames;
    car.completedCheckpointIndex = -1;
  }

  /** Record a completed lap against the best lap seen on this track. */
  #recordLapTiming(car: Car) {
    const frames = car.completedLapFrames;
    car.lastLapDelta = Number.isFinite(this.#bestLapFrames)
      ? frames - this.#bestLapFrames
      : null;
    if (frames < this.#bestLapFrames) this.#bestLapFrames = frames;
  }

  /** Record the final total before it becomes the new track reference. */
  #recordFinishTiming(car: Car) {
    const frames = car.totalRaceFrames;
    car.lastFinishFrames = frames;
    car.lastFinishDelta = Number.isFinite(this.#bestFinishFrames)
      ? frames - this.#bestFinishFrames
      : null;
    if (frames < this.#bestFinishFrames) this.#bestFinishFrames = frames;
  }

  #promote(group: Group, car: Car) {
    const brain = JSON.parse(JSON.stringify(car.brain)) as NeuralNetwork;
    group.best = { brain, score: car.brain.score };
    this.#pendingSaves.add(group);
    const saves = group.isMixed
      ? this.state.sortedMixed
      : this.state.sortedModels;
    saves[group.layer] = [brain];
    if (group.isMixed) this.#refreshExperts();
  }

  #settle(group: Group, car: Car) {
    if (!car.useAI || car.brain.score <= group.scores.seed) return;
    group.scores.seed = car.brain.score;
    group.seedBest = {
      brain: JSON.parse(JSON.stringify(car.brain)) as NeuralNetwork,
      score: car.brain.score,
    };
    this.#promote(group, car);
  }

  #markFinished(group: Group) {
    group.mutationOnly = true;
    group.scores.finished[String(this.seed)] = true;
    this.#pendingSaves.add(group);
  }

  public flushPendingSaves() {
    for (const group of this.#pendingSaves) {
      if (group.best) this.io.saveBestModels([group.best.brain], 1);
      saveScores(group);
    }
    this.#pendingSaves.clear();
  }

  /** Clear one saved champion and rebuild only that group's ladder. */
  public resetBrainGroup(value: number | 'mixed') {
    const groupIndex = this.groups.findIndex((candidate) =>
      value === 'mixed' ? candidate.isMixed : candidate.layer === value,
    );
    if (groupIndex < 0) return;

    const oldGroup = this.groups[groupIndex];
    const oldPool = new Set(oldGroup.pool);
    const oldLiving = oldGroup.pool.filter((car) => !car.damaged).length;
    this.state.cars = this.state.cars.filter((car) => !oldPool.has(car));
    const group: Group = {
      ...oldGroup,
      pool: [],
      mutationOnly: false,
      best: null,
      seedBest: null,
      lapTimes: {},
    };
    this.groups[groupIndex] = group;
    this.#pendingSaves.delete(oldGroup);

    if (group.isMixed) this.state.sortedMixed[group.layer] = [];
    else this.state.sortedModels[group.layer] = [];
    if (!group.isMixed) this.#refreshExperts();

    group.pool = new Array(config.CARS_PER_GROUP);
    for (let slot = 0; slot < config.CARS_PER_GROUP; slot++) {
      group.pool[slot] = this.#spawnCar(group, slot);
    }
    this.state.cars.push(...group.pool);
    this.state.living += group.pool.length - oldLiving;
    this.state.sortedCars = this.state.cars.slice();
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
      group.pool.some((car) => !car.damaged) ||
      group.pool.some((car) => now - car.deathTime <= config.DEAD_LIFETIME)
    )
      return;

    if (group.pool.some((car) => car.finished)) group.mutationOnly = true;
    const corpses = new Set(group.pool);
    this.state.cars = this.state.cars.filter((car) => !corpses.has(car));
    group.pool = this.#spawnSlots(group).map((slot) =>
      this.#spawnCar(group, slot),
    );
    this.state.cars.push(...group.pool);
    this.state.living += group.pool.length;
  }

  #onDeath(car: Car) {
    this.state.living--;
    car.deathTime = performance.now();

    if (car.useAI) {
      const group = this.#groupOf(car);
      if (group) {
        this.#settle(group, car);
        if (
          group.scores.seed > 0 &&
          car.brain.score >= group.scores.seed - Number.EPSILON
        ) {
          group.ghostScore = car.brain.score;
          this.#pendingSaves.add(group);
        }
      }
    }
    this.flushPendingSaves();

    if (this.state.human && car === this.state.human) {
      car.controls.dispose();
      this.state.human = undefined;
      this.spawnHuman();
      this.#onHumanCrash?.();
    }
  }

  #regenerateMap() {
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#circuit=${this.seed}`,
    );
    this.#onSeedChanged?.(this.seed);
    this.circuit = new Circuit(this.seed);
    this.#completedBrainIndices.clear();
    this.#completedFinishes.clear();
    this.#bestCheckpointFrames = [];
    this.#bestLapFrames = Infinity;
    this.#bestFinishFrames = Infinity;
    this.seedChangeAt = 0;
    this.state.circuit = this.circuit;
    this.state.obstacles = this.circuit.obstacles;
    this.#buildPools();

    for (const group of this.groups) {
      group.seedBest = null;
      saveScores(group);
    }
    this.state.cars = this.groups.flatMap((group) => group.pool);
    if (this.state.human) {
      this.state.human.controls.dispose();
      this.state.human = undefined;
      this.spawnHuman();
    }
    this.state.population = this.state.cars.length;
    this.state.living = this.state.cars.filter((car) => !car.damaged).length;
  }

  public applyUserSeed(seed: number) {
    this.seed = seed;
    this.laps = 0;
    this.#regenerateMap();
  }

  #advanceSeed() {
    this.laps++;
    this.seed++;
    this.#regenerateMap();
  }

  public initialize() {
    this.#bestCheckpointFrames = [];
    this.#bestLapFrames = Infinity;
    this.#bestFinishFrames = Infinity;
    Object.assign(this.state, defaultState);
    this.state.playing = true;
    const { inputCount, outputCount } = getCircuitBrainDimensions();
    this.state.sortedModels = this.io.loadAllModelLayers(
      config.MAX_NETWORK_LAYERS,
      undefined,
      (layers) => ({
        levelSizes: networkLevelSizes(inputCount, outputCount, layers),
      }),
    );

    // Mixed selector saves depend on the current regular expert library. Do
    // this check before building any map pools so stale routing weights are
    // removed instead of failing later during mutation.
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
    this.state.circuit = this.circuit;
    this.state.obstacles = this.circuit.obstacles;
    this.#buildPools();
    this.state.cars = this.groups.flatMap((group) => group.pool);
    this.spawnHuman();
    this.state.population = this.state.cars.length;
    this.state.living = this.state.cars.length;
    this.#onReset?.();
  }

  /** Advance one simulation frame, leaving rendering and HUD updates outside. */
  public update(now: number) {
    this.circuit.updateObstacles();
    let savePoint = false;
    for (const car of this.state.cars) {
      const alive = !car.damaged;
      const racing = !car.finished;
      car.update(this.state.obstacles, this.circuit);
      this.#recordCheckpointTiming(car);
      if (car.completedLap) this.#recordLapTiming(car);
      if (racing && car.finished && !car.damaged) this.#recordFinishTiming(car);
      if (alive && car.damaged) this.#onDeath(car);
      if (racing && car.finished && !car.damaged) {
        const group = this.#groupOf(car);
        if (group) {
          this.#settle(group, car);
          this.#markFinished(group);
        }
      }
      if (car.passedCheckpoint) {
        car.passedCheckpoint = false;
        savePoint = true;
        const group = this.#groupOf(car);
        if (group) this.#pendingSaves.add(group);
      }
    }

    for (let i = this.state.cars.length - 1; i >= 0; i--) {
      const car = this.state.cars[i];
      if (
        !car.useAI &&
        car.damaged &&
        now - car.deathTime > config.DEAD_LIFETIME
      )
        this.state.cars.splice(i, 1);
    }
    for (const group of this.groups) this.#respawnGroup(group, now);

    for (const car of this.state.cars) {
      const completedLap = car.completedLap;
      car.completedLap = false;
      const group = this.#groupOf(car);
      if (completedLap && group && car.useAI && car.completedLapAt > 0) {
        const key = group.isMixed
          ? `mixed-${group.pool.indexOf(car)}`
          : car.label;
        group.lapTimes[key] = group.lapTimes[key] || [];
        group.lapTimes[key].push(car.completedLapFrames);
      }
      if (car.laps >= config.LAPS_PER_SEED) {
        const brainIndex =
          car === this.state.human
            ? 'human'
            : car.brain instanceof MixedNetwork
              ? 'mixed'
              : String(car.brainLayers);
        this.#completedBrainIndices.add(brainIndex);
        const previousFinish = this.#completedFinishes.get(brainIndex);
        if (
          !previousFinish ||
          car.totalRaceFrames < previousFinish.totalFrames
        ) {
          this.#completedFinishes.set(brainIndex, {
            score: car.useAI ? car.brain.score : null,
            totalFrames: car.totalRaceFrames,
          });
        }
      }
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
      if (group.best) this.io.saveBestModels([group.best.brain], 1);
      saveScores(group);
    }
  }

  /** Reorders the live car list by score. Only the throttled HUD reads the
   *  order, so the per-frame update never pays for the sort. */
  public refreshLeaderboard() {
    this.state.cars.sort((a, b) => b.brain.score - a.brain.score);
    this.state.sortedCars = this.state.cars;
  }
}
