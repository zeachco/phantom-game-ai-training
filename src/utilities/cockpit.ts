/**
 * The in-stage cockpit HUD, shared by all four games: a bottom overlay
 * holding the 110×110 gamepad canvas, an optional budget gauge, the readout
 * rows the game fills in, and the followed brain's stats block.
 *
 * The game attaches cockpit.el to its stage, appends its own readout rows to
 * cockpit.readout (speedo last), places cockpit.stats where its layout wants,
 * draws the gamepad on cockpit.ctx, and drives visibility with cockpit.show.
 */

/** a progress bar with the raw value exposed through aria */
export interface CockpitGauge {
  el: HTMLElement;
  /** repaint the fill from a 0..1 fraction, exposing the raw remaining value */
  set(fraction: number, remaining: number): void;
}

/** the speed readout (value + 'u/f' unit) */
export interface CockpitSpeedo {
  el: HTMLElement;
  set(speed: number): void;
}

/** one timing row: label, value and a delta against the reference */
export interface TimingLine {
  el: HTMLElement;
  label: HTMLSpanElement;
  value: HTMLSpanElement;
  delta: HTMLSpanElement;
}

export interface CockpitOptions {
  /** budget gauge between the gamepad and the readout; omit if the game has none */
  gauge?: { title: string; ariaLabel: string; max: number };
  /** the stats block tooltip, default 'followed brain stats' */
  statsTitle?: string;
  /** the overlay starts hidden until show() paints a color, default true */
  startHidden?: boolean;
}

export interface Cockpit {
  /** the steer-overlay; attach it to the stage */
  el: HTMLElement;
  /** the gamepad canvas context, draw with drawGamepadControls */
  ctx: CanvasRenderingContext2D;
  /** the readout container; the game appends its own rows */
  readout: HTMLElement;
  /** the brain stats block; unattached, the game places it */
  stats: HTMLElement;
  /** repaint the stats lines; the DOM is touched only when the text changes */
  setStats(lines: string[]): void;
  gauge?: CockpitGauge;
  /** a timing row for the readout (not attached, the game appends it) */
  timingLine(label: string, title: string): TimingLine;
  /** tint the overlay for the followed entity; null hides it, an empty
   *  color falls back to the neutral tint */
  show(color: string | null): void;
}

export function createCockpit(options: CockpitOptions = {}): Cockpit {
  const {
    gauge,
    statsTitle = 'followed brain stats',
    startHidden = true,
  } = options;

  const el = document.createElement('div');
  el.className = startHidden ? 'steer-overlay hidden' : 'steer-overlay';

  const controlIndicators = document.createElement('div');
  controlIndicators.className = 'control-indicators';
  const controlCanvas = document.createElement('canvas');
  controlCanvas.className = 'control-axis';
  controlCanvas.width = 110;
  controlCanvas.height = 110;
  const ctx = controlCanvas.getContext('2d')!;
  controlIndicators.append(controlCanvas);

  let gaugeEl: HTMLElement | undefined;
  let gaugeFill: HTMLDivElement | undefined;
  if (gauge) {
    gaugeEl = document.createElement('div');
    gaugeEl.className = 'gate-gauge';
    gaugeEl.title = gauge.title;
    gaugeEl.setAttribute('role', 'progressbar');
    gaugeEl.setAttribute('aria-label', gauge.ariaLabel);
    gaugeEl.setAttribute('aria-valuemin', '0');
    gaugeEl.setAttribute('aria-valuemax', String(gauge.max));
    gaugeFill = document.createElement('div');
    gaugeFill.className = 'gate-gauge-fill';
    gaugeEl.append(gaugeFill);
  }

  const readout = document.createElement('div');
  readout.className = 'readout';

  const stats = document.createElement('div');
  stats.className = 'brain-stats';
  stats.title = statsTitle;

  el.append(controlIndicators);
  if (gaugeEl) el.append(gaugeEl);
  el.append(readout);

  let lastStatsHtml = '';

  return {
    el,
    ctx,
    readout,
    stats,
    setStats(lines: string[]) {
      const html = lines.map((line) => `<span>${line}</span>`).join('');
      if (html !== lastStatsHtml) {
        lastStatsHtml = html;
        stats.innerHTML = html;
      }
    },
    gauge:
      gaugeEl && gaugeFill
        ? {
            el: gaugeEl,
            set(fraction: number, remaining: number) {
              const clamped = Math.max(0, Math.min(1, fraction));
              gaugeFill.style.height = `${clamped * 100}%`;
              gaugeEl.setAttribute('aria-valuenow', String(remaining));
            },
          }
        : undefined,
    timingLine: (label, title) => createTimingLine(label, title),
    show(color: string | null) {
      el.style.setProperty('--hud-color', color || '#c4c4c4');
      el.classList.toggle('hidden', color === null);
    },
  };
}

/** the speed readout: a value and its 'u/f' unit, filled by set() */
export function createSpeedo(): CockpitSpeedo {
  const el = document.createElement('div');
  el.className = 'speedo';
  el.title = 'speed';
  const value = document.createElement('span');
  value.className = 'speedo-value';
  value.textContent = '0.0';
  const unit = document.createElement('span');
  unit.className = 'speedo-unit';
  unit.textContent = 'u/f';
  el.append(value, unit);
  return {
    el,
    set(speed: number) {
      value.textContent = speed.toFixed(1);
    },
  };
}

/** one timing row: label / value / delta, values filled by updateTimingLine */
export function createTimingLine(label: string, title: string): TimingLine {
  const el = document.createElement('div');
  el.className = 'timing-line';
  el.title = title;
  const labelEl = document.createElement('span');
  labelEl.className = 'timing-label';
  labelEl.textContent = label;
  const value = document.createElement('span');
  value.className = 'timing-value';
  value.textContent = '—';
  const delta = document.createElement('span');
  delta.className = 'timing-delta';
  el.append(labelEl, value, delta);
  return { el, label: labelEl, value, delta };
}

/** fill a timing row; nulls clear the value ('—') or the delta ('') */
export function updateTimingLine(
  line: TimingLine,
  frames: number | null,
  delta: number | null,
): void {
  line.value.textContent =
    frames === null ? '—' : String(Math.max(0, Math.round(frames)));
  line.delta.textContent =
    delta === null ? '' : `(${delta > 0 ? '+' : ''}${Math.round(delta)})`;
  line.delta.style.color =
    delta === null
      ? ''
      : delta < 0
      ? '#70e08a'
      : delta > 0
      ? '#ff7070'
      : 'rgba(255, 255, 255, 0.55)';
}
