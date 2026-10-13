// Paste into the browser console of any game page (vite dev server or the
// deployed site). It captures the stored models of ALL games from
// localStorage (same origin for every game) and POSTs each game to the
// capture server started with `node scripts/capture-models.mjs`.
//
// localStorage is per-origin, so one page capture covers circuit, cave,
// highway and climb together.
(async () => {
  const SERVER = 'http://127.0.0.1:4545'; // match the port of capture-models.mjs
  const GAMES = ['circuit', 'cave', 'highway', 'climb'];

  // Prefer the game's own export helper (available on the vite dev server,
  // so the capture matches exactly what the games load back). Fall back to
  // scanning localStorage directly (works on the deployed production site).
  let capture;
  try {
    const { fileUtilities } = await import('/src/ai/utils.ts');
    capture = (game) => fileUtilities(game).exportModels();
  } catch {
    capture = (game) => {
      const out = {};
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith(`${game}_`)) continue;
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          if (Array.isArray(data)) out[key] = data;
        } catch {
          console.warn(`Skipping unreadable save ${key}`);
        }
      }
      return out;
    };
  }

  for (const game of GAMES) {
    const models = capture(game);
    const res = await fetch(`${SERVER}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, savedAt: new Date().toISOString(), models }),
    });
    const json = await res.json().catch(() => ({}));
    console[json.ok ? 'info' : 'warn'](`capture ${game}:`, json);
  }
  console.log('done — check saved-models/ on disk');
})();
