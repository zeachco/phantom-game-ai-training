#!/usr/bin/env bun
/**
 * Backfill `globalScore` on legacy documents in the `models` collection.
 *
 * One-shot migration: sets globalScore from score (falling back to 0) for
 * any document where globalScore does not exist yet, making the new
 * `{ globalScore: -1, score: -1, submittedAt: -1 }` sort total across all docs.
 * Safe to re-run: only touches docs without globalScore.
 *
 * Usage:
 *   bun run migrate:models [--dry-run]
 *
 * Or from the repo root with the connection string in the environment:
 *   MONGO_URL=... bun server/scripts/migrate-models.ts [--dry-run]
 */
import { getDb, MongoNotReadyError } from "../src/db.ts";

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith("--")));
const unknownFlags = [...flags].filter((flag) => flag !== "--dry-run");
if (unknownFlags.length) fail(`unknown flag(s): ${unknownFlags.join(", ")}`);

const dryRun = flags.has("--dry-run");

async function main(): Promise<void> {
  const db = await getDb();
  const collection = db.collection("models");

  if (dryRun) {
    const count = await collection.countDocuments({ globalScore: { $exists: false } });
    console.log(`dry-run: ${count} legacy model docs to backfill`);
  } else {
    const result = await collection.updateMany(
      { globalScore: { $exists: false } },
      [
        {
          $set: {
            globalScore: { $ifNull: ["$score", 0] },
          },
        },
      ],
    );
    console.log(`backfilled globalScore on ${result.modifiedCount} model docs`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    if (err instanceof MongoNotReadyError) {
      fail(
        "MONGO_URL is not configured: run from the server directory (its .env) or pass MONGO_URL",
      );
    }
    fail(err instanceof Error ? err.message : String(err));
  });
