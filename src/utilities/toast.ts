/**
 * Transient notifications pinned to the bottom of the page: full width on
 * mobile, a centered snackbar on desktop. Used for events that happen while
 * the player is watching the game, like a model upload to the server. Safe to
 * call in a non-DOM environment (tests): it no-ops without a document.
 */
export interface ToastOptions {
  /** `info` (default), `success` or `error`, drives the accent color */
  tone?: 'info' | 'success' | 'error';
  /** how long the toast stays on screen, in ms */
  duration?: number;
}

const DEFAULT_DURATION = 4000;
const EXIT_MS = 220;

let stack: HTMLDivElement | undefined;

function ensureStack(): HTMLDivElement {
  if (stack?.isConnected) return stack;
  stack = document.createElement('div');
  stack.className = 'toast-stack';
  document.body.appendChild(stack);
  return stack;
}

export function showToast(message: string, options: ToastOptions = {}): void {
  if (typeof document === 'undefined') return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.dataset.tone = options.tone ?? 'info';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;

  const remove = () => {
    if (!el.isConnected) return;
    el.classList.remove('visible');
    setTimeout(() => el.remove(), EXIT_MS);
  };

  const timer = setTimeout(remove, options.duration ?? DEFAULT_DURATION);
  el.addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });

  ensureStack().appendChild(el);
  // Next frame so the entrance transition has a from-state to animate.
  requestAnimationFrame(() => el.classList.add('visible'));
}
