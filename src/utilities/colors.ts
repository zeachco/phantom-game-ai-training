
export function getRGBA(value: number) {
  const alpha = Math.abs(value);
  const R = value > 0 ? 0 : 255;
  const G = value > 0 ? 0 : 255;
  const B = value < 0 ? 0 : 255;

  return `rgba(${R}, ${G}, ${B}, ${alpha})`;
}

export function getRandomColor() {
  const hue = 290 + Math.random() * 260;
  return "hsl(" + hue + ", 100%, 60%)";
}

export function getColorScale(
  ratio,
  saturation = 1,
  lightness = 0.5,
  alpha = 1,
) {
  // rounded like the hue: keeps the string stable so callers can compare colors
  // instead of repainting on a float wobble
  const hue = Math.round(ratio * 360);
  const sat = Math.round(saturation * 100);
  const light = Math.round(lightness * 100);
  return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
}

/**
 * Weighted blend of several `getColorScale` ratios.
 *
 * Hues sit on a circle, so averaging the numbers would put a 50/50 of red and
 * violet on green. They are averaged as vectors instead: the result points at
 * the dominant ratio, and the saturation follows how concentrated the weights
 * are, so a clear favorite comes out vivid while an even spread washes out to
 * gray rather than landing on some unrelated hue.
 */
export function blendColorScale(
  entries: { ratio: number; weight: number }[],
  fallback = getColorScale(0, 0),
) {
  let x = 0;
  let y = 0;
  let total = 0;

  entries.forEach(({ ratio, weight }) => {
    if (!(weight > 0)) return;
    const angle = ratio * Math.PI * 2;
    x += Math.cos(angle) * weight;
    y += Math.sin(angle) * weight;
    total += weight;
  });

  if (!total) return fallback;

  const concentration = Math.hypot(x, y) / total;
  const ratio = Math.atan2(y, x) / (Math.PI * 2);
  return getColorScale((ratio + 1) % 1, concentration);
}
