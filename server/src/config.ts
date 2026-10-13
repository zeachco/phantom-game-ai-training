// Environment configuration. Bun auto-loads .env from the server/ directory.

export const PORT = Number(process.env.PORT ?? 3000);

export const MONGO_URL = (process.env.MONGO_URL ?? "").trim();

// The database name is taken from the MONGO_URL path when present,
// otherwise it defaults to the project name. The server creates the
// collections (clients / models / scores) on first use.
export const DB_NAME = (() => {
  if (!MONGO_URL) return "phantom-ai-training";
  try {
    const path = new URL(MONGO_URL).pathname.replace(/^\//, "");
    return path || "phantom-ai-training";
  } catch {
    return "phantom-ai-training";
  }
})();

// Relative tolerance used when a verifier process replays a claimed score.
// The replayed score must reach at least claimed * (1 - VERIFY_TOLERANCE).
export const VERIFY_TOLERANCE = Number(process.env.VERIFY_TOLERANCE ?? 0.05);
