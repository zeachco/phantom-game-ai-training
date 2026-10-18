import { expect, test } from "bun:test";
import { isGame, isSavedModel, isUuid } from "../src/validate.ts";

test("isGame", () => {
  expect(isGame("highway")).toBe(true);
  expect(isGame("circuit")).toBe(true);
  expect(isGame("cave")).toBe(true);
  expect(isGame("climb")).toBe(true);
  expect(isGame("nope")).toBe(false);
  expect(isGame(undefined)).toBe(false);
});

test("isUuid", () => {
  expect(isUuid("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
  expect(isUuid("123E4567-E89B-42D3-A456-426614174000")).toBe(true);
  expect(isUuid("not-a-uuid")).toBe(false);
  expect(isUuid("")).toBe(false);
  expect(isUuid(1234)).toBe(false);
});

function brain(depth = 2, inSize = 4, outSize = 3): any {
  const levels = [];
  let prev = inSize;
  for (let i = 0; i < depth; i++) {
    const next = i === depth - 1 ? outSize : 5;
    levels.push({
      weights: Array.from({ length: prev }, () => Array.from({ length: next }, () => 0.5)),
    });
    prev = next;
  }
  return { version: 0, score: 10, mutationFactor: 0.1, kind: "neural", levels };
}

test("isSavedModel accepts neural brains of any depth", () => {
  expect(isSavedModel(brain())).toBe(true);
  expect(isSavedModel(brain(9))).toBe(true);
});

test("isSavedModel accepts a mixed brain with string slot ids", () => {
  const model = brain();
  model.kind = "mixed";
  model.expertIds = ["1.1", "2.1", "3.1"];
  expect(isSavedModel(model)).toBe(true);
});

test("isSavedModel still tolerates numeric expertIds", () => {
  const model = brain();
  model.kind = "mixed";
  model.expertIds = [0, 1, 2];
  expect(isSavedModel(model)).toBe(true);
});

test("isSavedModel rejects broken shapes", () => {
  expect(isSavedModel(null)).toBe(false);
  expect(isSavedModel("nope")).toBe(false);
  expect(isSavedModel({})).toBe(false);
  expect(isSavedModel({ levels: [] })).toBe(false);

  const ragged = brain();
  ragged.levels[0].weights[0].length = 1;
  expect(isSavedModel(ragged)).toBe(false);

  const unchained = brain();
  unchained.levels[1].weights.length = 2;
  expect(isSavedModel(unchained)).toBe(false);

  const nan = brain();
  nan.levels[0].weights[0][0] = NaN;
  expect(isSavedModel(nan)).toBe(false);

  const mixedNoExperts = brain();
  mixedNoExperts.kind = "mixed";
  expect(isSavedModel(mixedNoExperts)).toBe(false);

  for (const bad of [[""], [null], [{}], ["1.1", ""]]) {
    const mixed = brain();
    mixed.kind = "mixed";
    mixed.expertIds = bad;
    expect(isSavedModel(mixed)).toBe(false);
  }

  const weirdKind = brain();
  weirdKind.kind = "weird";
  expect(isSavedModel(weirdKind)).toBe(false);
});
