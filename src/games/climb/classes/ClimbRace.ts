import {
  expertSlotIds,
  hydrateExperts,
  MIXED_KIND,
  MIXED_LEVELS,
  MixedNetwork,
} from '../../../ai/Mixed';
import { NeuralNetwork } from '../../../ai/Network';
import { brainIoMatches } from '../../../ai/distill';
import {
  type fileUtilities,
  networkLevelSizes,
  PLAYER_COLOR,
} from '../../../ai/utils';
import { layerColor } from '../../../utilities/ai/colors';
import { lerp } from '../../../utilities/math';
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
import { config } from './Config';
import { getClimbBrainDimensions, Player } from './Player';
import { Tower } from './Tower';

export type ClimbModelIo = ReturnType<typeof fileUtilities>;

/**
 * Owns the non-visual part of a climb: model pools, score promotion, deaths,
 * respawns, and seed progression. The entry point only coordinates canvases
 * and browser controls.
 */
export class ClimbRace {
  public tower: Tower;
  public seed: number;
  public readonly groups: Group[] = [];
  public seedChangeAt = 0;

  #experts: NeuralNetwork[] = [];
  #pendingSaves = new Set<Group>();
  #onHumanCrash?: () => void;
  #onSeedChanged?: (seed: number) => void;
  #onReset?: () => void;

  constructor(
    private readonly state: typeof defaultState,
    private readonly io: ClimbModelIo,
    seed: number,
    options: {
      onHumanCrash?: () => void;
      onSeedChanged?: (seed: number) => void;
      onReset?: () => void;
    } = {},
  ) {
    this.seed = seed;
    this.tower = new Tower(seed);
    this.#onHumanCrash = options.onHumanCrash;
    this.#onSeedChanged = options.onSeedChanged;
    this.#onReset = options.onReset;
  }

  /** the human player has no group, and its brain score never trains */
  public spawnHuman() {
    const player = new Player(
      config.TOWER_WIDTH / 2,
      0,
      ControlType.HUMAN,
      this.tower,
      '🕹',
      PLAYER_COLOR,
      1,
    );
    this.state.human = player;
    this.state.players.push(player);
    this.state.living++;
  }

