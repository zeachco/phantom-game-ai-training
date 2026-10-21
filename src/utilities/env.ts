/**
 * Environment checks shared by every game.
 */

/** `?demo=true` is the light showcase profile: the hosted demo skips the
 *  model panel entirely and runs a small population. */
export const isDemo =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('demo') === 'true';

/** True on machines where the default population would stutter: few cores
 *  or little memory (Chromium only reports the latter). */
export function likelyLagsOnHeavyJs(): boolean {
  if (typeof window === 'undefined') return true;
  if (isDemo) return true;
  const cores = navigator.hardwareConcurrency ?? 8; // undefined on very old browsers
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8; // Chromium only, GiB, rounded to 0.25..8
  return cores <= 4 || memory <= 4;
}
