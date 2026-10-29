import { MixedNetwork } from '../../../ai/Mixed';
import { type fileUtilities, PLAYER_COLOR } from '../../../ai/utils';
import { gameNow } from '../../../utilities/gameClock';
import type { GroupBase } from '../../../utilities/groupScores';
import { lerp } from '../../../utilities/math';
import { RaceBase, type RaceProfile } from '../../../utilities/race/RaceBase';
import {
  isExplorerSlot,
  type SlotPolicy,
  slotMutation,
  slotSource,
} from '../../../utilities/race/slotPolicy';
import { studentLabel } from '../../../utilities/trainFrom';
import { ControlType } from '../../../utilities/types';
import { brainId, defaultState, type Group } from '../utilities';
import { Car, getCircuitBrainDimensions } from './Car';
import { Circuit } from './Circuit';
import { config } from './Config';

export type CircuitModelIo = ReturnType<typeof fileUtilities>;

/** the explorer/scout slot policy for this game's pool shapes and the
 *  laps a group has banked on the current seed */
const slotPolicy: SlotPolicy<Group> = {
  poolSize: config.CARS_PER_GROUP,
  explorerSlots: config.EXPLORER_CARS,
  explorerLimit: config.EXPLORER_LAP_LIMIT,
  mutationLadderCap: config.MUTATION_LADDER_CAP,
  progress: (group) => {
    let laps = 0;
    for (const key of Object.keys(group.lapTimes))
      laps += group.lapTimes[key].length;
    return laps;
  },
};

