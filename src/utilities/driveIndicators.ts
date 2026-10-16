/** Draws the followed car's throttle and steering outputs in one box. */
export function drawControlAxes(
  ctx: CanvasRenderingContext2D,
  left: number,
  right: number,
  throttle: number,
  color: string,
  size = 110,
) {
  const center = size / 2;
  const radius = size * 0.38;
  const steer = Math.max(-1, Math.min(1, right - left));
  const gas = Math.max(-1, Math.min(1, throttle));

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(25, 52, 94, 0.55)';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(center, 8);
  ctx.lineTo(center, size - 8);
  ctx.moveTo(8, center);
  ctx.lineTo(size - 8, center);
  ctx.stroke();

  const x = center + steer * radius;
  const y = center - gas * radius;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(center, center);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Draws velocity relative to the car's heading, so sideways drift is visible. */
export function drawVelocityVector(
  ctx: CanvasRenderingContext2D,
  angle: number,
  vx: number,
  vy: number,
  maxSpeed: number,
  color: string,
  width = 110,
  height = 34,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const forwardX = -Math.sin(angle);
  const forwardY = -Math.cos(angle);
  const lateralX = Math.cos(angle);
  const lateralY = -Math.sin(angle);
  const forward = vx * forwardX + vy * forwardY;
  const lateral = vx * lateralX + vy * lateralY;
  const scale = (Math.min(width, height) * 0.42) / Math.max(1, maxSpeed);
  const endX = centerX + lateral * scale;
  const endY = centerY - forward * scale;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, centerY);
  ctx.lineTo(width - 8, centerY);
  ctx.stroke();
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  const angleOfVector = Math.atan2(endY - centerY, endX - centerX);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - Math.cos(angleOfVector - Math.PI / 6) * 7,
    endY - Math.sin(angleOfVector - Math.PI / 6) * 7,
  );
  ctx.lineTo(
    endX - Math.cos(angleOfVector + Math.PI / 6) * 7,
    endY - Math.sin(angleOfVector + Math.PI / 6) * 7,
  );
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
