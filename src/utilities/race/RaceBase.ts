import { brainIoMatches } from '../../ai/distill';
import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import { NeuralNetwork } from '../../ai/Network';
import {
  type fileUtilities,
  type ModelsByLayerCount,
  networkLevelSizes,
} from '../../ai/utils';
import { gameNow } from '../gameClock';
import {
  brainKey,
  defaultGroupScores,
  type GroupBase,
  loadScores as loadScoresForGame,
  saveScores as saveScoresForGame,
} from '../groupScores';
import { globalRecordFromScores } from '../scoreRecords';
import {
  loadTrainFroms,
  saveTrainFrom,
  trainedBrain,
  withTrainedBrain,
} from '../trainFrom';
import { expertLibraryShape, refreshExperts } from './expertLibrary';

/** the model io every game wires up from ai/utils' fileUtilities */
export type ModelIo = ReturnType<typeof fileUtilities>;

/** the fields the shared race lifecycle reads on any racing entity */
export interface RaceEntity {
  /** optional where a game can field brainless entities (the human) */
  brain?: NeuralNetwork;
  useAI: boolean;
  brainLayers: number;
  damaged: boolean;
  deathTime: number;
  /** frames a teacher has driven this entity on the current run */
  teacherFrames: number;
}

/** the shared part of a game state the base reads and writes */
export interface RaceStateShape<TEntity extends RaceEntity> {
  human: TEntity | undefined;
  living: number;
  sortedModels: ModelsByLayerCount[];
  sortedMixed: ModelsByLayerCount[];
  groups: GroupBase<TEntity>[];
}

/**
 * The per-game constants the shared lifecycle needs, gathered in one place so
 * the base never reaches into a game's config module.
 */
export interface RaceProfile {
  /** the localStorage/train-from prefix: 'circuit' | 'climb' | 'cave' */
  game: string;
  carsPerGroup: number;
  hallOfFameSize: number;
  deadLifetime: number;
  maxNetworkLayers: number;
  mixedEnabled: boolean;
  mixedMinExperts: number;
  mixedHiddenNodes: number;
  mixedExpertsPerLayer: number;
}

export interface RaceBaseOptions {
  /** the entry point's post-rebuild hook (camera, follow target, ...) */
  onReset?: () => void;
}

/** A seed game that produces no winner restarts from seed 0 after this long. */
export const SEED_TIMEOUT_MS = 10 * 60_000;

/**
 * The part of a racing game that is shared by every game: the brain group
 * bookkeeping, champion persistence, train-from runs, and the rebuild
 * sequence. The per-game Race class keeps the simulation, scoring, and
 * world generation, and supplies the entity accessors and spawn methods.
 */
export abstract class RaceBase<
  TEntity extends RaceEntity,
  TState extends RaceStateShape<TEntity>,
  TGroup extends GroupBase<TEntity>,
