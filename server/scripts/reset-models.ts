#!/usr/bin/env bun
/**
 * Reset the server database models of a single game.
 *
 * Use this after a scoring function or a game changes in a way that makes the
 * stored training scores meaningless: the `models` collection holds one doc
 * per submitted brain, and its `score` field is the only reason a fresh
 * visitor starts from it. Deleting the game's models makes every client fall
 * back to its own localStorage saves and train from scratch. Optionally clears
 * the game's `scores` leaderboard too.
 *
 * Usage (run from the server directory so its .env is loaded):
 *
 *   bun run reset:models highway
 *   bun run reset:models cave --scores
 *   bun run reset:models circuit --dry-run
 *
 * Or from the repo root with the connection string in the environment:
 *
 *   MONGO_URL=... bun server/scripts/reset-models.ts climb
 *
 * Flags:
 *   --scores   also delete the game's submitted scores/leaderboard
 *   --dry-run  report how many documents would be deleted, delete nothing
 */
import { getDb, MongoNotReadyError } from '../src/db.ts';
import { GAMES, isGame } from '../src/validate.ts';

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const positional = args.filter((arg) => !arg.startsWith('--'));
const unknownFlags = [...flags].filter(
  (flag) => flag !== '--scores' && flag !== '--dry-run',
);
if (unknownFlags.length) fail(`unknown flag(s): ${unknownFlags.join(', ')}`);

const game = positional[0];
if (!game) {
  fail(`usage: reset:models <${GAMES.join('|')}> [--scores] [--dry-run]`);
}
if (!isGame(game)) {
  fail(`unknown game "${game}", expected one of: ${GAMES.join(', ')}`);
}

const alsoScores = flags.has('--scores');
const dryRun = flags.has('--dry-run');

async function main(): Promise<void> {
  const db = await getDb();
  const models = db.collection('models');
  const scores = db.collection('scores');

  const modelFilter = { game };
  const scoreFilter = { game };

  if (dryRun) {
    const modelCount = await models.countDocuments(modelFilter);
    const scoreCount = alsoScores
      ? await scores.countDocuments(scoreFilter)
      : 0;
    console.log(
      `dry-run: would delete ${modelCount} model(s) of "${game}"` +
        (alsoScores ? ` and ${scoreCount} score(s)` : ''),
    );
    return;
  }

  const modelsResult = await models.deleteMany(modelFilter);
  console.log(`✔ deleted ${modelsResult.deletedCount} model(s) of "${game}"`);

  if (alsoScores) {
    const scoresResult = await scores.deleteMany(scoreFilter);
    console.log(`✔ deleted ${scoresResult.deletedCount} score(s) of "${game}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    if (err instanceof MongoNotReadyError) {
      fail(
        'MONGO_URL is not configured: run from the server directory (its .env) or pass MONGO_URL',
      );
    }
    fail(err instanceof Error ? err.message : String(err));
  });
