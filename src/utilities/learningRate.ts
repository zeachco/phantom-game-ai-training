/**
 * The learning step rate of train-from distillation: the share of the
 * decaying teaching rate the student applies on every frame. It used to be
 * the trainer panel's "learn per step" slider, stored per browser; the
 * control and its logic are gone, the rate is fixed in code.
 */
export const LEARNING_STEP_PERCENT = 10;
