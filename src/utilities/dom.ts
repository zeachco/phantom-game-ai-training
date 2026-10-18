export function createCanvas() {
  const can = document.createElement('canvas');
  document.body.appendChild(can);
  return can;
}

/**
 * The stage overlays the rendered game canvas. The canvas and every HTML HUD
 * element live inside it, so they track the canvas edges instead of the
 * viewport: an open side panel or a letterboxed window no longer leaves HUDs
 * floating over the wrong pixels. See .game-stage in style.css.
 */
export function createStage() {
  const stage = document.createElement('div');
  stage.className = 'game-stage';
  document.body.appendChild(stage);
  return stage;
}

/**
 * Opens or closes the side panel on F12 or L, like its tab button does. F12
 * is swallowed so the browser devtools don't steal the key; repeats and
 * typing into form fields are ignored.
 */
export function bindSidePanelToggle(onToggle: () => void) {
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code !== 'F12' && e.code !== 'KeyL') return;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable)
    )
      return;
    e.preventDefault();
    onToggle();
  };
  window.addEventListener('keydown', onKey);
}

/**
 * The side panel's live frame counter: `tick(now)` is called once per
 * simulation frame and counts them, but the text only repaints once per
 * second, so a steady loop costs a single comparison per frame.
 */
export function createFrameMeter() {
  const el = document.createElement('div');
  el.className = 'side-panel-frames';
  el.title = 'frames the simulation has been running';
  let frames = 0;
  let lastSecond = -1;

  const tick = (now: number) => {
    frames += 1;
    const second = Math.floor(now / 1000);
    if (second === lastSecond) return;
    lastSecond = second;
    el.textContent = `${frames.toLocaleString('en-US')} frames`;
  };

  return { el, tick };
}

/** A collapsible text section for the side panel: a small header line
 *  toggles the body, which starts collapsed and is never persisted. */
export function createCollapsibleSection(body: HTMLElement) {
  const section = document.createElement('div');
  section.className = 'side-panel-section';

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'side-panel-section-toggle';
  header.textContent = '▸ more';
  header.setAttribute('aria-expanded', 'false');

  const wrap = document.createElement('div');
  wrap.className = 'side-panel-section-body';
  wrap.hidden = true;
  wrap.append(body);

  const setOpen = (open: boolean) => {
    wrap.hidden = !open;
    header.textContent = open ? '▾ less' : '▸ more';
    header.setAttribute('aria-expanded', String(open));
  };
  header.onclick = () => setOpen(wrap.hidden);

  section.append(header, wrap);
  return section;
}

/** Returns true only when an update is due, limiting callers to the given FPS. */
export function createUpdateLimiter(fps: number) {
  const interval = 1000 / fps;
  let lastUpdate = -Infinity;

  return (now: number) => {
    if (now - lastUpdate < interval) return false;
    lastUpdate = now;
    return true;
  };
}

/** expensive to call as it redraws all node's links */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.restore();
  return false;
}
