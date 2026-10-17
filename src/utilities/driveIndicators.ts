/** One action button sample history, 0/1 per rendered frame, newest last. */
export type ActionHistory = number[];

export interface GamepadControls {
  /** -1..1, steer or move X (the joystick axis) */
  x: number;
  /** -1..1, drive or move Y */
  y: number;
  color: string;
  /** true while the action (jump) is held this frame */
  action?: boolean;
  /** label drawn on the action button while it is idle */
  actionLabel?: string;
  /** per-frame action history, drawn inside the button while it is lit */
  actionHistory?: ActionHistory;
}

/**
 * The one outputs canvas every game draws: a single joystick axis (steer ×
 * drive) on a crosshair pad and a single action button beneath it. Jump
 * games light the button with their press history, pure drive games keep it
 * dark; the canvas geometry is identical everywhere.
 */
export function drawGamepadControls(
  ctx: CanvasRenderingContext2D,
  { x, y, color, action = false, actionLabel, actionHistory }: GamepadControls,
  size = 110,
) {
  const cx = size / 2;
  const cy = 42;
  const radius = 32;
  const bx = 10;
  const by = 84;
  const bw = size - 20;
  const bh = 20;

  const clamped = (value: number) => Math.max(-1, Math.min(1, value));

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(25, 52, 94, 0.55)';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  // the joystick pad: a crosshair circle the stick sweeps across
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius + 6);
  ctx.lineTo(cx, cy + radius - 6);
  ctx.moveTo(cx - radius + 6, cy);
  ctx.lineTo(cx + radius - 6, cy);
  ctx.stroke();

  const ex = cx + clamped(x) * (radius - 4);
  const ey = cy - clamped(y) * (radius - 4);
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(ex, ey, 6, 0, Math.PI * 2);
  ctx.fill();

  // the single action button: a pill under the pad
  const roundRect = (
    x0: number,
    y0: number,
    w: number,
    h: number,
    r: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x0 + r, y0);
    ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
    ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    ctx.arcTo(x0, y0 + h, x0, y0, r);
    ctx.arcTo(x0, y0, x0 + w, y0, r);
    ctx.closePath();
  };
  const history = actionHistory;
  if (action && history && history.length > 1) {
    // lit: the recent press history fills the button, like the old
    // jump timeline strip
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 4, by + bh - 5.5);
    ctx.lineTo(bx + bw - 4, by + bh - 5.5);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.9;
    const capacity = bw - 10;
    const start = bx + 5 + Math.max(0, capacity - history.length);
    for (let i = 0; i < history.length; i++) {
      if (!history[i]) continue;
      ctx.fillRect(start + i, by + 3, 1, bh - 9);
    }
  } else if (action) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.5;
  roundRect(bx, by, bw, bh, bh / 2);
  ctx.stroke();
  if (actionLabel) {
    const busy = action && history && history.length > 1;
    if (!busy) {
      ctx.globalAlpha = action ? 0.25 : 0.5;
      ctx.fillStyle = action ? '#000' : color;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(actionLabel, cx, by + bh / 2 + 0.5);
    }
  }
  ctx.globalAlpha = 1;
}