> {
  public seed: number;
  public readonly groups: TGroup[] = [];
  public seedChangeAt = 0;
  /** the game clock the current seed started on (pause-aware) */
  public seedStartedAt = 0;

  protected readonly state: TState;
  protected readonly io: ModelIo;
  protected readonly profile: RaceProfile;
  protected readonly pendingSaves = new Set<TGroup>();
  protected experts: NeuralNetwork[] = [];
  #onReset?: () => void;

  constructor(
    state: TState,
    io: ModelIo,
    seed: number,
    profile: RaceProfile,
    options: RaceBaseOptions = {},
  ) {
    this.state = state;
    this.io = io;
    this.seed = seed;
    this.profile = profile;
    this.#onReset = options.onReset;
  }

  /* ---- the per-game surface the shared lifecycle works through ---- */

  /** the live entity pool (cars / players / balls) in the game state */
  protected abstract get entities(): TEntity[];
  protected abstract set entities(list: TEntity[]);
  /** the score-sorted mirror of the pool, read by the HUD */
  protected abstract get sortedEntities(): TEntity[];
  protected abstract set sortedEntities(list: TEntity[]);
  /** create one AI entity for the group's slot, brain wiring included */
  protected abstract spawnEntity(group: TGroup, slot: number): TEntity;
  /** create the human-driven entity */
  public abstract spawnHuman(): void;
  /** replace the human entity after a world rebuild */
  protected abstract respawnHuman(): void;
  /** bookkeeping after a rebuild (population counters and the like) */
  protected abstract onRebuilt(): void;
  /** the brain input/output counts for this game's sensors */
  protected abstract brainDimensions(): {
    inputCount: number;
    outputCount: number;
  };
  /** build one fresh group, adding the per-game extra fields */
  protected abstract createGroup(core: GroupBase<TEntity>): TGroup;
  /** whether the pool's finish state demotes the group to a mutation swarm */
  protected abstract poolFinished(group: TGroup): boolean;

  /* ---- shared lifecycle ---- */

  /** the group an entity belongs to, by its brain kind and depth */
  protected groupOf(entity: TEntity): TGroup | undefined {
    // The human has a NeuralNetwork-shaped score holder for shared physics,
    // but must never be mistaken for the layer-1 AI group.
    if (!entity.useAI) return undefined;
    return this.groups.find(
      (group) => group.key === brainKey(entity.brain, entity.brainLayers),
    );
  }

  /**
   * Point a group at another one for distillation: the group's entities are
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
    // the flag mirrors the selection: freeing the group back to its own
    // line ends the run immediately, not at the next run boundary
    group.distillRun = target !== null;
    if (persist) saveTrainFrom(this.profile.game, value, target);
    // a training run needs exactly one student, so the run restarts the group
    // with a single fresh one; freeing it restarts with the full swarm, since
    // the spawn slots follow the distill flag
    this.#restartAsStudent(group);
    return true;
  }

  /** The score of the brain the group is distilling from, null for free
   *  training or while the target has no champion yet. */
  public teacherScore(value: number | 'mixed'): number | null {
    const group = this.groups.find((candidate) =>
      value === 'mixed' ? candidate.isMixed : candidate.layer === value,
    );
    if (!group || group.trainFrom === null) return null;
    return this.teacherBrain(group.trainFrom)?.score ?? null;
  }

  /** The brain a distilling group imitates: the target group's champion,
   *  null while the target has none yet. Champions loaded from the saves are
   *  plain data with no methods, so a raw one is hydrated once (mixed brains
   *  against the current expert library) and cached until it is replaced. */
  protected teacherBrain(target: number | 'mixed'): NeuralNetwork | null {
    const key = target === 'mixed' ? 'mixed' : String(target);
    const group = this.groups.find((candidate) => candidate.key === key);
    const champion = group?.best?.brain ?? null;
    if (!champion) return null;
    if (typeof champion.process === 'function') return champion;
    const cached = group.hydratedTeacher;
    if (cached?.champion === champion) return cached.brain;
    const { inputCount, outputCount } = this.brainDimensions();
    const brain = group.isMixed
      ? MixedNetwork.fromSave(champion, inputCount, outputCount, this.experts, {
          hiddenNodes: this.profile.mixedHiddenNodes,
        })
      : NeuralNetwork.hydrate(champion);
    if (!brain) return null;
    // train-from only needs matching inputs and outputs: any depth or kind is
    // fine, but a mismatched brain would teach a different function
    if (!brainIoMatches(brain, inputCount, outputCount)) return null;
    group.hydratedTeacher = { champion, brain };
    return brain;
  }

  #refreshExperts(): NeuralNetwork[] {
    const { inputCount, outputCount } = this.brainDimensions();
    this.experts = refreshExperts(
      this.state,
      inputCount,
      outputCount,
      this.profile.mixedExpertsPerLayer,
      this.profile.mixedMinExperts,
      this.profile.mixedEnabled,
    );
    return this.experts;
  }

  public flushPendingSaves(): void {
    for (const group of this.pendingSaves) {
      this.#persistGroup(group);
      saveScoresForGame(this.profile.game, group, group.scores);
    }
    this.pendingSaves.clear();
  }

  public saveAll(): void {
    for (const group of this.groups) {
      this.#persistGroup(group);
      saveScoresForGame(this.profile.game, group, group.scores);
    }
  }

  /** regular groups persist their whole hall of fame, mixed the single
   *  champion save */
  #persistGroup(group: TGroup): void {
    if (!group.best) return;
    if (group.isMixed) this.io.saveBestModels([group.best.brain], 1);
    else
      this.io.saveModelList(
        group.layer,
        this.state.sortedModels[group.layer] || [group.best.brain],
      );
  }

  /**
   * Hand the student's trained weights to the next generation: the brain takes
   * the place of the group's base model, so the next run mutates from what the
   * student learned. Its score is the one the group already had, a disjoint
   * run never sets a record.
   */
  protected keepTrainedBrain(group: TGroup): void {
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
        this.profile.hallOfFameSize,
      );
    } else {
      this.state.sortedModels[group.layer] = withTrainedBrain(
        this.state.sortedModels[group.layer] ?? [],
        trained,
        this.profile.hallOfFameSize,
      );
    }
    this.#persistGroup(group);
    saveScoresForGame(this.profile.game, group, group.scores);
  }

  protected markFinished(group: TGroup): void {
    if (group.distillRun) return;
    group.scores.finished[String(this.seed)] = true;
    this.pendingSaves.add(group);
  }

  #spawnSlots(group: TGroup): number[] {
    // why: distillRun is the spawn contract shared by every pool-rebuild site (setTrainFrom, respawn, endDistillRuns) — one flag, no per-call re-derivation.
    // a teacher-driven run needs a single student, nothing more
    if (group.distillRun) return [0];
    return Array.from(
      { length: this.profile.carsPerGroup },
      (_value, slot) => slot,
    );
  }

  protected promote(group: TGroup, entity: TEntity): void {
    // a teacher-driven run is disqualified: it would only save the teacher's
    // behavior under the student's name
    if (group.distillRun) return;
    // why: deep-clone on purpose — the entity keeps mutating its own brain mid-race
    // (climb's live promotion saves between steps), and the saved champion is the
    // save + next-generation parent, so it must not follow later mutations.
    const brain = JSON.parse(JSON.stringify(entity.brain)) as NeuralNetwork;
    group.best = { brain, score: entity.brain.score };
    this.pendingSaves.add(group);
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
        this.profile.hallOfFameSize,
      );
    }
  }

  protected respawnGroup(group: TGroup, now: number): void {
    if (
      group.pool.length === 0 ||
      group.pool.some((entity) => !entity.damaged) ||
      group.pool.some(
        (entity) => now - entity.deathTime <= this.profile.deadLifetime,
      )
    )
      return;

    const corpses = new Set(group.pool);
    this.entities = this.entities.filter((entity) => !corpses.has(entity));
    group.pool = this.#spawnSlots(group).map((slot) =>
      this.spawnEntity(group, slot),
    );
    this.entities.push(...group.pool);
    this.state.living += group.pool.length;
  }

  /** A fully crashed group can restart as a student only while it is in the
   *  lower tier (bottom half) of both rankings: its live score on the
   *  current track and its global dashboard total, so a group that is
   *  strong on this track is never retrained just because its all-time
   *  total lags. The guide comes from three tiers: a regular group that has
   *  already finished this track (the best finisher by track score), then
   *  the strongest mix of both rankings (a regular group further ahead on
   *  this track and higher on the dashboard, ranked by the sum of the two
   *  scores), and only when no regular group qualifies, the mixed group. */
  protected autoTrainAfterGroupDeath(student: TGroup): void {
    const globalScore = (group: TGroup) =>
      globalRecordFromScores(group.scores).globalScore;
    const trackScore = (group: TGroup) => group.scores.seed;
    if (!this.inLowerTier(student, trackScore)) return;
    if (!this.inLowerTier(student, globalScore)) return;
    const candidates = this.groups.filter(
      (group) =>
        group !== student &&
        this.teacherBrain(group.isMixed ? 'mixed' : group.layer) !== null,
    );
    // A group that already finished this track demonstrably drives it: the
    // best finisher by current-track score takes the slot, whatever its
    // global total says.
    const finishers = candidates.filter(
      (group) =>
        !group.isMixed &&
        (this.poolFinished(group) ||
          group.scores.finished[String(this.seed)] === true),
    );
    if (finishers.length > 0) {
      const guide = finishers.sort((a, b) => trackScore(b) - trackScore(a))[0];
      this.setTrainFrom(
        student.isMixed ? 'mixed' : student.layer,
        guide.isMixed ? 'mixed' : guide.layer,
        false,
      );
      return;
    }
    // Otherwise the guide mixes both rankings: a regular group far enough
    // ahead on this track and with a better global total, ranked by the sum
    // of the two so track progress can outweigh a global lead.
    const guide = candidates
      .filter(
        (group) =>
          !group.isMixed &&
          trackScore(group) > trackScore(student) &&
          globalScore(group) - globalScore(student) >= 1,
      )
      .sort(
        (a, b) =>
          globalScore(b) + trackScore(b) - (globalScore(a) + trackScore(a)),
      )[0];
    if (guide) {
      this.setTrainFrom(
        student.isMixed ? 'mixed' : student.layer,
        guide.isMixed ? 'mixed' : guide.layer,
        false,
      );
      return;
    }
    // Last resort: no regular group is far enough ahead on this track with
    // a better global total, so the mixed group pilots the run.
    const mixed = candidates.find((group) => group.isMixed);
    if (mixed && globalScore(mixed) - globalScore(student) >= 1)
      this.setTrainFrom(
        student.isMixed ? 'mixed' : student.layer,
        'mixed',
        false,
      );
  }

  /** True while the group sits in the bottom half of the ranking the score
   *  function gives the groups, ties included. */
  protected inLowerTier(
    group: TGroup,
    score: (group: TGroup) => number,
  ): boolean {
    const value = score(group);
    const ahead = this.groups.filter((other) => score(other) > value).length;
    return ahead >= Math.ceil(this.groups.length / 2);
  }

  /**
   * End one group's distillation run at a trainee death: keep the trained
   * brain, free the selection and drop its disqualification flag, together
   * with the persisted choice so a reload starts from a clean, measurable run.
   */
  protected endDistillRun(group: TGroup): void {
    this.keepTrainedBrain(group);
    group.trainFrom = null;
    group.distillRun = false;
    saveTrainFrom(
      this.profile.game,
      group.isMixed ? 'mixed' : group.layer,
      null,
    );
  }

  /** End every distillation run: all selections go back to free training. */
  protected endDistillRuns(): void {
    for (const group of this.groups) {
      if (group.trainFrom === null && !group.distillRun) continue;
      this.endDistillRun(group);
    }
  }

  /**
   * Replace a group's pool with the single student a training run drives,
   * marking it with the training emoji so the panel and the world agree.
   */
  #restartAsStudent(group: TGroup): void {
    const corpses = new Set(group.pool);
    const oldLiving = group.pool.filter((entity) => !entity.damaged).length;
    this.entities = this.entities.filter((entity) => !corpses.has(entity));
    group.pool = this.#spawnSlots(group).map((slot) =>
      this.spawnEntity(group, slot),
    );
    this.entities.push(...group.pool);
    this.state.living += group.pool.length - oldLiving;
    this.sortedEntities = this.entities.slice();
  }

  /** Restore the persisted distillation targets the in-memory carryover did
   *  not cover, on a fresh page load every group starts free. */
  #restoreTrainFroms(): void {
    // a group carried over with a target is mid-training: single student,
    // disqualified score
    for (const group of this.groups)
      group.distillRun = group.trainFrom !== null;
    for (const [student, target] of loadTrainFroms(this.profile.game)) {
      if (student === target) continue;
      const group = this.groups.find((candidate) =>
        student === 'mixed' ? candidate.isMixed : candidate.layer === student,
      );
      if (!group || group.trainFrom !== null) continue;
      group.trainFrom = target;
      // a restored selection is an active training run: one student and a
      // disqualified score until the run ends
      group.distillRun = true;
    }
  }

  #buildPools(): void {
    // a distilling group keeps its teacher across world rebuilds
    const trainFroms = new Map(
      this.groups.map((group) => [group.key, group.trainFrom]),
    );
    this.groups.length = 0;
    const hydrated = this.#refreshExperts();

    if (
      this.profile.mixedEnabled &&
      hydrated.length >= this.profile.mixedMinExperts
    ) {
      this.groups.push(
        this.createGroup({
          key: 'mixed',
          layer: 0,
          isMixed: true,
          pool: [],
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
          ghostScore: 0,
          scores: defaultGroupScores(this.seed),
        }),
      );
    }

    for (let layer = 1; layer <= this.profile.maxNetworkLayers; layer++) {
      this.groups.push(
        this.createGroup({
          key: String(layer),
          layer,
          isMixed: false,
          pool: [],
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
          ghostScore: 0,
          scores: defaultGroupScores(this.seed),
        }),
      );
    }

    // restored selections must be known before the pools spawn: a distilling
    // group only fields its single student
    this.#restoreTrainFroms();
    for (const group of this.groups) {
      group.scores = loadScoresForGame(this.profile.game, group, this.seed);
      // Every generated world starts with a fresh active comparison. Earlier
      // records remain in history for the HUD, not as a ghost or race goal.
      group.ghostScore = group.scores.seed;
      group.pool = this.#spawnSlots(group).map((slot) =>
        this.spawnEntity(group, slot),
      );
    }
    this.state.groups = this.groups;
  }

  /** Clear one saved champion and rebuild only that group's ladder. */
  public resetBrainGroup(value: number | 'mixed'): void {
    const groupIndex = this.groups.findIndex((candidate) =>
      value === 'mixed' ? candidate.isMixed : candidate.layer === value,
    );
    if (groupIndex < 0) return;

    const oldGroup = this.groups[groupIndex];
    const oldPool = new Set(oldGroup.pool);
    const oldLiving = oldGroup.pool.filter((entity) => !entity.damaged).length;
    this.entities = this.entities.filter((entity) => !oldPool.has(entity));
    const group = this.createGroup({
      ...oldGroup,
      pool: [],
      best: null,
    });
    this.groups[groupIndex] = group;
    this.pendingSaves.delete(oldGroup);

    if (group.isMixed) this.state.sortedMixed[MIXED_LEVELS] = [];
    else this.state.sortedModels[group.layer] = [];
    if (!group.isMixed) this.#refreshExperts();

    group.pool = new Array(this.profile.carsPerGroup);
    for (let slot = 0; slot < this.profile.carsPerGroup; slot++) {
      group.pool[slot] = this.spawnEntity(group, slot);
    }
    this.entities.push(...group.pool);
    this.state.living += group.pool.length - oldLiving;
    this.sortedEntities = this.entities.slice();
  }

  /** Reorders the live entity list by score. Only the throttled HUD reads the
   *  order, so the per-frame update never pays for the sort. */
  public refreshLeaderboard(): void {
    this.entities.sort((a, b) => (b.brain?.score ?? 0) - (a.brain?.score ?? 0));
    this.sortedEntities = this.entities;
  }

  /** Load every persisted brain for this game's network shape, validating the
   *  mixed selector saves against the current expert library. */
  protected loadSavedModels(): void {
    const { inputCount, outputCount } = this.brainDimensions();
    this.state.sortedModels = this.io.loadAllModelLayers(
      this.profile.maxNetworkLayers,
      undefined,
      (layers) => ({
        levelSizes: networkLevelSizes(inputCount, outputCount, layers),
      }),
    );

    // Mixed selector saves depend on the current regular expert library. Do
    // this check before building any world pools so stale routing weights are
    // removed instead of failing later during mutation.
    const { width, slotIds } = expertLibraryShape(
      this.state.sortedModels,
      inputCount,
      outputCount,
      this.profile.mixedExpertsPerLayer,
    );
    this.state.sortedMixed = this.io.loadAllModelLayers(
      MIXED_LEVELS,
      MIXED_KIND,
      () => ({
        levelSizes: [inputCount, this.profile.mixedHiddenNodes, width],
        kind: MIXED_KIND,
        requireKind: true,
        expertIds: slotIds,
      }),
    );
  }

  /**
   * A seed that produced no winner within SEED_TIMEOUT_MS is stale: each
   * game checks this in update() and regenerates from seed 0.
   */
  protected seedTimedOut(now: number): boolean {
    return !this.seedChangeAt && now - this.seedStartedAt >= SEED_TIMEOUT_MS;
  }

  /** Build the pools, field the world, and hand control back to the entry
   *  point's post-rebuild hook. Called from the game's initialize(). */
  protected initializeCore(): void {
    this.seedStartedAt = gameNow();
    this.#buildPools();
    this.entities = this.groups.flatMap((group) => group.pool);
    this.spawnHuman();
    this.onRebuilt();
    this.state.living = this.entities.filter(
      (entity) => !entity.damaged,
    ).length;
    this.#onReset?.();
  }

  /** Field the new world after a seed change: rebuild the pools, persist the
   *  fresh seed scores, swap in the pools, and respawn the human. The game
   *  owns the world object itself and calls this from its regenerate step. */
  protected finishRegenerate(): void {
    this.seedStartedAt = gameNow();
    this.#buildPools();
    for (const group of this.groups)
      saveScoresForGame(this.profile.game, group, group.scores);
    this.entities = this.groups.flatMap((group) => group.pool);
    this.respawnHuman();
    this.onRebuilt();
    this.state.living = this.entities.filter(
      (entity) => !entity.damaged,
    ).length;
  }
}
