import { expect, test } from "bun:test";
import { decideModelAcceptance, MIN_CIRCUIT_TRACKS } from "../src/acceptance.ts";

test("decideModelAcceptance accepts when submittedGlobal > currentBest", () => {
  const result = decideModelAcceptance({
    game: "cave",
    submittedGlobal: 15000,
    trackCount: undefined,
    currentBest: 8000,
  });
  expect(result).toEqual({ ok: true });
});

test("decideModelAcceptance rejects 409 when equal and when lower", () => {
  const equal = decideModelAcceptance({
    game: "cave",
    submittedGlobal: 8000,
    trackCount: undefined,
    currentBest: 8000,
  });
  expect(equal).toEqual({
    ok: false,
    status: 409,
    reason: "not-better: the group already holds a model with a higher global score",
  });

  const lower = decideModelAcceptance({
    game: "cave",
    submittedGlobal: 5000,
    trackCount: undefined,
    currentBest: 8000,
  });
  expect(lower).toEqual({
    ok: false,
    status: 409,
    reason: "not-better: the group already holds a model with a higher global score",
  });
});

test("decideModelAcceptance accepts when currentBest is -Infinity (empty group)", () => {
  const result = decideModelAcceptance({
    game: "cave",
    submittedGlobal: 100,
    trackCount: undefined,
    currentBest: Number.NEGATIVE_INFINITY,
  });
  expect(result).toEqual({ ok: true });
});

test("decideModelAcceptance accepts a legacy no-score submit (submittedGlobal undefined) even vs a high currentBest", () => {
  const result = decideModelAcceptance({
    game: "cave",
    submittedGlobal: undefined,
    trackCount: undefined,
    currentBest: 99999,
  });
  expect(result).toEqual({ ok: true });
});

test("decideModelAcceptance circuit trackCount rules", () => {
  // trackCount 9 -> 422
  expect(
    decideModelAcceptance({
      game: "circuit",
      submittedGlobal: 15000,
      trackCount: 9,
      currentBest: 8000,
    }),
  ).toEqual({
    ok: false,
    status: 422,
    reason: `circuit uploads need trackCount >= ${MIN_CIRCUIT_TRACKS} (distinct tracks backing the globalScore)`,
  });

  // trackCount 10 -> ok (with beating score)
  expect(
    decideModelAcceptance({
      game: "circuit",
      submittedGlobal: 15000,
      trackCount: 10,
      currentBest: 8000,
    }),
  ).toEqual({ ok: true });

  // trackCount 10.5 -> 422 (non-integer)
  expect(
    decideModelAcceptance({
      game: "circuit",
      submittedGlobal: 15000,
      trackCount: 10.5,
      currentBest: 8000,
    }),
  ).toEqual({
    ok: false,
    status: 422,
    reason: `circuit uploads need trackCount >= ${MIN_CIRCUIT_TRACKS} (distinct tracks backing the globalScore)`,
  });

  // trackCount undefined -> 422
  expect(
    decideModelAcceptance({
      game: "circuit",
      submittedGlobal: 15000,
      trackCount: undefined,
      currentBest: 8000,
    }),
  ).toEqual({
    ok: false,
    status: 422,
    reason: `circuit uploads need trackCount >= ${MIN_CIRCUIT_TRACKS} (distinct tracks backing the globalScore)`,
  });

  // 422 must win when BOTH apply (trackCount 5 AND lower score)
  expect(
    decideModelAcceptance({
      game: "circuit",
      submittedGlobal: 5000,
      trackCount: 5,
      currentBest: 8000,
    }),
  ).toEqual({
    ok: false,
    status: 422,
    reason: `circuit uploads need trackCount >= ${MIN_CIRCUIT_TRACKS} (distinct tracks backing the globalScore)`,
  });
});

test("decideModelAcceptance non-circuit game with trackCount undefined is ok when beating", () => {
  expect(
    decideModelAcceptance({
      game: "cave",
      submittedGlobal: 12000,
      trackCount: undefined,
      currentBest: 8000,
    }),
  ).toEqual({ ok: true });
});
