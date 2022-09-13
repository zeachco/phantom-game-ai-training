export function isSameObject(
  modelA: object,
  modelB: object,
  ignoreKeys: string[] = [],
) {
  if (!modelA || !modelB) return false;
  const removeProgress = (key, value) =>
    ignoreKeys.includes(key) ? undefined : value;
  return (
    JSON.stringify(modelA, removeProgress) ===
    JSON.stringify(modelB, removeProgress)
  );
}
