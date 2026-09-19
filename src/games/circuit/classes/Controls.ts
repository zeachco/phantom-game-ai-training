import { ControlType } from '../types';

export class Controls {
  /** signed throttle: > 0 gas, < 0 brake / reverse, 0 neutral — floats welcome */
  public throttle: number = 0;
  public left: number = 0;
  public right: number = 0;
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
        this.throttle = 1;
        break;
    }
  }

  /** what a key sets: throttle keys carry their sign, undefined when unbound */
  #keyToOutput(
    key: string,
  ): { field: 'throttle' | 'left' | 'right'; value: number } | undefined {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return { field: 'throttle', value: 1 };
      case 'ArrowDown':
      case 's':
      case 'S':
        return { field: 'throttle', value: -1 };
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return { field: 'left', value: 1 };
      case 'ArrowRight':
      case 'd':
      case 'D':
        return { field: 'right', value: 1 };
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
      this[map.field] = map.value;
    };
    const up = (e: KeyboardEvent) => {
      const map = this.#keyToOutput(e.key);
      if (map === undefined) return;
      if (map.field === 'throttle') {
        // releasing a key only clears the direction that key drives
        if (this.throttle * map.value > 0) this.throttle = 0;
      } else {
        this[map.field] = 0;
      }
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
