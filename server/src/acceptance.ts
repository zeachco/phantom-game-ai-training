// Acceptance rule for model uploads: a submit only lands when it improves
// on the group's stored best, and circuit submits must be backed by enough
// distinct tracks. Pure function so it is unit-testable without Mongo.
export const MIN_CIRCUIT_TRACKS = 10;

export interface AcceptanceInput {
  game: string;
  /** submitted globalScore, falling back to score (undefined when neither) */
  submittedGlobal: number | undefined;
  trackCount: number | undefined;
  /** best globalScore currently stored for the {game, group}; -Infinity when empty */
  currentBest: number;
}

export type Acceptance =
  | { ok: true; status?: undefined; reason?: undefined }
  | { ok: false; status: 409 | 422; reason: string };

export function decideModelAcceptance(input: AcceptanceInput): Acceptance {
  if (
    input.game === "circuit" &&
    (!Number.isInteger(input.trackCount) || (input.trackCount as number) < MIN_CIRCUIT_TRACKS)
  ) {
    return {
      ok: false,
      status: 422,
      reason: `circuit uploads need trackCount >= ${MIN_CIRCUIT_TRACKS} (distinct tracks backing the globalScore)`,
    };
  }
  if (input.submittedGlobal === undefined) return { ok: true }; // legacy no-score upload; can never rank
  if (input.submittedGlobal <= input.currentBest) {
    return {
      ok: false,
      status: 409,
      reason: "not-better: the group already holds a model with a higher global score",
    };
  }
  return { ok: true };
}
