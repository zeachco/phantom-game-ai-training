import { expect, test } from 'bun:test';
import { Controls } from '../src/games/cave/classes/Controls';
import { ControlType } from '../src/games/cave/types';

function inputs(
  run: (
    controls: Controls,
    key: (type: string, repeat?: boolean) => void,
    pad: Gamepad,
  ) => void,
) {
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    'document',
  );
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigator',
  );
  const listeners = new Map<string, (event: KeyboardEvent) => void>();
  const pad = {
    index: 0,
    connected: true,
    id: 'Standard controller',
    mapping: 'standard',
    axes: [0, 0],
    buttons: [{ pressed: false }],
  } as unknown as Gamepad;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      addEventListener: (
        type: string,
        handler: (event: KeyboardEvent) => void,
      ) => listeners.set(type, handler),
      removeEventListener: (type: string) => listeners.delete(type),
    },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { getGamepads: () => [pad] },
  });
  const controls = new Controls(ControlType.HUMAN);
  try {
    run(
      controls,
      (type, repeat = false) =>
        listeners.get(type)?.({
          code: 'Space',
          key: ' ',
          target: null,
          repeat,
          preventDefault() {},
        } as KeyboardEvent),
      pad,
    );
  } finally {
    controls.dispose();
    for (const [key, descriptor] of [
      ['document', originalDocument],
      ['navigator', originalNavigator],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test('Space produces one jump per press and leaves the two AI axes unchanged', () => {
  inputs((controls, key) => {
    key('keydown');
    expect(controls.consumeJump()).toBe(true);
    key('keydown', true);
    expect(controls.consumeJump()).toBe(false);
    key('keyup');
    key('keydown');
    expect(controls.consumeJump()).toBe(true);
    expect(Object.keys(controls)).toEqual(['moveX', 'moveY']);
  });
});

test('the primary gamepad button jumps once until it is released and pressed again', () => {
  inputs((controls, _key, pad) => {
    pad.buttons[0].pressed = true;
    controls.update();
    expect(controls.consumeJump()).toBe(true);
    controls.update();
    expect(controls.consumeJump()).toBe(false);
    pad.buttons[0].pressed = false;
    controls.update();
    pad.buttons[0].pressed = true;
    controls.update();
    expect(controls.consumeJump()).toBe(true);
  });
});
