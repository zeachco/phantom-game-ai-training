import { expertSlotIds, hydrateExperts, MIXED_LEVELS } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount } from '../../ai/utils';

/** the hall of fame the expert library is built from, and the mixed
 *  champion that must stay consistent with it */
export interface ExpertLibrarySaves {
  sortedModels: ModelsByLayerCount[];
  sortedMixed: ModelsByLayerCount[];
}

/** hydrates the current hall of fame into the expert library just to read
 *  its shape (selector width + stable slot ids) while validating mixed
 *  selector saves at boot, without keeping the networks around */
export function expertLibraryShape(
  saves: ModelsByLayerCount[],
  inputCount: number,
  outputCount: number,
  expertsPerLayer: number,
): { width: number; slotIds: string[] } {
  const experts = hydrateExperts(
    saves,
    inputCount,
    outputCount,
    expertsPerLayer,
  );
  return { width: experts.length, slotIds: expertSlotIds(experts) };
}

/**
 * Rebuilds the expert library from the hall of fame: the strongest saved
 * brain of each layer, in stable order. Empty while the mixed profile is off
 * or the library is thinner than minExperts. On a successful rebuild a mixed
 * champion that no longer matches the library is dropped.
 */
export function refreshExperts(
  saves: ExpertLibrarySaves,
  inputCount: number,
  outputCount: number,
  expertsPerLayer: number,
  minExperts: number,
  mixedEnabled: boolean,
): NeuralNetwork[] {
  if (!mixedEnabled) return [];
  const hydrated = hydrateExperts(
    saves.sortedModels,
    inputCount,
    outputCount,
    expertsPerLayer,
  );
  if (hydrated.length < minExperts) return [];
  invalidateStaleMixed(saves, hydrated);
  return hydrated;
}

/** A mixed champion is only as valid as the expert library it was trained
 *  against. When a regular layer promotes a new champion the library grows
 *  and the saved selector routes to slots that no longer exist: drop the
 *  champion so the group starts fresh instead of failing at every respawn. */
export function invalidateStaleMixed(
  saves: ExpertLibrarySaves,
  experts: NeuralNetwork[],
): void {
  const champion = saves.sortedMixed[MIXED_LEVELS]?.[0];
  if (!champion) return;
  const levels = champion.levels || [];
  const width = levels.length
    ? levels[levels.length - 1].weights?.[0]?.length
    : undefined;
  const savedIds = (champion.expertIds || []).join();
  if (
    width !== experts.length ||
    (savedIds && savedIds !== expertSlotIds(experts).join())
  )
    saves.sortedMixed[MIXED_LEVELS] = [];
}