  #maxMutation() {
    return lerp(
      config.MAX_MUTATION_LVL,
      config.MIN_MUTATION_LVL,
      Math.min(1, this.seed / config.MUTATION_SEED_DECAY),
    );
  }

  #slotMutation(group: Group, slot: number) {
    if (slot === 0) return 0;
    if (this.#isScoutSlot(group, slot))
      // scouts stay close to the old line they re-explore: bottom rung
      return Math.max(
        Number.MIN_VALUE,
        this.#maxMutation() / config.MUTATION_LADDER_CAP,
      );
    const divisor = group.mutationOnly
      ? config.FINISHED_SWARM_DIVISOR
      : Math.min(slot, config.MUTATION_LADDER_CAP);
    return Math.max(Number.MIN_VALUE, this.#maxMutation() / divisor);
  }

  /** floors banked by this group on the current seed: 0 right after the
   *  seed changed */
  #groupSeedFloors(group: Group) {
    return group.scores.seed;
  }

  /** the last slots of a pool skip the champion mutation and start from a
   *  blank random brain — but only while the group is still struggling. Once
   *  its players have banked EXPLORER_FLOOR_LIMIT floors on this seed, the
   *  line is proven and the slot reverts to a regular mutation player */
  #isExplorerSlot(group: Group, slot: number) {
    if (slot === 0) return false;
    if (this.#groupSeedFloors(group) >= config.EXPLORER_FLOOR_LIMIT)
      return false;
    const size = group.mutationOnly
      ? config.FINISHED_CARS_PER_GROUP
      : config.CARS_PER_GROUP;
    return slot >= size - config.EXPLORER_CARS;
  }

  /** the second-to-last slot of a full pool re-explores the oldest kept
   *  hall of fame line, so a second family of weights is always being
   *  retrained in case the champion line fails to adapt to the next tower */
  #isScoutSlot(group: Group, slot: number) {
    if (group.mutationOnly || group.isMixed) return false;
    return slot === config.CARS_PER_GROUP - 1 - config.EXPLORER_CARS;
  }

  /** oldest line of the hall of fame, null while only one is kept */
  #scoutSource(group: Group): {
    brain: NeuralNetwork;
    score: number;
  } | null {
    const library = this.state.sortedModels[group.layer] || [];
    if (library.length < 2) return null;
    const saved = library[library.length - 1] as NeuralNetwork;
    return { brain: saved, score: saved.score || 0 };
  }

  /** brain a slot mutates from, null = a fresh random brain (explorers,
   *  or a group with no champion yet) */
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

  #spawnPlayer(group: Group, slot: number) {
    // Every layer starts from the same centered ground position, like the
    // human and the tower's first centered platform. Variation belongs in the
    // brains, not in the opening position.
    const x = config.TOWER_WIDTH / 2;
    const player = new Player(
      x,
      0,
      ControlType.AI,
      this.tower,
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
    );
    player.color = group.isMixed
      ? config.MIXED_COLOR
      : layerColor(group.layer, config.MAX_NETWORK_LAYERS);
    const source = this.#slotSource(group, slot);
    if (source && player.brain) {
      player.brain.mutationIndex = slot;
      player.brain.mutationFactor = this.#slotMutation(group, slot);
      try {
        player.brain.mutate(source.brain);
      } catch {
        // the saved brain no longer fits the current sensors: this player keeps
        // the constructor's random brain and starts fresh
      }
    } else if (this.#isExplorerSlot(group, slot) && player.brain) {
      // explorers keep the constructor's random brain: nothing to mutate
      // from, the factor records the full re-roll in the HUD stats
      player.brain.mutationIndex = slot;
      player.brain.mutationFactor = 1;
    }
    return player;
  }

  #refreshExperts() {
    this.#experts = [];
    if (!config.MIXED_ENABLED) return this.#experts;

    const { inputCount, outputCount } = getClimbBrainDimensions();
    const hydrated = hydrateExperts(
      this.state.sortedModels,
      inputCount,
      outputCount,
      config.MIXED_EXPERTS_PER_LAYER,
    );
    if (hydrated.length < config.MIXED_MIN_EXPERTS) return this.#experts;
    this.#experts = hydrated;
    this.#invalidateStaleMixed();
    return this.#experts;
  }

  /** A mixed champion is only as valid as the expert library it was trained
   *  against. When a regular layer promotes a new champion the library grows
   *  and the saved selector routes to slots that no longer exist: drop the
   *  champion so the group starts fresh instead of failing at every respawn. */
  #invalidateStaleMixed() {
    const champion = this.state.sortedMixed[MIXED_LEVELS]?.[0];
    if (!champion) return;
    const levels = champion.levels || [];
    const width = levels.length
      ? levels[levels.length - 1].weights?.[0]?.length
      : undefined;
    const savedIds = (champion.expertIds || []).join();
    if (
      width !== this.#experts.length ||
      (savedIds && savedIds !== expertSlotIds(this.#experts).join())
    )
      this.state.sortedMixed[MIXED_LEVELS] = [];
  }

  #buildPools() {
    // a distilling group keeps its teacher across seed rebuilds
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
      });
    }

    // restored selections must be known before the pools spawn: a distilling
    // group only fields its single student car
    this.#restoreTrainFroms();
    for (const group of this.groups) {
      group.scores = loadScores(group, this.seed);
      group.ghostScore = group.scores.seed;
      // A returning seed that was already held comes back as its swarm
      group.mutationOnly = group.scores.finished[String(this.seed)] === true;
      group.pool = this.#spawnSlots(group).map((slot) =>
        this.#spawnPlayer(group, slot),
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
    for (const [student, target] of loadTrainFroms('climb')) {
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

  #groupOf(player: Player) {
    // The human has a NeuralNetwork-shaped score holder for the shared
    // leaderboard, but must never be mistaken for the layer-1 AI group.
    if (!player.useAI) return undefined;
    const key =
      player.brain instanceof MixedNetwork
        ? 'mixed'
        : String(player.brainLayers);
    return this.groups.find((group) => group.key === key);
  }

  /**
   * Point a group at another one for distillation: the group's climbers are
   * driven by the target's champion brain while their own brains
   * backpropagate toward it. Pass null to free the group back to its own
   * line. A group cannot distill from itself.
   */
  public setTrainFrom(
    value: number | 'mixed',
    target: number | 'mixed' | null,
  ): boolean {
    const group = this.groups.find((candidate) =>
      value === 'mixed' ? candidate.isMixed : candidate.layer === value,
    );
    if (!group || (target !== null && value === target)) return false;
    group.trainFrom = target;
    group.distillRun = target !== null;
    saveTrainFrom('climb', value, target);
    // a training run needs exactly one student player, so restart the group
    // with a single fresh one instead of leaving its whole swarm on the teacher
    this.#restartAsStudent(group);
    return true;
  }

  /**
   * Replace a group's pool with the single student player a training run
   * drives, marking it with the training emoji so the panel and the tower
   * agree.
   */
  #restartAsStudent(group: Group) {
    const corpses = new Set(group.pool);
    const oldLiving = group.pool.filter((p) => !p.damaged).length;
    this.state.players = this.state.players.filter((p) => !corpses.has(p));
    group.pool = this.#spawnSlots(group).map((slot) =>
      this.#spawnPlayer(group, slot),
    );
    this.state.players.push(...group.pool);
    this.state.living += group.pool.length - oldLiving;
    this.state.sortedPlayers = this.state.players.slice();
  }

  /**
   * The end of a run: every distillation selection goes back to free training
   * and its disqualification flag is dropped, together with the persisted
   * choice so a reload starts from a clean, measurable run.
   */
  #endDistillRuns() {
    for (const group of this.groups) {
      if (group.trainFrom === null) continue;
      this.#keepTrainedBrain(group);
      group.trainFrom = null;
      group.distillRun = false;
      saveTrainFrom('climb', group.isMixed ? 'mixed' : group.layer, null);
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
    const { inputCount, outputCount } = getClimbBrainDimensions();
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

  #promote(group: Group, player: Player) {
    // a teacher-driven run is disqualified: it would only save the teacher's
    // behavior under the student's name
    if (group.distillRun) return;
    const brain = JSON.parse(JSON.stringify(player.brain)) as NeuralNetwork;
    group.best = { brain, score: player.brain.score };
    this.#pendingSaves.add(group);
    const saves = group.isMixed
      ? this.state.sortedMixed
      : this.state.sortedModels;
    if (group.isMixed) {
      saves[MIXED_LEVELS] = [brain];
      this.#refreshExperts();
    } else {
      // hall of fame: a rolling window of the recent lines, newest first.
      // The older entries are what the scout slot re-explores
      saves[group.layer] = [brain, ...(saves[group.layer] || [])].slice(
        0,
        config.HALL_OF_FAME_SIZE,
      );
    }
  }

  /** live promotion: a player passing the group's current seed high saves its
   *  brain right away, not only on death, so a tower clear is never lost to
   *  a later fall */
  #settle(group: Group, player: Player) {
    // a teacher-driven run is not the student's own output: it never settles
    if (group.distillRun) return;
    const score = player.brain?.score ?? 0;
    if (!player.useAI || score <= group.scores.seed) return;
    group.scores.seed = score;
    group.seedBest = {
      brain: JSON.parse(JSON.stringify(player.brain)) as NeuralNetwork,
      score: player.brain.score,
    };
    this.#promote(group, player);
    if (group.scores.seed >= config.SEED_TARGET_FLOORS)
      this.#markFinished(group);
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
    const oldLiving = oldGroup.pool.filter((p) => !p.damaged).length;
    this.state.players = this.state.players.filter((p) => !oldPool.has(p));
    const group: Group = {
      ...oldGroup,
      pool: [],
      mutationOnly: false,
      best: null,
      seedBest: null,
    };
    this.groups[groupIndex] = group;
    this.#pendingSaves.delete(oldGroup);

    if (group.isMixed) this.state.sortedMixed[MIXED_LEVELS] = [];
    else this.state.sortedModels[group.layer] = [];
    if (!group.isMixed) this.#refreshExperts();

    group.pool = new Array(config.CARS_PER_GROUP);
    for (let slot = 0; slot < config.CARS_PER_GROUP; slot++) {
      group.pool[slot] = this.#spawnPlayer(group, slot);
    }
    this.state.players.push(...group.pool);
    this.state.living += group.pool.length - oldLiving;
    this.state.sortedPlayers = this.state.players.slice();
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
      group.pool.some((p) => !p.damaged) ||
      group.pool.some((p) => now - p.deathTime <= config.DEAD_LIFETIME)
    )
      return;

    const corpses = new Set(group.pool);
    this.state.players = this.state.players.filter((p) => !corpses.has(p));
    group.pool = this.#spawnSlots(group).map((slot) =>
      this.#spawnPlayer(group, slot),
    );
    this.state.players.push(...group.pool);
    this.state.living += group.pool.length;
  }

  #onDeath(player: Player) {
    this.state.living--;

    if (player.useAI) {
      const group = this.#groupOf(player);
      if (group) {
        if (group.distillRun) {
          this.#keepTrainedBrain(group);
          group.trainFrom = null;
          group.distillRun = false;
          saveTrainFrom('climb', group.isMixed ? 'mixed' : group.layer, null);
        }
        this.#settle(group, player);
        // freeze the ghost when the record holder dies
        if (
          !group.distillRun &&
          group.scores.seed > 0 &&
          (player.brain?.score ?? 0) >= group.scores.seed - Number.EPSILON
        ) {
          // The record holder has left the live race. Promote the best
          // remaining climber as the group's new active champion so the next
          // generation and the local save follow the surviving line.
          const nextBest = group.pool
            .filter((candidate) => candidate !== player && !candidate.damaged)
            .reduce<Player | null>(
              (best, candidate) =>
                !best || (candidate.brain?.score ?? 0) > (best.brain?.score ?? 0)
                  ? candidate
                  : best,
              null,
            );
          if (nextBest?.brain) {
            group.scores.seed = nextBest.brain.score;
            group.seedBest = {
              brain: JSON.parse(JSON.stringify(nextBest.brain)) as NeuralNetwork,
              score: nextBest.brain.score,
            };
            group.ghostScore = player.brain?.score ?? 0;
            this.#promote(group, nextBest);
          } else {
            group.ghostScore = player.brain?.score ?? 0;
          }
          this.#pendingSaves.add(group);
        }
      }
    }
    if (player === this.state.human) {
      player.controls.dispose();
      this.state.human = undefined;
      this.spawnHuman();
      this.#onHumanCrash?.();
    }
    this.flushPendingSaves();
  }

  #regenerateTower() {
    // a new tower ends the training run: the selection goes back to free
    // training so the next run measures the student itself
    this.#endDistillRuns();
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#climb=${this.seed}`,
    );
    this.#onSeedChanged?.(this.seed);
    this.tower = new Tower(this.seed);
    this.seedChangeAt = 0;
    this.state.tower = this.tower;
    this.#buildPools();

    for (const group of this.groups) {
      group.seedBest = null;
      saveScores(group);
    }
    this.state.players = this.groups.flatMap((group) => group.pool);
    if (this.state.human) {
      this.state.human.controls.dispose();
      this.state.human = undefined;
      this.spawnHuman();
    }
    this.state.population = this.state.players.length;
    this.state.living = this.state.players.length;
  }

  public applyUserSeed(seed: number) {
    this.seed = seed;
    this.#regenerateTower();
  }

  #advanceSeed() {
    this.seed++;
    this.#regenerateTower();
  }

  public initialize() {
    Object.assign(this.state, defaultState);
    this.state.playing = true;
    const { inputCount, outputCount } = getClimbBrainDimensions();
    this.state.sortedModels = this.io.loadAllModelLayers(
      config.MAX_NETWORK_LAYERS,
      undefined,
      (layers) => ({
        levelSizes: networkLevelSizes(inputCount, outputCount, layers),
      }),
    );

    // Mixed selector saves depend on the current regular expert library. Do
    // this check before building any tower pools so stale routing weights
    // are removed instead of failing later during mutation.
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
    this.state.tower = this.tower;
    this.#buildPools();
    this.state.players = this.groups.flatMap((group) => group.pool);
    this.spawnHuman();
    this.state.population = this.state.players.length;
    this.state.living = this.state.players.length;
    this.#onReset?.();
  }

  /** Advance one simulation frame, leaving rendering and HUD updates outside. */
  public update(now: number) {
    for (const group of this.groups)
      group.teacher =
        group.trainFrom === null ? null : this.#teacherBrain(group.trainFrom);
    let highest = 0;
    for (const player of this.state.players) {
      const alive = !player.damaged;
      const group = this.#groupOf(player);
      player.teacher = group?.teacher ?? null;
      player.distillRun = group?.distillRun ?? false;
      player.update(now);
      if (alive && player.damaged) this.#onDeath(player);
      if (!player.damaged && player.y > highest) highest = player.y;
    }
    this.state.highestY = highest;
    // expired corpses leave the list: AI pools clean up at their respawn,
    // but a human corpse has no group to do that for it
    this.state.players = this.state.players.filter(
      (p) => !p.damaged || now - p.deathTime <= config.DEAD_LIFETIME,
    );
    // stream the tower upward from the highest living climber
    this.tower.ensureAbove(highest + config.AHEAD);

    for (const group of this.groups) this.#respawnGroup(group, now);

    // live promotion while the climber is still on the platform
    for (const player of this.state.players) {
      if (player.damaged || !player.useAI) continue;
      const group = this.#groupOf(player);
      if (group) this.#settle(group, player);
    }

    // the seed advances once enough groups hold the seed target
    let holding = 0;
    for (const group of this.groups)
      if (group.scores.seed >= config.SEED_TARGET_FLOORS) holding++;
    if (holding >= config.FINISHED_GROUPS_PER_SEED && !this.seedChangeAt) {
      this.flushPendingSaves();
      this.seedChangeAt = now + config.SEED_CHANGE_MS;
    }
    if (this.seedChangeAt && now >= this.seedChangeAt) this.#advanceSeed();
    this.flushPendingSaves();
  }

  public saveAll() {
    for (const group of this.groups) {
      this.#persistGroup(group);
      saveScores(group);
    }
  }

  /** Reorders the live player list by floor. Only the throttled HUD reads the
   *  order, so the per-frame update never pays for the sort. */
  public refreshLeaderboard() {
    this.state.players.sort((a, b) => {
      const scoreA = a.brain?.score ?? 0;
      const scoreB = b.brain?.score ?? 0;
      return scoreB - scoreA;
    });
    this.state.sortedPlayers = this.state.players;
  }
}
