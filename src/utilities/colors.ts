
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
  const hue = Math.round(ratio * 360);
  return `hsla(${hue}, ${saturation * 100}%, ${lightness * 100}%, ${alpha})`;
}
