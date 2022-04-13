export function random(max, min = 0, float = false) {
  const value = min + Math.random() * (max - min)
  return float ? value : Math.round(value)
}
