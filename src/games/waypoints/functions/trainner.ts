import { Mob } from '../classes/Mob';

// 1. cur wp dx
// 2. cur wp dy
// 3. next wp dx
// 4. next wp dy
// 5. cur vx
// 6. cur vy
// 7. cur va
// 8. cur a
export function getInputs(
  unit: Mob,
): [number, number, number, number, number, number, number, number] {
  const { x, y, vx, vy, va, a, targetIndex } = unit;
  const curWp = unit.path.segments[0][targetIndex];
  const nextWp = unit.path.segments[0][targetIndex + 1] || unit.path[0][0];

  const cwpdx = x - curWp.x;
  const cwpdy = y - curWp.y;
  const nwpdx = x - nextWp.x;
  const nwpdy = y - nextWp.y;

  return [cwpdx, cwpdy, nwpdx, nwpdy, vx, vy, va, a];
}
