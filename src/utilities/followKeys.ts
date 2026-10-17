export interface FollowKeyHandlers {
  /** 1-9: follow the best runner of that brain layer */
  digit: (layer: number) => void;
  /** 0: follow the overall leader (all groups) */
  all: () => void;
  /** ` / ~: follow the mixed brain */
  mixed: () => void;
}

/**
 * The unified follow shortcuts, identical in every game: 1-9 follow a brain
 * group, 0 follows the overall leader, ` (backquote) follows the mixed brain.
 * Returns a cleanup function.
 */
export function bindFollowKeys(handlers: FollowKeyHandlers): () => void {
  const onKey = (ev: KeyboardEvent) => {
    if (ev.repeat || ev.isComposing) return;
    const target = ev.target as HTMLElement | null;
    if (
      target &&
      (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable)
    )
      return;
    if (ev.code === 'Backquote') handlers.mixed();
    else if (ev.code === 'Digit0') handlers.all();
    else if (ev.code.startsWith('Digit')) {
      const digit = Number(ev.code.slice(5));
      if (digit >= 1 && digit <= 9) handlers.digit(digit);
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
