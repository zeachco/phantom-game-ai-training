import type { MixedNetwork } from '../../ai/Mixed';
import type { ModelsByLayerCount } from '../../ai/utils';
import { blendColorScale, getColorScale } from '../colors';

/** Shared brain accents used by both cloned driving games. */
export function layerColor(layer: number, maxLayers: number) {
  return getColorScale(layer / maxLayers);
}

const mixedColors = new Map<string, string>();

export function mixedNetworkColor(
  brain: MixedNetwork,
  maxLayers: number,
  fallback: string,
) {
  const shares = brain.selectionShares;
  const layers = brain.expertLayers;
  const key = `${layers.join()}:${shares
    .map((share) => Math.round(share * 20))
    .join()}`;
  let color = mixedColors.get(key);
  if (!color) {
    color = blendColorScale(
      layers.map((layer, index) => ({
        ratio: layer / maxLayers,
        weight: shares[index],
      })),
      fallback,
    );
    if (mixedColors.size > 512) mixedColors.clear();
    mixedColors.set(key, color);
  }
  return color;
}

/** Saved mixed models keep expert ids instead of a live selection vector. */
export function savedMixedNetworkColor(
  model: ModelsByLayerCount[number],
  maxLayers: number,
  fallback: string,
) {
  return blendColorScale(
    (model.expertIds || []).map((slot: string, index: number) => ({
      ratio: parseInt(slot, 10) / maxLayers,
      weight: model.selectionCounts?.[index] || 0,
    })),
    fallback,
  );
}
