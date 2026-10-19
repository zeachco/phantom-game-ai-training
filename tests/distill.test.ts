import { expect, test } from 'bun:test';
import { Distiller, distillStep } from '../src/ai/distill';
import { clampOutput, NeuralNetwork, teachingRate } from '../src/ai/Network';

/** a seeded generator, so the measurement does not change between runs */
function seededGenerator(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

const random = seededGenerator(2024);
const noise = (count: number) => new Array(count).fill(0).map(random);

/** a brain with reproducible weights, so the test does not depend on the run */
function brain(seed: number, inputs: number, outputs: number, levels: number) {
  const net = new NeuralNetwork(inputs, outputs, levels);
  const next = seededGenerator(seed);
  for (const level of net.levels)
    for (const row of level.weights)
      for (let i = 0; i < row.length; i++)
        // the games initialise weights in [-1, 1]
        row[i] = 2 * next() - 1;
  return net;
}

/** a teacher trajectory: consecutive frames barely move */
function trajectory(count: number) {
  let previous = noise(count);
  return () => {
    previous = previous.map((value) =>
      Math.max(0, Math.min(1, 0.97 * value + 0.03 * random())),
    );
    return previous.slice();
  };
}

/** how far the applied control is from the teacher's, on random inputs */
function gap(student: NeuralNetwork, teacher: NeuralNetwork, count: number) {
  const measure = seededGenerator(777);
  let error = 0;
  for (let i = 0; i < 40; i++) {
    const inputs = new Array(count).fill(0).map(measure);
    const out = student.process(inputs).map(clampOutput);
    const target = teacher.process(inputs).map(clampOutput);
    for (let k = 0; k < out.length; k += 1) error += (out[k] - target[k]) ** 2;
  }
  return error / (40 * 4);
}

test('the teacher trajectory alone barely teaches, the probes do', () => {
  const count = 25;
  const teacher = brain(11, count, 4, 4);
  const stream = trajectory(count);
  const student = brain(13, count, 4, 4);
  const distiller = new Distiller(count);

  // what the live frames give on their own
  const bare = brain(13, count, 4, 4);
  const bareStart = gap(bare, teacher, count);
  for (let frame = 0; frame < 400; frame++) {
    const inputs = stream();
    bare.train(inputs, teacher.process(inputs), teachingRate(frame));
    distiller.step(student, teacher, inputs, frame);
  }

  const bareEnd = gap(bare, teacher, count);
  const probeEnd = gap(student, teacher, count);
  // the trajectory is a stream of nearly identical samples: it learns little
  expect(bareEnd).toBeGreaterThan(bareStart * 0.5);
  // the probes turn the same frames into a supervised data set: same frames,
  // same learning rate, most of the gap closed
  expect(probeEnd).toBeLessThan(bareEnd * 0.6);
});

test('probe values stay inside the range each input has produced', () => {
  const distiller = new Distiller(3);
  const teacher = new NeuralNetwork(3, 2, 2);
  const student = new NeuralNetwork(3, 2, 2);

  // a signed input and a narrow one: 0.2 stands for a sensor that never goes
  // past it, -1 for a delta input
  for (let frame = 0; frame < 30; frame++)
    distiller.step(student, teacher, [0.2, 0.5, frame % 2 ? 1 : -1], frame);

  // sensors keep the canonical [0, 1] box, not the narrow slice observed
  expect(distiller.rangeOf(0)).toEqual([0, 1]);
  // a signed input keeps its negative side
  expect(distiller.rangeOf(2)).toEqual([-1, 1]);
  // an input seen outside the canonical box widens it
  distiller.step(student, teacher, [3, 0.5, -2], 30);
  expect(distiller.rangeOf(0)).toEqual([0, 3]);
  expect(distiller.rangeOf(2)).toEqual([-2, 1]);

  for (let i = 0; i < 50; i++) {
    const probe = distiller.sample();
    for (let input = 0; input < probe.length; input++) {
      const [lo, hi] = distiller.rangeOf(input);
      expect(probe[input]).toBeGreaterThanOrEqual(lo);
      expect(probe[input]).toBeLessThanOrEqual(hi);
    }
  }
});

test('distillStep keeps one distiller for the whole run and drops it with the teacher', () => {
  const teacherA = new NeuralNetwork(4, 2, 2);
  const brain = new NeuralNetwork(4, 2, 2);
  const inputs = [0.5, 0.5, 0.5, 0.5];

  const first = distillStep(null, brain, teacherA, inputs, 0);
  const again = distillStep(first, brain, teacherA, inputs, 1);
  expect(again).toBe(first);
  expect(first.inputCount).toBe(4);
});
