/**
 * The per-game seed in the URL hash (#game=N), shared by the seed games
 * (circuit, climb, cave).
 */

/** The seed the URL hash asks for, 0 when there is none. */
export function readSeedFromHash(game: string): number {
  const match = location.hash.match(new RegExp(`${game}=(\\d+)`));
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** Pin the seed in the URL hash so a reload resumes the same track. */
export function writeSeedToHash(game: string, seed: number): void {
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}#${game}=${seed}`,
  );
}
