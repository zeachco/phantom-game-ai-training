import { MIXED_KIND, MIXED_LEVELS } from '../ai/Mixed';

/**
 * The "delete local saves" flow shared by all games: confirm, discard the
 * saves (dropping the mixed routing too, since it is pinned to the saved
 * experts), then run the per-game reinitialization. It returns true once the
 * discard happened so the group panel can follow up by reloading the group's
 * stored model from the server, and false when the confirm is cancelled.
 * Confirm texts and the reinitialization itself stay at the call site.
 */

interface SaveIo {
  discardModel(layers: number, kind?: string): void;
  discardGameModels(): void;
}

export interface ResetBrainSavesOptions {
  io: SaveIo;
  /** the game name, used in the all-brains confirm text */
  game: string;
  /** the mixed brain's label in the confirm text */
  mixedLabel: string;
  /** a layer brain's label in the confirm text */
  layerLabel: (layer: number) => string;
  /** runs after the confirmed discard; apply the per-game reinitialization */
  onReset: (value: number | 'mixed') => void;
}

export function makeResetBrainSaves({
  io,
  game,
  mixedLabel,
  layerLabel,
  onReset,
}: ResetBrainSavesOptions): (value: number | 'mixed') => boolean {
  return (value: number | 'mixed'): boolean => {
    if (value === 'mixed') {
      if (
        !confirm(
          `Delete the local save of ${mixedLabel} and reload the stored model from the server?`,
        )
      )
        return false;
      io.discardModel(MIXED_LEVELS, MIXED_KIND);
    } else if (value === 0) {
      if (
        !confirm(
          `Delete all the local ${game} saves and reload the stored models from the server?`,
        )
      )
        return false;
      io.discardGameModels();
    } else {
      if (
        !confirm(
          `Delete the local save of ${layerLabel(value)} and reload the stored model from the server?`,
        )
      )
        return false;
      io.discardModel(value);
      // the mixed selector's output width and expert slots are pinned to the
      // saved brains it routes to, so dropping one invalidates its routing
      io.discardModel(MIXED_LEVELS, MIXED_KIND);
    }
    onReset(value);
    return true;
  };
}
