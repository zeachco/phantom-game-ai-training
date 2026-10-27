export function getRandomColor() {
  const hue = 290 + Math.random() * 260;
  return `hsl(${hue}, 100%, 60%)`;
}

export function getColorScale(
  ratio = 0,
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
 * Black or white, whichever keeps the higher contrast on the given background.
 * The crossover sits at ~0.18 relative luminance: brighter than that, black
 * text wins. Understands the `#rrggbb` and `hsl(a)` forms this codebase makes.
 */
export function contrastText(color: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return 0.2126 * lin(((n >> 16) & 255) / 255) +
      0.7152 * lin(((n >> 8) & 255) / 255) +
      0.0722 * lin((n & 255) / 255) >
      0.18
      ? '#000'
      : '#fff';
  }
  const hsl = /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i.exec(color);
  if (hsl) {
    const [r, g, b] = hslToRgb(+hsl[1], +hsl[2] / 100, +hsl[3] / 100);
    return luminance(r, g, b) > 0.18 ? '#000' : '#fff';
  }
  return '#000';
}

/** srgb channel to linear, the way relative luminance weighs the channels */
const lin = (v: number) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

const luminance = (r: number, g: number, b: number) =>
  0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);

const hslToRgb = (h: number, s: number, l: number): number[] => {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a =
      l + s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(a * 255);
  };
  return [f(0), f(8), f(4)];
};
