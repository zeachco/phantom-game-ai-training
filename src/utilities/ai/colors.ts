import type { MixedNetwork } from '../../ai/Mixed';
import { CTRL_COLORS, type ModelsByLayerCount } from '../../ai/utils';
import { getColorScale } from '../colors';

/** Shared brain accents used by both cloned driving games. */
export function layerColor(layer: number, maxLayers: number) {
  // layer 0 is the mixed brain, 1-9 the numbered brains: they wear their
  // stable identity color, deeper networks fall back to the hue scale
  return CTRL_COLORS[layer] ?? getColorScale(layer / maxLayers);
}

/** `#rrggbb` to 0-255 channels, anything else mixes as neutral gray */
function hexChannels(color: string): [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex) return [136, 136, 136];
  const n = parseInt(hex[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Weighted mix of brain identity colors in RGB: the result reads as an actual
 * blend of the brains it combines, and an even spread washes out toward gray
 * the same way the old hue-wheel blend did.
 */
export function blendedLayerColor(
  entries: { layer: number; weight: number }[],
  maxLayers: number,
  fallback: string,
) {
  let r = 0;
  let g = 0;
  let b = 0;
  let total = 0;
  entries.forEach(({ layer, weight }) => {
    if (!(weight > 0)) return;
    const [cr, cg, cb] = hexChannels(layerColor(layer, maxLayers));
    r += cr * weight;
    g += cg * weight;
    b += cb * weight;
    total += weight;
  });
  if (!total) return fallback;
  return `rgb(${Math.round(r / total)}, ${Math.round(g / total)}, ${Math.round(b / total)})`;
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
    color = blendedLayerColor(
      layers.map((layer, index) => ({ layer, weight: shares[index] })),
      maxLayers,
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
  return blendedLayerColor(
    (model.expertIds || []).map((slot: string, index: number) => ({
      layer: parseInt(slot, 10),
      weight: model.selectionCounts?.[index] || 0,
    })),
    maxLayers,
    fallback,
  );
}
