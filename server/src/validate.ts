// Payload validation for the phantom-ai-training API.

export const GAMES = ["highway", "circuit", "cave", "climb"] as const;
export type Game = (typeof GAMES)[number];

export function isGame(value: unknown): value is Game {
  return typeof value === "string" && (GAMES as readonly string[]).includes(value);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSlotId(id: unknown): boolean {
  return (typeof id === "string" && id.length > 0) || isFiniteNumber(id);
}

function isWeightMatrix(weights: unknown): boolean {
  if (!Array.isArray(weights) || weights.length === 0) return false;
  let rowLength = -1;
  for (const row of weights) {
    if (!Array.isArray(row) || row.length === 0) return false;
    if (rowLength === -1) rowLength = row.length;
    else if (row.length !== rowLength) return false;
    for (const cell of row) if (!isFiniteNumber(cell)) return false;
  }
  return true;
}

// Shape of one saved brain — same as what the games persist to localStorage
// (see src/ai/Network.ts and compactModel() in src/ai/utils.ts):
// { version, score, mutationFactor, mutationIndex, diff, date, kind,
//   levels: [{ weights: number[][] }], expertIds? }
// Mixed brains carry expertIds: string[] of "layer.rank" slot ids (see
// expertSlotIds() in src/ai/Mixed.ts); finite numbers are tolerated too.
export function isSavedModel(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const model = value as Record<string, unknown>;

  const levels = model.levels;
  if (!Array.isArray(levels) || levels.length === 0) return false;
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i] as Record<string, unknown>;
    if (typeof level !== "object" || level === null || !isWeightMatrix(level.weights)) return false;
    // Consecutive levels must chain: out(i) === in(i+1).
    if (i + 1 < levels.length) {
      const next = levels[i + 1] as Record<string, unknown>;
      const out = (level.weights as unknown[][])[0].length;
      const nextIn = (next.weights as unknown[][]).length;
      if (out !== nextIn) return false;
    }
  }

  const kind = model.kind === undefined ? "neural" : model.kind;
  if (kind !== "neural" && kind !== "mixed") return false;
  if (kind === "mixed") {
    const expertIds = model.expertIds;
    if (
      !Array.isArray(expertIds) ||
      expertIds.length === 0 ||
      expertIds.some((id) => !isSlotId(id))
    ) {
      return false;
    }
  }
  return true;
}
