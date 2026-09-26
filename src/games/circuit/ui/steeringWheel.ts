/** Paints the focused car's steering wheel indicator. */
export function drawSteeringWheel(
  ctx: CanvasRenderingContext2D,
  angle: number,
  size = 110,
) {
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2, size / 2);
  // Negative so a positive (left) steer turns the wheel counter-clockwise.
  ctx.rotate(-angle);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  for (let spoke = 0; spoke < 3; spoke++) {
    // +PI/2 puts one spoke down and two up, symmetric about the notch.
    const spokeAngle = (spoke / 3) * Math.PI * 2 + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(spokeAngle) * 44, Math.sin(spokeAngle) * 44);
    ctx.stroke();
  }
  // The marker notch makes the rotation readable.
  ctx.fillStyle = 'rgba(255, 220, 0, 0.9)';
  ctx.beginPath();
  ctx.arc(0, -40, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
