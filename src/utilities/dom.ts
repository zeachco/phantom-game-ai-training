export function createCanvas() {
  const can = document.createElement('canvas');
  document.body.appendChild(can);
  return can;
}
