import { defineRailway, github, preserve, project, service } from "railway/iac";

// Named partial: this file only owns the resources it declares.
// The other services/databases in "zeachco's main infra" are left untouched.
export const partial = "phantom-game-ai-training";

export default defineRailway(() => {
  // Bun API server (server/ subdirectory of the game repo).
  const api = service("phantom-game-ai-training", {
    source: github("zeachco/phantom-game-ai-training", { branch: "main" }),
    rootDirectory: "server",
    start: "bun run start",
    healthcheckPath: "/healthz",
    env: {
      // Filled in later (dashboard or `railway variable set MONGO_URL=...`).
      // The server creates its collections on first use; the DB name comes
      // from the URL path or defaults to "phantom-ai-training".
      MONGO_URL: preserve(),
    },
  });

  return project("zeachco's main infra", {
    resources: [api],
  });
});
