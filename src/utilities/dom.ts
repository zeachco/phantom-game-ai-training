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
