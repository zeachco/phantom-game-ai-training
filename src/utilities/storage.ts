/**
 * Shared localStorage reads. Every save loader needs the same guard: a key
 * may be absent, and a stored value may be hand-edited or truncated, so a
 * read must never throw — it returns the fallback instead.
 */
export function readJson<T>(
  key: string,
  fallback: T,
  storage: Pick<Storage, 'getItem'> = localStorage,
): T {
  const raw = storage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
