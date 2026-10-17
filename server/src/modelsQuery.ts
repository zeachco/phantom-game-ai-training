import type { Document } from 'mongodb';

/** Ranking used everywhere models are read: the cross-track aggregate first,
 *  then the plain score (legacy docs), then recency. */
export const MODEL_RANK_SORT = {
  globalScore: -1,
  score: -1,
  submittedAt: -1,
} as const;

/**
 * Best model per variant. The variant key is game + group, where group
 * encodes the neural architecture (e.g. "circuit_4" = circuit brain with 4
 * hidden layers): the pipeline matches the filter, ranks by MODEL_RANK_SORT,
 * and keeps only the first (best) doc per { game, group }. `limit` caps the
 * number of variants returned.
 */
export function bestModelPerVariantPipeline(
  filter: Record<string, unknown>,
  limit: number,
): Document[] {
  return [
    { $match: filter },
    { $sort: MODEL_RANK_SORT },
    {
      $group: {
        _id: { game: '$game', group: '$group' },
        doc: { $first: '$$ROOT' },
      },
    },
    { $sort: { 'doc.globalScore': -1 } },
    { $limit: limit },
  ];
}
