import * as THREE from 'three';
import { GameLoop } from '../../utilities/three/GameLoop';
import { ControlType } from './types';
import { Car, getCaveBrainDimensions } from './classes/Car';
import { Cave } from './classes/Cave';
import { config } from './classes/Config';

interface CaveState {
  cave?: Cave;
  cars: Car[];
  human?: Car;
  seed: number;
}

const CAR_COUNT = 24;

/**
 * A small playable 3D cave prototype. The cave and collision queries are
 * deterministic and streamed by Cave; this entry point keeps rendering and
 * input orchestration separate from the simulation classes.
 */
export default async (state: CaveState) => {
  const seed = readSeed();
  state.seed = seed;
  state.cars = [];

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.inset = '0';
  renderer.domElement.style.zIndex = '0';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.PLANE_COLOR);
  scene.fog = new THREE.FogExp2(config.PLANE_COLOR, 0.0035);

  scene.add(new THREE.HemisphereLight(0x9bb7d1, 0x11151c, 1.15));
  const caveLight = new THREE.PointLight(0xffe9c0, 1.8, 420);
  scene.add(caveLight);

  const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    1600,
  );

  const cave = new Cave(seed, scene);
  state.cave = cave;

  const spawn = cave.getSpawn();
  const human = new Car(
    spawn,
    ControlType.HUMAN,
    config.CAR_MAX_SPEED,
    'human',
    '#ddffbb',
    1,
    undefined,
    0,
    cave,
  );
  state.human = human;
  state.cars.push(human);

  // The prototype keeps a modest AI population so it remains responsive while
  // still exercising the same neural inputs and streaming physics.
  const { inputCount, outputCount } = getCaveBrainDimensions();
  void inputCount;
  void outputCount;
  for (let i = 0; i < CAR_COUNT; i++) {
    const ai = new Car(
      spawn,
      ControlType.AI,
      config.CAR_MAX_SPEED,
      `A${i}`,
      '',
      1 + (i % config.MAX_NETWORK_LAYERS),
      undefined,
      ((i * 7) % 17) / 17 - 0.5,
      cave,
    );
    ai.s += (i % 6) * 3;
    state.cars.push(ai);
  }

  const carGeometry = new THREE.BoxGeometry(4.4, 2.2, 8.5);
  const wheelGeometry = new THREE.BoxGeometry(1.25, 1.1, 2.0);
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x15181d,
    roughness: 0.9,
  });
  const carMeshes = new Map<Car, THREE.Group>();
  for (const car of state.cars) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      carGeometry,
      new THREE.MeshStandardMaterial({
        color: car.color === 'white' ? 0xffffff : car.color,
        roughness: 0.6,
        metalness: 0.15,
      }),
    );
    group.add(body);
    for (const [x, z] of [
      [-2.0, -3.1],
      [2.0, -3.1],
      [-2.0, 3.1],
      [2.0, 3.1],
    ]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(x, -1.35, z);
      group.add(wheel);
    }
    group.visible = false;
    scene.add(group);
    carMeshes.set(car, group);
  }

  const hud = document.createElement('div');
  hud.style.position = 'fixed';
  hud.style.left = '14px';
  hud.style.bottom = '14px';
  hud.style.zIndex = '2';
  hud.style.color = '#e8edf4';
  hud.style.font = '600 14px monospace';
  hud.style.textShadow = '0 1px 3px #000';
  hud.style.pointerEvents = 'none';
  document.body.appendChild(hud);

  const title = document.createElement('div');
  title.textContent = `CAVE // seed ${seed}`;
  title.style.position = 'fixed';
  title.style.top = '14px';
  title.style.left = '14px';
  title.style.zIndex = '2';
  title.style.color = '#e8edf4';
  title.style.font = '700 16px monospace';
  title.style.textShadow = '0 1px 3px #000';
  document.body.appendChild(title);

  const hint = document.createElement('div');
  hint.textContent = 'WASD / arrows to drive · R to regenerate';
  hint.style.marginTop = '4px';
  hud.appendChild(hint);
  const readout = document.createElement('div');
  hud.appendChild(readout);

  let followed = human;
  let lastHud = 0;
  const lookAt = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const center = { x: 0, y: 0, z: 0 };

  const respawn = (car: Car) => {
    const next = cave.getSpawn();
    car.x = next.x;
    car.y = next.y;
    car.z = next.z;
    car.s = next.s + (car === human ? 0 : Math.random() * 24);
    car.vx = 0;
    car.vy = 0;
    car.vz = 0;
    car.avx = 0;
    car.avy = 0;
    car.avz = 0;
    car.damaged = false;
    car.finished = false;
    car.nextGate = 0;
    car.insideGate = -1;
    car.gateFramesRemaining = config.GATE_BUDGET_FRAMES;
    car.brain.score = 0;
  };

  const loop = new GameLoop();
  loop.play((_elapsed, _dt) => {
    const now = performance.now();
    for (const car of state.cars) {
      if (car.damaged) {
        if (now - car.deathTime > config.DEAD_LIFETIME) {
          respawn(car);
          car.deathTime = 0;
        }
        continue;
      }
      car.update(cave);
    }

    let minS = human.s;
    let maxS = human.s;
    for (const car of state.cars) {
      if (car.damaged) continue;
      minS = Math.min(minS, car.s);
      maxS = Math.max(maxS, car.s);
    }
    cave.update(
      minS - config.CAVE_CHUNKS_BEHIND * config.CAVE_SEGMENT_LENGTH,
      maxS + config.CAVE_CHUNKS_AHEAD * config.CAVE_SEGMENT_LENGTH,
    );

    const living = state.cars.filter((car) => !car.damaged);
    const best = living.reduce(
      (leader, car) => (car.s > leader.s ? car : leader),
      human,
    );
    followed = human.damaged ? best : human;

    for (const car of state.cars) {
      const mesh = carMeshes.get(car);
      if (!mesh) continue;
      const visible =
        !car.damaged && Math.abs(car.s - followed.s) < config.VISUAL_RANGE;
      mesh.visible = visible;
      if (!visible) continue;
      mesh.position.set(car.x, car.y, car.z);
      mesh.quaternion.copy(car.quat);
    }

    // The camera sits behind the car but always looks at the cave axis ahead,
    // rather than staring at the car's local tilt.
    cave.centerAt(followed.s + config.CAMERA_LOOK_AHEAD, center);
    lookAt.set(center.x, center.y, center.z);
    desiredCamera.set(
      followed.x - followed.fx * 20 + followed.ux * 8,
      followed.y - followed.fy * 20 + followed.uy * 8,
      followed.z - followed.fz * 20 + followed.uz * 8,
    );
    camera.position.lerp(desiredCamera, 0.12);
    camera.lookAt(lookAt);
    caveLight.position.copy(camera.position);

    // Highlight the followed car's next ring without rebuilding the mesh.
    for (let i = 0; i < cave.gateMeshes.length; i++) {
      const gate = cave.gateMeshes[i];
      if (!gate) continue;
      gate.visible = Math.abs(cave.gatePositions[i] - followed.s) < 900;
      gate.scale.setScalar(i === followed.nextGate ? 1.06 : 1);
    }

    renderer.render(scene, camera);
    if (now - lastHud > 50) {
      lastHud = now;
      readout.textContent = `${Math.round(followed.speed * 3.6)} km/h · gate ${Math.min(
        followed.nextGate,
        config.GATES_PER_SEED,
      )}/${config.GATES_PER_SEED} · score ${Math.round(followed.brain.score)}`;
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 'r') return;
    location.hash = `cave=${Math.max(0, seed + 1)}`;
    location.reload();
  });
};

function readSeed() {
  const match = location.hash.match(/cave=(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}
