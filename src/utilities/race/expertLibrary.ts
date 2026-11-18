import { expertSlotIds, hydrateExperts, MIXED_LEVELS } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import type { ModelsByLayerCount, SavedModel } from '../../ai/utils';

/** the hall of fame the expert library is built from, and the mixed
 *  champion that must stay consistent with it */
interface ExpertLibrarySaves {
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
function invalidateStaleMixed(
  saves: ExpertLibrarySaves,
  experts: NeuralNetwork[],
): void {
  const champion = saves.sortedMixed[MIXED_LEVELS]?.[0];
  if (!champion) return;
  const width = finalLayerWidth(champion.levels);
  const savedIds = (champion.expertIds || []).join();
  if (
    width !== experts.length ||
    (savedIds && savedIds !== expertSlotIds(experts).join())
  )
    saves.sortedMixed[MIXED_LEVELS] = [];
}

/**
 * The width of the last layer of a saved brain: how many inputs its final
 * weight row reads. why the dig: a mixed champion's last layer is the
 * selector, so this width is the expert count it was trained against — the
 * number the stale check compares to the live library. Undefined when the
 * save has no levels or a level with no weights (a legacy or corrupt save).
 */
function finalLayerWidth(
  levels: SavedModel['levels'] | undefined,
): number | undefined {
  const last = levels?.[levels.length - 1];
  return last?.weights?.[0]?.length;
}
