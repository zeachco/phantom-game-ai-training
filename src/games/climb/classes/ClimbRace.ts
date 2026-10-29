import { MixedNetwork } from '../../../ai/Mixed';
import { type fileUtilities, PLAYER_COLOR } from '../../../ai/utils';
import { layerColor, MIXED_COLOR } from '../../../utilities/ai/colors';
import type { GroupBase } from '../../../utilities/groupScores';
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
import { config } from './Config';
import { getClimbBrainDimensions, Player } from './Player';
import { Tower } from './Tower';

export type ClimbModelIo = ReturnType<typeof fileUtilities>;

/**
 * Owns the non-visual part of a climb: model pools, score promotion, deaths,
 * respawns, and seed progression. The entry point only coordinates canvases
 * and browser controls.
 */

/** the explorer/scout slot policy for this game's pool shapes and the
 *  floors a group has banked on the current seed */
const slotPolicy: SlotPolicy<Group> = {
  poolSize: config.CARS_PER_GROUP,
  explorerSlots: config.EXPLORER_CARS,
  explorerLimit: config.EXPLORER_FLOOR_LIMIT,
  mutationLadderCap: config.MUTATION_LADDER_CAP,
  progress: (group) => group.scores.seed,
};

/** the shared race lifecycle profile for this game, from its config */
const raceProfile: RaceProfile = {
  game: 'climb',
  carsPerGroup: config.CARS_PER_GROUP,
  hallOfFameSize: config.HALL_OF_FAME_SIZE,
  deadLifetime: config.DEAD_LIFETIME,
  maxNetworkLayers: config.MAX_NETWORK_LAYERS,
  mixedEnabled: config.MIXED_ENABLED,
  mixedMinExperts: config.MIXED_MIN_EXPERTS,
  mixedHiddenNodes: config.MIXED_HIDDEN_NODES,
  mixedExpertsPerLayer: config.MIXED_EXPERTS_PER_LAYER,
};

export class ClimbRace extends RaceBase<Player, typeof defaultState, Group> {
  public tower: Tower;

  #onHumanCrash?: () => void;
  #onSeedChanged?: (seed: number) => void;

  constructor(
    state: typeof defaultState,
    io: ClimbModelIo,
    seed: number,
    options: {
      onHumanCrash?: () => void;
      onSeedChanged?: (seed: number) => void;
      onReset?: () => void;
    } = {},
  ) {
    super(state, io, seed, raceProfile, { onReset: options.onReset });
    this.tower = new Tower(seed);
    this.#onHumanCrash = options.onHumanCrash;
    this.#onSeedChanged = options.onSeedChanged;
  }

  protected override get entities(): Player[] {
    return this.state.players;
  }
  protected override set entities(players: Player[]) {
    this.state.players = players;
  }
  protected override get sortedEntities(): Player[] {
    return this.state.sortedPlayers;
  }
  protected override set sortedEntities(players: Player[]) {
    this.state.sortedPlayers = players;
  }

  /** the human player has no group, and its brain score never trains */
  public override spawnHuman() {
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

  protected override spawnEntity(group: Group, slot: number): Player {
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
            new MixedNetwork(inputCount, outputCount, this.experts, {
              hiddenNodes: config.MIXED_HIDDEN_NODES,
              resetChance: config.MIXED_RESET_CHANCE,
            })
        : undefined,
    );
    player.color = group.isMixed
      ? MIXED_COLOR
      : layerColor(group.layer, config.MAX_NETWORK_LAYERS);
    const source = slotSource(group, slot, this.state.sortedModels, slotPolicy);
    if (source && player.brain) {
      player.brain.mutationIndex = slot;
      player.brain.mutationFactor = slotMutation(
        group,
        slot,
        this.#maxMutation(),
        slotPolicy,
      );
      try {
        player.brain.mutate(source.brain);
      } catch {
        // the saved brain no longer fits the current sensors: this player keeps
        // the constructor's random brain and starts fresh
      }
    } else if (isExplorerSlot(group, slot, slotPolicy) && player.brain) {
      // explorers keep the constructor's random brain: nothing to mutate
      // from, the factor records the full re-roll in the HUD stats
      player.brain.mutationIndex = slot;
      player.brain.mutationFactor = 1;
    }
    return player;
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
    return getClimbBrainDimensions();
  }

