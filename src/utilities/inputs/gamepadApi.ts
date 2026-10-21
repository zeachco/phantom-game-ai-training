/**
 * Standard-mapping gamepad discovery, shared by every game's Controls.
 * Kept separate from the Gamepad keymap abstraction in ./Gamepad.
 */

/** Read the browser's standard gamepad mapping. DualShock controllers are
 * exposed as "Wireless Controller" in most browsers. The standard mapping
 * keeps this working when the browser does not include that name in id.
 * `preferredIndex` sticks to the pad found last frame. */
export function findStandardGamepad(
  preferredIndex?: number,
): { pad: Gamepad; index: number } | undefined {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

  const pads = Array.from(navigator.getGamepads()).filter(
    (pad): pad is Gamepad => !!pad && pad.connected,
  );
  const current = pads.find((pad) => pad.index === preferredIndex);
  if (current) return { pad: current, index: current.index };

  const dualshock = pads.find((pad) =>
    /dualshock|playstation|wireless controller|sony/i.test(pad.id),
  );
  const standard = pads.find((pad) => pad.mapping === 'standard');
  const selected = dualshock || standard;
  if (!selected) return;
  return { pad: selected, index: selected.index };
}
