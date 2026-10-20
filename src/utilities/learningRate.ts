const STORAGE_KEY = 'learning_step_percent';
export const DEFAULT_LEARNING_STEP_PERCENT = 1;

export function learningStepPercent(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return DEFAULT_LEARNING_STEP_PERCENT;
  const value = Number(stored);
  return Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : DEFAULT_LEARNING_STEP_PERCENT;
}

export function saveLearningStepPercent(value: number): void {
  localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.min(100, value))));
}