  protected override createGroup(core: GroupBase<Player>): Group {
    return { ...core };
  }

  // Climb pools never finish a world: promotion is live, and a held seed is
  // what ends a run, so a respawned pool keeps mutating normally.
  protected override poolFinished(_group: Group): boolean {
    return false;
  }

  #maxMutation() {
    return lerp(
      config.MAX_MUTATION_LVL,
      config.MIN_MUTATION_LVL,
      Math.min(1, this.seed / config.MUTATION_SEED_DECAY),
    );
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
    this.promote(group, player);
    if (group.scores.seed >= config.SEED_TARGET_FLOORS)
      this.markFinished(group);
  }

  #onDeath(player: Player): Group | null {
    this.state.living--;
    let deadGroup: Group | null = null;

    if (player.useAI) {
      const group = this.groupOf(player);
      if (group) {
        const wasDistillRun = group.distillRun;
        if (wasDistillRun) {
          this.keepTrainedBrain(group);
          group.trainFrom = null;
          group.distillRun = false;
          saveTrainFrom('climb', group.isMixed ? 'mixed' : group.layer, null);
        }
        if (!wasDistillRun) this.#settle(group, player);
        if (
          !wasDistillRun &&
          group.pool.every((candidate) => candidate.damaged)
        )
          deadGroup = group;
        // freeze the ghost when the record holder dies
        if (
          !wasDistillRun &&
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
                !best ||
                (candidate.brain?.score ?? 0) > (best.brain?.score ?? 0)
                  ? candidate
                  : best,
              null,
            );
          if (nextBest?.brain) {
            group.scores.seed = nextBest.brain.score;
            group.ghostScore = player.brain?.score ?? 0;
            this.promote(group, nextBest);
          } else {
            group.ghostScore = player.brain?.score ?? 0;
          }
          this.pendingSaves.add(group);
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
    return deadGroup;
  }

  #regenerateTower() {
    // a new tower ends the training run: the selection goes back to free
    // training so the next run measures the student itself
    this.endDistillRuns();
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#climb=${this.seed}`,
    );
    this.#onSeedChanged?.(this.seed);
    this.tower = new Tower(this.seed);
    this.seedChangeAt = 0;
    this.state.tower = this.tower;
    this.finishRegenerate();
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
    this.loadSavedModels();
    this.state.tower = this.tower;
    this.initializeCore();
  }

  /** Advance one simulation frame, leaving rendering and HUD updates outside. */
  public update(now: number) {
    for (const group of this.groups)
      group.teacher =
        group.trainFrom === null ? null : this.teacherBrain(group.trainFrom);
    let highest = 0;
    const deadGroups = new Set<Group>();
    for (const player of this.state.players) {
      const alive = !player.damaged;
      const group = this.groupOf(player);
      player.teacher = group?.teacher ?? null;
      player.distillRun = group?.distillRun ?? false;
      player.update(now);
      if (alive && player.damaged) {
        const deadGroup = this.#onDeath(player);
        if (deadGroup) deadGroups.add(deadGroup);
      }
      if (!player.damaged && player.y > highest) highest = player.y;
    }
    for (const group of deadGroups) this.autoTrainAfterGroupDeath(group);
    this.state.highestY = highest;
    // expired corpses leave the list: AI pools clean up at their respawn,
    // but a human corpse has no group to do that for it
    this.state.players = this.state.players.filter(
      (p) => !p.damaged || now - p.deathTime <= config.DEAD_LIFETIME,
    );
    // stream the tower upward from the highest living climber
    this.tower.ensureAbove(highest + config.AHEAD);

    for (const group of this.groups) this.respawnGroup(group, now);

    // live promotion while the climber is still on the platform
    for (const player of this.state.players) {
      if (player.damaged || !player.useAI) continue;
      const group = this.groupOf(player);
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
    else if (this.seedTimedOut(now)) {
      // no winner within the seed's 10-minute limit: restart from seed 0
      this.flushPendingSaves();
      this.applyUserSeed(0);
    }
    this.flushPendingSaves();
  }
}
