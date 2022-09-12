
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
