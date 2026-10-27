import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';
import type { GroupBase } from '../groupScores';

/**
 * The explorer/scout slot policy, shared by the circuit, climb and cave
 * races. Each race builds one policy object from its own config: the pool
 * shapes, the ladder constants and a getter for the progress the group has
 * banked on the current seed (laps, floors or gates).
 */
export interface SlotPolicy<
  TGroup extends GroupBase<unknown> = GroupBase<unknown>,
> {
  /** slots in a full pool */
  poolSize: number;
  /** the last slots of a struggling pool are explorers */
  explorerSlots: number;
  /** stop exploring once the group banks this much seed progress */
  explorerLimit: number;
  /** the ladder of mutation factors, slot 1 is the strongest rung */
  mutationLadderCap: number;
  /** the progress the group has banked on the current seed */
  progress: (group: TGroup) => number;
  /** a demo profile is mutations only: no random explorer and no scout
   *  ever replaces one of its slots */
  demo?: boolean;
}

/** the brain a slot mutates from, null = a fresh random brain (explorers,
 *  or a group with no champion yet) */
export interface SlotSource {
  brain: NeuralNetwork;
  score: number;
}

/** the last slots of a pool skip the champion mutation and start from a
 *  blank random brain — but only while the group is still struggling. Once
 *  its cars have banked the explorer limit of seed progress, the line is
 *  proven, a blank brain can no longer beat it, and the slot reverts to a
 *  regular mutation slot */
export function isExplorerSlot<TGroup extends GroupBase<unknown>>(
  group: TGroup,
  slot: number,
  policy: SlotPolicy<TGroup>,
): boolean {
  if (policy.demo) return false;
  if (slot === 0) return false;
  if (policy.progress(group) >= policy.explorerLimit) return false;
  return slot >= policy.poolSize - policy.explorerSlots;
}

/** the second-to-last slot of a full pool re-explores the oldest kept
 *  hall of fame line, so a second family of weights is always being
 *  retrained in case the champion line fails to adapt to the next track */
export function isScoutSlot<TGroup extends GroupBase<unknown>>(
  group: TGroup,
  slot: number,
  policy: SlotPolicy<TGroup>,
): boolean {
  if (policy.demo) return false;
  if (group.isMixed) return false;
  return slot === policy.poolSize - 1 - policy.explorerSlots;
}

/** oldest line of the hall of fame, null while only one is kept */
export function scoutSource<TGroup extends GroupBase<unknown>>(
  group: TGroup,
  saves: ModelsByLayerCount[],
): SlotSource | null {
  const library = saves[group.layer] || [];
  if (library.length < 2) return null;
  const saved = library[library.length - 1] as NeuralNetwork;
  return { brain: saved, score: saved.score || 0 };
}

/** brain a slot mutates from, null = a fresh random brain (explorers,
 *  or a group with no champion yet) */
export function slotSource<TGroup extends GroupBase<unknown>>(
  group: TGroup,
  slot: number,
  saves: ModelsByLayerCount[],
  policy: SlotPolicy<TGroup>,
): SlotSource | null {
  if (!group.best) return null;
  if (isExplorerSlot(group, slot, policy)) return null;
  if (isScoutSlot(group, slot, policy))
    return scoutSource(group, saves) ?? group.best;
  return group.best;
}

/** the mutation strength a slot mutates with: 0 for the champion slot, the
 *  bottom ladder rung for scouts, the slot's own rung otherwise */
export function slotMutation<TGroup extends GroupBase<unknown>>(
  group: TGroup,
  slot: number,
  maxMutation: number,
  policy: SlotPolicy<TGroup>,
): number {
  if (slot === 0) return 0;
  if (isScoutSlot(group, slot, policy))
    // scouts stay close to the old line they re-explore: bottom rung
    return Math.max(Number.MIN_VALUE, maxMutation / policy.mutationLadderCap);
  const divisor = Math.min(slot, policy.mutationLadderCap);
  return Math.max(Number.MIN_VALUE, maxMutation / divisor);
}