/** the shared race lifecycle profile for this game, from its config */
const raceProfile: RaceProfile = {
  game: 'circuit',
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
 * Owns the non-visual part of a circuit race: model pools, score promotion,
 * deaths, respawns, and seed progression. The entry point only coordinates
 * canvases and browser controls now.
 */
export class CircuitRace extends RaceBase<Car, typeof defaultState, Group> {
  public circuit: Circuit;
  public laps = 0;

  /** regular architecture groups that have finished this track once */
  #completedTrackGroups = new Set<string>();
  #completedFinishes = new Map<
    string,
    { score: number | null; totalFrames: number }
  >();
  /** fastest split for each checkpoint on the current track */
  #bestCheckpointFrames: number[] = [];
  /** fastest completed lap and finish on the current track */
  #bestLapFrames = Infinity;
  #bestFinishFrames = Infinity;
  #humanFinishCelebrated = false;
  #onHumanCrash?: () => void;
  #onHumanFinish?: () => void;
  #onSeedChanged?: (seed: number) => void;

  constructor(
    state: typeof defaultState,
    io: CircuitModelIo,
    seed: number,
    options: {
      onHumanCrash?: () => void;
      onHumanFinish?: () => void;
      onSeedChanged?: (seed: number) => void;
      onReset?: () => void;
    } = {},
  ) {
    super(state, io, seed, raceProfile, { onReset: options.onReset });
    this.circuit = new Circuit(seed);
    this.#onHumanCrash = options.onHumanCrash;
    this.#onHumanFinish = options.onHumanFinish;
    this.#onSeedChanged = options.onSeedChanged;
  }

  get completedFinishes() {
    return this.#completedFinishes;
  }

  protected override get entities(): Car[] {
    return this.state.cars;
  }
  protected override set entities(cars: Car[]) {
    this.state.cars = cars;
  }
  protected override get sortedEntities(): Car[] {
    return this.state.sortedCars;
  }
  protected override set sortedEntities(cars: Car[]) {
    this.state.sortedCars = cars;
  }

  protected override spawnEntity(group: Group, slot: number): Car {
    const spawn = this.circuit.getSpawn();
    const car = new Car(
      spawn.x,
      spawn.y,
      spawn.angle,
      ControlType.AI,
      config.CAR_MAX_SPEED,
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
    );
    const source = slotSource(group, slot, this.state.sortedModels, slotPolicy);
    if (source && car.brain) {
      car.brain.mutationIndex = slot;
      car.brain.mutationFactor = slotMutation(
        group,
        slot,
        this.#maxMutation(),
        slotPolicy,
      );
      try {
        car.brain.mutate(source.brain);
      } catch {
        // the saved brain no longer fits the current sensors: this car keeps
        // the constructor's random brain and starts fresh
      }
    } else if (isExplorerSlot(group, slot, slotPolicy) && car.brain) {
      // explorers keep the constructor's random brain: nothing to mutate
      // from, the factor records the full re-roll in the HUD stats
      car.brain.mutationIndex = slot;
      car.brain.mutationFactor = 1;
    }
    return car;
  }

  /** the human car has no brain, group, or saved weights */
  public override spawnHuman() {
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

  protected override respawnHuman(): void {
    if (this.state.human) {
      this.state.human.controls.dispose();
      this.state.human = undefined;
      this.spawnHuman();
    }
  }

  protected override onRebuilt(): void {
    this.state.population = this.entities.length;
  }

  protected override brainDimensions() {
    return getCircuitBrainDimensions();
  }

  protected override createGroup(core: GroupBase<Car>): Group {
    return { ...core, lapTimes: {} };
  }

  protected override poolFinished(group: Group): boolean {
    return group.pool.some((car) => car.finished);
  }

  #maxMutation() {
    return lerp(
      config.MAX_MUTATION_LVL,
      config.MIN_MUTATION_LVL,
      Math.min(1, this.laps / config.MUTATION_LAP_DECAY),
    );
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

  #settle(group: Group, car: Car) {
    // a teacher-driven run is not the student's own output: it never settles
    if (group.distillRun) return;
    if (!car.useAI || car.brain.score <= group.scores.seed) return;
    group.scores.seed = car.brain.score;
    group.ghostScore = car.brain.score;
    this.promote(group, car);
  }

  /** Circuit's "pick a trainee" moment, when a group's whole pool is wiped
   *  out and is about to respawn. The dead group itself is the only possible
   *  student: it trains only if it is the last group on the current track
   *  board (no other group has a lower track record), no other group is
   *  already in a training run, and the round that just ended was a free
   *  run and not a training session. A group that finished the required
   *  laps on this track is never retrained on it. The guide is the group
   *  with the best current track record. */
  protected override autoTrainAfterGroupDeath(deadGroup: Group): void {
    // the round that just ended is consumed either way: the next wipe is
    // judged on the free run that follows
    const trainedLastRound = deadGroup.lastRoundWasTraining;
    deadGroup.lastRoundWasTraining = false;
    if (deadGroup.distillRun || trainedLastRound) return;
    if (deadGroup.scores.finished[String(this.seed)] === true) return;
    if (this.groups.some((group) => group.distillRun)) return;
    const isLast = this.groups.every(
      (group) => group.ghostScore >= deadGroup.ghostScore,
    );
    if (!isLast) return;
    const guide = this.groups
      .filter(
        (group) =>
          group !== deadGroup &&
          group.ghostScore > deadGroup.ghostScore &&
          this.teacherBrain(group.isMixed ? 'mixed' : group.layer) !== null,
      )
      .sort((a, b) => b.ghostScore - a.ghostScore)[0];
    if (!guide) return;
    this.setTrainFrom(
      deadGroup.isMixed ? 'mixed' : deadGroup.layer,
      guide.isMixed ? 'mixed' : guide.layer,
      false,
    );
  }

  #onDeath(car: Car): Group | null {
    this.state.living--;
    let deadGroup: Group | null = null;
    car.deathTime = gameNow();

    if (car.useAI) {
      const group = this.groupOf(car);
      if (group) {
        const wasDistillRun = group.distillRun;
        if (wasDistillRun) {
          // the round that just ended was a training session: the next
          // respawn is a free run that measures the trained brain
          group.lastRoundWasTraining = true;
          this.endDistillRun(group);
        }
        if (!wasDistillRun) this.#settle(group, car);
        if (
          !wasDistillRun &&
          group.scores.seed > 0 &&
          car.brain.score >= group.scores.seed - Number.EPSILON
        ) {
          group.ghostScore = car.brain.score;
          this.pendingSaves.add(group);
        }
        if (
          !wasDistillRun &&
          group.pool.every((instance) => instance.damaged)
        ) {
          deadGroup = group;
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
    return deadGroup;
  }

  #regenerateMap() {
    // a new map ends the training run: the selection goes back to free
    // training so the next run measures the student itself
    for (const group of this.groups)
      if (group.distillRun) group.lastRoundWasTraining = true;
    this.endDistillRuns();
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#circuit=${this.seed}`,
    );
    this.#onSeedChanged?.(this.seed);
    this.circuit = new Circuit(this.seed);
    this.#completedTrackGroups.clear();
    this.#completedFinishes.clear();
    this.#humanFinishCelebrated = false;
    this.#bestCheckpointFrames = [];
    this.#bestLapFrames = Infinity;
    this.#bestFinishFrames = Infinity;
    this.seedChangeAt = 0;
    this.state.circuit = this.circuit;
    this.state.obstacles = this.circuit.obstacles;
    this.finishRegenerate();
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
    this.#humanFinishCelebrated = false;
    Object.assign(this.state, defaultState);
    this.state.playing = true;
    this.loadSavedModels();
    this.state.circuit = this.circuit;
    this.state.obstacles = this.circuit.obstacles;
    this.initializeCore();
  }

  /** Advance one simulation frame, leaving rendering and HUD updates outside. */
  public update(now: number) {
    this.circuit.updateObstacles();
    for (const group of this.groups)
      group.teacher =
        group.trainFrom === null ? null : this.teacherBrain(group.trainFrom);
    let savePoint = false;
    const deadGroups = new Set<Group>();
    for (const car of this.state.cars) {
      const alive = !car.damaged;
      const racing = !car.finished;
      const group = this.groupOf(car);
      car.teacher = group?.teacher ?? null;
      car.distillRun = group?.distillRun ?? false;
      // once the guide has actually piloted this car, its track completion is
      // tainted: another model drove it, so LAPS_PER_SEED is not its finish
      if (car.distillRun && car.teacher) car.guideDriven = true;
      car.update(this.state.obstacles, this.circuit);
      // Let the guide drive a lap and a half, then kill the student: its
      // position, velocity, and lap timing were all shaped by the teacher,
      // so the car dies on the spot and the group respawns as a full normal
      // pool on the trained brain. Half a lap is half the gates, all claimed
      // in order. The death below ends the run like a crash: keep the
      // trained brain, drop the disqualification.
      if (
        car.laps >= 1 &&
        car.nextCheckpoint >= config.CHECKPOINTS / 2 &&
        group?.distillRun
      ) {
        car.damaged = true;
      }
      this.#recordCheckpointTiming(car);
      if (car.completedLap) this.#recordLapTiming(car);
      if (alive && car.damaged) {
        const deadGroup = this.#onDeath(car);
        if (deadGroup) deadGroups.add(deadGroup);
      }
      if (racing && car.finished && !car.damaged) {
        this.#recordFinishTiming(car);
        const group = this.groupOf(car);
        if (group) {
          this.#settle(group, car);
          this.markFinished(group);
        }
      }
      if (car.passedCheckpoint) {
        car.passedCheckpoint = false;
        savePoint = true;
        const group = this.groupOf(car);
        if (group) {
          this.#settle(group, car);
          this.pendingSaves.add(group);
        }
      }
    }

    for (const group of deadGroups) this.autoTrainAfterGroupDeath(group);

    for (let i = this.state.cars.length - 1; i >= 0; i--) {
      const car = this.state.cars[i];
      if (
        !car.useAI &&
        car.damaged &&
        now - car.deathTime > config.DEAD_LIFETIME
      )
        this.state.cars.splice(i, 1);
    }
    for (const group of this.groups) this.respawnGroup(group, now);

    for (const car of this.state.cars) {
      const completedLap = car.completedLap;
      car.completedLap = false;
      const group = this.groupOf(car);
      if (completedLap && group && car.useAI && car.completedLapAt > 0) {
        const key = group.isMixed
          ? `mixed-${group.pool.indexOf(car)}`
          : car.label;
        group.lapTimes[key] = group.lapTimes[key] || [];
        group.lapTimes[key].push(car.completedLapFrames);
      }
      // a guide-driven car passed the finish mark but its track completion
      // is invalidated: the run never counts as finished
      if (car.laps >= config.LAPS_PER_SEED && !car.guideDriven) {
        const brainIndex =
          car === this.state.human
            ? 'human'
            : car.brain instanceof MixedNetwork
              ? 'mixed'
              : String(car.brainLayers);
        if (
          group &&
          !group.isMixed &&
          !this.#completedTrackGroups.has(group.key)
        ) {
          this.#completedTrackGroups.add(group.key);
        }
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
        // The human's first completed map is a win only when no AI had
        // already finished. Keep this separate from the three-finisher map
        // advance rule so the celebration is emitted exactly once.
        if (
          car === this.state.human &&
          !this.#humanFinishCelebrated &&
          !Array.from(this.#completedFinishes.keys()).some(
            (key) => key !== 'human',
          )
        ) {
          this.#humanFinishCelebrated = true;
          this.#onHumanFinish?.();
        }
      }
    }

    if (this.#completedTrackGroups.size >= 6 && !this.seedChangeAt) {
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
