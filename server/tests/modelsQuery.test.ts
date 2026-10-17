import { expect, test } from 'bun:test';
import { bestModelPerVariantPipeline } from '../src/modelsQuery.ts';

test('pipeline keeps only the best doc per { game, group } variant', () => {
  const filter = { game: 'circuit' };
  expect(bestModelPerVariantPipeline(filter, 50)).toEqual([
    { $match: filter },
    { $sort: { globalScore: -1, score: -1, submittedAt: -1 } },
    {
      $group: {
        _id: { game: '$game', group: '$group' },
        doc: { $first: '$$ROOT' },
      },
    },
    { $sort: { 'doc.globalScore': -1 } },
    { $limit: 50 },
  ]);
});

test('an empty filter matches everything (all games, all variants)', () => {
  const pipeline = bestModelPerVariantPipeline({}, 10);
  expect(pipeline[0]).toEqual({ $match: {} });
  expect(pipeline[pipeline.length - 1]).toEqual({ $limit: 10 });
});
