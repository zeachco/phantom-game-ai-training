import { ControlType } from '../types';

export class Controls {
  public forward: number = 0;
  public left: number = 0;
  public right: number = 0;
  public reverse: number = 0;
  /** the bound handlers, kept so dispose() can remove them again */
  private keydown: ((e: KeyboardEvent) => void) | undefined;
  private keyup: ((e: KeyboardEvent) => void) | undefined;

  constructor(type: ControlType) {
    switch (type) {
      case ControlType.KEYS:
      case ControlType.HUMAN:
        this.#addKeyboardListeners();
        break;
      case ControlType.DUMMY:
        this.forward = 1;
        break;
    }
  }

  /** the output a key maps to, undefined for every unbound key */
  #keyToOutput(key: string): 'forward' | 'left' | 'right' | 'reverse' | undefined {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return 'forward';
      case 'ArrowDown':
      case 's':
      case 'S':
        return 'reverse';
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return 'left';
      case 'ArrowRight':
      case 'd':
      case 'D':
        return 'right';
    }
  }

  /** arrows or WASD drive the car, exactly those keys are captured */
  #addKeyboardListeners() {
    const down = (e: KeyboardEvent) => {
      // typing in a form field never drives the car
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement ||
          t instanceof HTMLSelectElement ||
          t.isContentEditable)
      )
        return;
      const output = this.#keyToOutput(e.key);
      if (output === undefined) return;
      e.preventDefault();
      this[output] = 1;
    };
    const up = (e: KeyboardEvent) => {
      const output = this.#keyToOutput(e.key);
      if (output === undefined) return;
      this[output] = 0;
    };
    this.keydown = down;
    this.keyup = up;
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
  }

  public dispose() {
    if (this.keydown) document.removeEventListener('keydown', this.keydown);
    if (this.keyup) document.removeEventListener('keyup', this.keyup);
    this.keydown = undefined;
    this.keyup = undefined;
  }
}
