export function createCanvas() {
  const can = document.createElement('canvas');
  document.body.appendChild(can);
  return can;
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
