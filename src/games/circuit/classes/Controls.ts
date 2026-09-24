import { ControlType } from '../types';

export class Controls {
  /** signed throttle: > 0 gas, < 0 brake / reverse, 0 neutral — floats welcome */
  public throttle: number = 0;
  public left: number = 0;
  public right: number = 0;
  /** the bound handlers, kept so dispose() can remove them again — real
   *  privates so Object.keys(controls) counts only the drive outputs */
  #keydown: ((e: KeyboardEvent) => void) | undefined;
  #keyup: ((e: KeyboardEvent) => void) | undefined;

  constructor(type: ControlType) {
    switch (type) {
      case ControlType.KEYS:
      case ControlType.HUMAN:
        this.#addKeyboardListeners();
        break;
      case ControlType.DUMMY:
        this.throttle = 1;
        break;
    }
  }

  /** held throttle directions: releasing one key must not clear the other */
  #gasHeld = false;
  #reverseHeld = false;

  #syncThrottle() {
    this.throttle = this.#gasHeld ? 1 : this.#reverseHeld ? -1 : 0;
  }

  /** what a key sets: throttle keys carry their sign, undefined when unbound */
  #keyToOutput(
    key: string,
  ): 'throttle+' | 'throttle-' | 'left' | 'right' | undefined {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return 'throttle+';
      case 'ArrowDown':
      case 's':
      case 'S':
        return 'throttle-';
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
      const map = this.#keyToOutput(e.key);
      if (map === undefined) return;
      e.preventDefault();
      if (map === 'throttle+') this.#gasHeld = true;
      else if (map === 'throttle-') this.#reverseHeld = true;
      else this[map] = 1;
      if (map === 'throttle+' || map === 'throttle-') this.#syncThrottle();
    };
    const up = (e: KeyboardEvent) => {
      const map = this.#keyToOutput(e.key);
      if (map === undefined) return;
      if (map === 'throttle+') this.#gasHeld = false;
      else if (map === 'throttle-') this.#reverseHeld = false;
      else this[map] = 0;
      if (map === 'throttle+' || map === 'throttle-') this.#syncThrottle();
    };
    this.#keydown = down;
    this.#keyup = up;
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
  }

  public dispose() {
    if (this.#keydown) document.removeEventListener('keydown', this.#keydown);
    if (this.#keyup) document.removeEventListener('keyup', this.#keyup);
    this.#keydown = undefined;
    this.#keyup = undefined;
  }
}
