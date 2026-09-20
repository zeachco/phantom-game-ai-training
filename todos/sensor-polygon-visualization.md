# TODO: Sensor polygon visualization

Replace the visible sensor rays with a filled, light-blue polygon representing
the sensor coverage area.

## Requirements

- Keep the existing ray-casting logic unchanged: ray count, angles, lengths,
  collision tests, readings, and neural-network inputs must remain identical.
- Use the existing ray geometry only as the polygon boundary: build the shape
  from the car's sensor origin and the ray endpoints in their current fan order.
- Render the polygon as a translucent light-blue fill, with an optional subtle
  matching outline so the covered area remains visible over the road.
- Stop drawing the individual sensor rays in the normal sensor visualization.
- Preserve current visibility rules: only the car that currently displays its
  sensors should display the polygon.
- The polygon must update every frame with the current car position, angle, and
  ray endpoints, including shortened rays caused by detected obstacles.
- This is a visual-only change; do not change sensor data, gameplay behavior,
  saved models, or sensor configuration.
