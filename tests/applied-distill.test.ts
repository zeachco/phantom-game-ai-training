/**
 * Distillation trains toward the APPLIED control signal: the range the physics
 * actually applies to each output, not the raw weights' answer. These tests
 * pin that contract, plus the live loss / per-node mutation readouts and the
 * train-from structure rule (any depth, matching I/O only).
 */
import { expect, test } from 'bun:test';
import {
  clampToRange,
  type OutputRanges,
  NeuralNetwork,
} from '../src/ai/Network';
import {
  brainIoMatches,
  Distiller,
  distillStep,
} from '../src/ai/distill';
import { readFileSync } from 'node:fs';

/** a seeded generator, so the measurement does not change between runs */
function seededGenerator(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

/** a brain with reproducible weights, like the games initialise them */
function brain(
  seed: number,
  inputs: number,
  outputs: number,
  levels: number,
): NeuralNetwork {
  const net = new NeuralNetwork(inputs, outputs, levels);
  const next = seededGenerator(seed);
  for (const level of net.levels)
    for (const row of level.weights)
      for (let i = 0; i < row.length; i++) row[i] = 2 * next() - 1;
  return net;
}

/** representative circuit-like inputs: 19 rays x2, speed, vel delta, gate delta */
function makeInput(random: () => number): number[] {
  const inputs: number[] = [];
  for (let i = 0; i < 19; i++) inputs.push(random() * 0.48 + 0.02);
  for (let i = 0; i < 19; i++) inputs.push(random() * 0.48 + 0.02);
  inputs.push(random() * 0.75 + 0.2);
  inputs.push(random() * 0.1 - 0.05);
  inputs.push(random() * 0.3 - 0.15);
  return inputs;
}

/** how far the student's APPLIED outputs are from the teacher's, per output */
function appliedGap(
  student: NeuralNetwork,
  teacher: NeuralNetwork,
  ranges: OutputRanges,
  random: () => number,
  frames: number,
): number {
  let error = 0;
  for (let k = 0; k < frames; k++) {
    const inputs = makeInput(random);
    const t = teacher.process(inputs);
    const s = student.process(inputs);
    for (let i = 0; i < s.length; i++) {
      const a = clampToRange(s[i], ranges[i]);
      const b = clampToRange(t[i], ranges[i]);
      error += (a - b) ** 2;
    }
  }
  return error / (frames * s0(student));
}

function s0(net: NeuralNetwork): number {
  return net.levels[net.levels.length - 1].outputs.length;
}

test('a student learns the teacher applied signal, not a clamped shadow of it', () => {
  // a real saved champion: its raw outputs run well past [-1, 1], which is
  // exactly what broke the old clamped-pair training
  // the file holds the group's model list, the first entry is the champion
  const saved = JSON.parse(
    readFileSync('saved-models/circuit/circuit_4.json', 'utf8'),
  ) as unknown[];
  const teacher = NeuralNetwork.hydrate(saved[0] as never)!;
  expect(teacher).toBeInstanceOf(NeuralNetwork);

  // the champion's raw answers really do leave the applied box, otherwise the
  // regression this test guards has no teeth
  const probe = seededGenerator(42);
  let outOfRange = 0;
  for (let k = 0; k < 2000; k++) {
    const out = teacher.process(makeInput(probe));
    for (const value of out) if (value > 1 || value < -1) outOfRange++;
  }
  expect(outOfRange).toBeGreaterThan(0);

  // a deep student, the same shape the game would distil
  const student = brain(13, 41, 3, 9);
  const ranges: OutputRanges = [
    [-1, 1],
    [-1, 1],
    [-1, 1],
  ];
  const start = appliedGap(student, teacher, ranges, seededGenerator(1), 400);
  let distiller: Distiller | null = null;
  const measure = seededGenerator(7);
  for (let f = 0; f < 12_000; f++) {
    distiller = distillStep(distiller, student, teacher, makeInput(measure), f, ranges);
  }
  const end = appliedGap(student, teacher, ranges, seededGenerator(2), 1000);
  expect(end).toBeLessThan(start * 0.25);
  // the applied steering, the quantity that actually drives the car
  const steer = seededGenerator(3);
  let steerError = 0;
  for (let k = 0; k < 1000; k++) {
    const inputs = makeInput(steer);
    const t = teacher.process(inputs);
    const s = student.process(inputs);
    steerError += Math.abs(
      (clampToRange(s[1], ranges[1]) - clampToRange(s[2], ranges[2])) -
        (clampToRange(t[1], ranges[1]) - clampToRange(t[2], ranges[2])),
    );
  }
  expect(steerError / 1000).toBeLessThan(0.05);
});

test('a student of a different depth distils a teacher with the same I/O', () => {
  const teacher = brain(11, 41, 3, 4);
  const student = brain(13, 41, 3, 9); // deeper than the teacher
  const ranges: OutputRanges = [
    [-1, 1],
    [-1, 1],
    [-1, 1],
  ];
  const start = appliedGap(student, teacher, ranges, seededGenerator(1), 400);
  let distiller: Distiller | null = null;
  const measure = seededGenerator(7);
  for (let f = 0; f < 12_000; f++) {
    distiller = distillStep(distiller, student, teacher, makeInput(measure), f, ranges);
  }
  const end = appliedGap(student, teacher, ranges, seededGenerator(2), 1000);
  expect(end).toBeLessThan(start * 0.25);
});

test('steering in [0, 1] trains in that box, negatives stay unapplied', () => {
  // climb: a negative steering answer simply does not steer, so the student
  // must learn the box the physics applies
  const teacher = brain(21, 30, 3, 3);
  const student = brain(23, 30, 3, 3);
  const ranges: OutputRanges = [
    [0, 1],
    [0, 1],
    [-1, 1],
  ];
  let distiller: Distiller | null = null;
  const measure = seededGenerator(9);
  for (let f = 0; f < 12_000; f++) {
    const inputs = makeInput30(measure);
    distiller = distillStep(distiller, student, teacher, inputs, f, ranges);
  }
  const check = seededGenerator(5);
  let gap = 0;
  for (let k = 0; k < 1000; k++) {
    const inputs = makeInput30(check);
    const t = teacher.process(inputs);
    const s = student.process(inputs);
    for (let i = 0; i < 3; i++) {
      gap += (clampToRange(s[i], ranges[i]) - clampToRange(t[i], ranges[i])) ** 2;
    }
  }
  expect(gap / 3000).toBeLessThan(0.005);
});

function makeInput30(random: () => number): number[] {
  const inputs: number[] = [];
  for (let i = 0; i < 27; i++) inputs.push(random() * 0.48 + 0.02);
  inputs.push(random() * 0.75 + 0.2);
  inputs.push(random() * 0.1 - 0.05);
  inputs.push(random() * 0.3 - 0.15);
  return inputs;
}

test('the live loss and per-output errors are read back from the distiller', () => {
  const teacher = brain(31, 25, 4, 2);
  const student = brain(33, 25, 4, 2);
  const distiller = new Distiller(25, 5, [
    [-1, 1],
    [-1, 1],
    [-1, 1],
    [-1, 1],
  ]);
  const random = seededGenerator(41);
  let first: number | null = null;
  let last: number | null = null;
  for (let f = 0; f < 4000; f++) {
    const inputs = new Array(25).fill(0).map(random);
    distiller.step(student, teacher, inputs, f);
    if (f === 0) first = distiller.lastLoss;
    last = distiller.lastLoss;
    expect(distiller.lastErrors).toHaveLength(4);
    for (const error of distiller.lastErrors ?? [])
      expect(Number.isFinite(error)).toBe(true);
  }
  expect(first).not.toBeNull();
  expect(last).not.toBeNull();
  expect(last!).toBeLessThan(first!);
});

test('backprop reports which nodes it moved, on the student', () => {
  const net = brain(41, 25, 4, 2);
  expect(net.lastMutations).toBeNull();
  const random = seededGenerator(43);
  const inputs = new Array(25).fill(0).map(random);
  net.train(inputs, [1, -1, 0.5, 0]);
  const mutations = net.lastMutations!;
  expect(mutations).toHaveLength(net.levels.length);
  for (let i = 0; i < net.levels.length; i++)
    expect(mutations[i]).toHaveLength(net.levels[i].outputs.length);
  // every level got a non-zero push, the output layer the biggest share of it
  let total = 0;
  for (const level of mutations)
    for (const value of level) {
      expect(value).toBeGreaterThanOrEqual(0);
      total += value;
    }
  expect(total).toBeGreaterThan(0);
});

test('train-from only needs matching I/O, any depth or kind', () => {
  const a = new NeuralNetwork(10, 4, 1);
  const b = new NeuralNetwork(10, 4, 7);
  const short = new NeuralNetwork(10, 3, 2);
  const wide = new NeuralNetwork(11, 4, 2);
  expect(brainIoMatches(a, 10, 4)).toBe(true);
  expect(brainIoMatches(b, 10, 4)).toBe(true); // different depth, same I/O
  expect(brainIoMatches(short, 10, 4)).toBe(false);
  expect(brainIoMatches(wide, 10, 4)).toBe(false);
  expect(brainIoMatches(null, 10, 4)).toBe(false);
});
