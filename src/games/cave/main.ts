import * as THREE from 'three';
import { GameLoop } from '../../utilities/three/GameLoop';
import { drawControlAxes } from '../circuit/ui/driveIndicators';
import { Car, getCaveBrainDimensions } from './classes/Car';
import { Cave } from './classes/Cave';
import { ChaseCamera } from './classes/ChaseCamera';
import { config } from './classes/Config';
import { ControlType } from './types';

interface CaveState {
  cave?: Cave;
  cars: Car[];
  human?: Car;
  seed: number;
}

const CAR_COUNT = 10;

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
      0,
      cave,
    );
    state.cars.push(ai);
  }

  const carGeometry = new THREE.BoxGeometry(4.4, 2.2, 8.5);
  const wheelGeometry = new THREE.CylinderGeometry(
    config.CAR_WHEEL_RADIUS,
    config.CAR_WHEEL_RADIUS,
    0.9,
    12,
  );
  wheelGeometry.rotateZ(Math.PI / 2);
  const wheelMeshes = new Map<Car, THREE.Group[]>();
  const markerGeometry = new THREE.SphereGeometry(1.4, 12, 8);
  const carMeshes = new Map<Car, THREE.Group>();
  for (const car of state.cars) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      carGeometry,
      new THREE.MeshStandardMaterial({
        color: car.color === 'white' ? 0xffffff : car.color,
        emissive: car.color === 'white' ? 0x222222 : car.color,
        emissiveIntensity: car === human ? 0.7 : 0.12,
        roughness: 0.6,
        metalness: 0.15,
        depthTest: car !== human,
      }),
    );
    body.frustumCulled = false;
    group.add(body);
    const marker = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshBasicMaterial({
        color: car === human ? 0xffffaa : car.color,
        depthTest: car !== human,
      }),
    );
    marker.position.set(0, 1.8, -3.7);
    marker.frustumCulled = false;
    group.add(marker);
    group.renderOrder = car === human ? 10 : 1;
    group.frustumCulled = false;
    // Each car owns its wheel material so focused-car opacity does not
    // accidentally change every car's wheels at once.
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x15181d,
      roughness: 0.9,
    });
    const wheels: THREE.Group[] = [];
    for (const [x, y, z] of config.WHEEL_OFFSETS) {
      const mount = new THREE.Group();
      mount.position.set(x, y - config.SUSP_REST, z);
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      mount.add(wheel);
      group.add(mount);
      wheels.push(mount);
    }
    wheelMeshes.set(car, wheels);
    group.visible = false;
    scene.add(group);
    carMeshes.set(car, group);
  }

  const updateCarFocusStyle = (
    car: Car,
    mesh: THREE.Group,
    focused: boolean,
  ) => {
    const opacity = focused ? 1 : 0.5;
    mesh.renderOrder = focused ? 10 : 1;
    mesh.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      object.renderOrder = focused ? 10 : 1;
      for (const material of materials) {
        material.transparent = opacity < 1;
        material.opacity = opacity;
        material.depthWrite = focused;
        // Normal depth testing is restored before the camera applies its
        // close-obstruction visibility fallback to the followed car.
        material.depthTest = true;
      }
    });
  };

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
  hint.style.position = 'fixed';
  hint.style.top = '38px';
  hint.style.left = '14px';
  hint.style.zIndex = '2';
  hint.style.color = '#e8edf4';
  hint.style.font = '600 12px monospace';
  hint.style.textShadow = '0 1px 3px #000';
  document.body.appendChild(hint);

  // Reuse the circuit cockpit HUD, with gate and cave-section information in
  // place of its lap/checkpoint countdown.
  const steerOverlay = document.createElement('div');
  steerOverlay.className = 'steer-overlay';
  const controlIndicators = document.createElement('div');
  controlIndicators.className = 'control-indicators';
  const controlCanvas = document.createElement('canvas');
  controlCanvas.className = 'control-axis';
  controlCanvas.width = 110;
  controlCanvas.height = 110;
  const controlCtx = controlCanvas.getContext('2d');
  const velocityCanvas = document.createElement('canvas');
  velocityCanvas.className = 'velocity-vector';
  velocityCanvas.width = 110;
  velocityCanvas.height = 34;
  const velocityCtx = velocityCanvas.getContext('2d');
  controlIndicators.append(controlCanvas, velocityCanvas);

  const readout = document.createElement('div');
  readout.className = 'readout';
  const gateCountEl = document.createElement('div');
  gateCountEl.className = 'laps';
  gateCountEl.title = 'next gate out of the total gates in this cave';
  const gateFramesEl = document.createElement('div');
  gateFramesEl.className = 'frame-count';
  gateFramesEl.title = 'simulation frames since the previous gate';
  const totalFramesEl = document.createElement('div');
  totalFramesEl.className = 'frame-count';
  totalFramesEl.title = 'simulation frames driven in this cave';

  const makeTimingLine = (label: string, title: string) => {
    const element = document.createElement('div');
    element.className = 'timing-line';
    element.title = title;
    const labelEl = document.createElement('span');
    labelEl.className = 'timing-label';
    labelEl.textContent = label;
    const value = document.createElement('span');
    value.className = 'timing-value';
    value.textContent = '—';
    const delta = document.createElement('span');
    delta.className = 'timing-delta';
    element.append(labelEl, value, delta);
    return { element, label: labelEl, value, delta };
  };
  const gateTiming = makeTimingLine(
    'gate',
    'latest completed gate split in simulation frames',
  );
  const finishTiming = makeTimingLine(
    'finish',
    'final cave time in simulation frames',
  );
  const timingDeltas = document.createElement('div');
  timingDeltas.className = 'timing-deltas';
  timingDeltas.append(gateTiming.element, finishTiming.element);

  const speedo = document.createElement('div');
  speedo.className = 'speedo';
  speedo.title = 'speed';
  const speedoValue = document.createElement('span');
  speedoValue.className = 'speedo-value';
  const speedoUnit = document.createElement('span');
  speedoUnit.className = 'speedo-unit';
  speedoUnit.textContent = 'u/f';
  speedo.append(speedoValue, speedoUnit);
  readout.append(
    gateCountEl,
    gateFramesEl,
    totalFramesEl,
    timingDeltas,
    speedo,
  );

  const sectionGauge = document.createElement('div');
  sectionGauge.className = 'gate-gauge';
  sectionGauge.title =
    'budget remaining to make forward progress into the next cave section';
  sectionGauge.setAttribute('role', 'progressbar');
  sectionGauge.setAttribute(
    'aria-label',
    'Cave section progress budget remaining',
  );
  sectionGauge.setAttribute('aria-valuemin', '0');
  sectionGauge.setAttribute(
    'aria-valuemax',
    String(config.SECTION_BUDGET_FRAMES),
  );
  const sectionGaugeFill = document.createElement('div');
  sectionGaugeFill.className = 'gate-gauge-fill';
  sectionGauge.append(sectionGaugeFill);

  const brainStats = document.createElement('div');
  brainStats.className = 'brain-stats';
  brainStats.title = 'followed brain stats';
  steerOverlay.append(controlIndicators, sectionGauge, readout, brainStats);
  document.body.appendChild(steerOverlay);

  let lastStatsText = '';
  let followed = human;
  let lastHud = 0;
  const chaseCamera = new ChaseCamera();

  const respawn = (car: Car) => {
    // Cars intentionally share one starting transform; there is no
    // car-to-car collision system, so overlapping spawn slots are harmless.
    car.reset(spawn);
    car.brain.score = 0;
  };

  const loop = new GameLoop();
  let accumulator = 0;
  loop.play((_elapsed, dt) => {
    // Keep physics, AI and race timers at 60 Hz on every display. Limit
    // catch-up after tab suspension so it cannot spiral into a long frame.
    accumulator = Math.min(accumulator + dt, 5 / 60);
    const now = performance.now();
    while (accumulator >= 1 / 60) {
      accumulator -= 1 / 60;
      for (const car of state.cars) {
        if (car.damaged) {
          if (now - car.deathTime > 900) {
            respawn(car);
            car.deathTime = 0;
          }
          continue;
        }
        const alive = !car.damaged;
        car.update(cave);
        if (alive && car.damaged) car.deathTime = now;
      }
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
      updateCarFocusStyle(car, mesh, car === followed);
      const visible =
        !car.damaged && Math.abs(car.s - followed.s) < config.VISUAL_RANGE;
      mesh.visible = visible;
      if (!visible) continue;
      mesh.position.set(car.x, car.y, car.z);
      mesh.quaternion.copy(car.quat);
      const wheels = wheelMeshes.get(car)!;
      for (let w = 0; w < wheels.length; w++) {
        wheels[w].position.y = config.WHEEL_OFFSETS[w][1] - car.wheelLengths[w];
        wheels[w].rotation.y = w < 2 ? car.steeringAngle : 0;
        wheels[w].children[0].rotation.x = -car.wheelSpin[w];
      }
    }

    const cameraObstructed = chaseCamera.update(camera, followed, cave, dt);
    if (cameraObstructed) {
      carMeshes.get(followed)?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        object.renderOrder = 10;
        for (const material of materials) material.depthTest = false;
      });
    }
    caveLight.position.copy(camera.position);

    // Highlight the followed car's next ring without rebuilding the mesh.
    for (let i = 0; i < cave.gateMeshes.length; i++) {
      const gate = cave.gateMeshes[i];
      if (!gate) continue;
      gate.visible = Math.abs(cave.gatePositions[i] - followed.s) < 900;
      gate.scale.setScalar(i === followed.nextGate ? 1.06 : 1);
    }

    const isFollowedAlive = !followed.damaged;
    steerOverlay.style.setProperty('--hud-color', followed.color || '#c4c4c4');
    steerOverlay.classList.toggle('hidden', !isFollowedAlive);
    if (isFollowedAlive) {
      if (controlCtx)
        drawControlAxes(
          controlCtx,
          followed.controls.left,
          followed.controls.right,
          followed.controls.throttle,
          followed.color,
        );
      if (velocityCtx) drawCaveVelocityVector(velocityCtx, followed);
    }

    renderer.render(scene, camera);
    if (now - lastHud > 50) {
      lastHud = now;
      if (!isFollowedAlive) return;
      const gateNumber = Math.min(followed.nextGate + 1, config.GATES_PER_SEED);
      gateCountEl.textContent = `gate ${gateNumber}/${config.GATES_PER_SEED}`;
      gateFramesEl.textContent = `gate ${followed.framesSinceLastGate}f`;
      totalFramesEl.textContent = `total ${followed.totalRaceFrames}f`;
      speedoValue.textContent = followed.speed.toFixed(1);

      gateTiming.label.textContent =
        followed.completedGateIndex < 0
          ? 'gate'
          : `gate${followed.completedGateIndex + 1}`;
      gateTiming.value.textContent =
        followed.completedGateIndex < 0
          ? '—'
          : String(Math.round(followed.completedGateFrames));
      finishTiming.value.textContent =
        followed.lastFinishFrames > 0
          ? String(Math.round(followed.lastFinishFrames))
          : '—';

      const sectionFraction = Math.max(
        0,
        Math.min(
          1,
          followed.sectionFramesRemaining / config.SECTION_BUDGET_FRAMES,
        ),
      );
      sectionGaugeFill.style.height = `${sectionFraction * 100}%`;
      sectionGauge.setAttribute(
        'aria-valuenow',
        String(followed.sectionFramesRemaining),
      );

      let bestScore: number | string = '—';
      try {
        const saved = localStorage.getItem(
          `cave_score_${followed.brainLayers}`,
        );
        const history = saved ? JSON.parse(saved).history : undefined;
        const previousBest = history?.[String(seed)];
        if (typeof previousBest === 'number' && previousBest > 0)
          bestScore = Math.round(previousBest);
      } catch {
        // HUD history is optional; malformed or unavailable storage is ignored.
      }
      const mutation =
        followed.brain.mutationIndex === 0
          ? 'Original model'
          : `Mut ${(followed.brain.mutationFactor * 100).toFixed(4)}%`;
      const statsText = [
        `Net ${followed.brain.id}`,
        mutation,
        `Score ${Math.round(followed.brain.score)}`,
        `Best ${bestScore}`,
      ].join('\n');
      if (statsText !== lastStatsText) {
        lastStatsText = statsText;
        brainStats.replaceChildren(
          ...statsText.split('\n').map((line) => {
            const span = document.createElement('span');
            span.textContent = line;
            return span;
          }),
        );
      }
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

/** Project 3D velocity into the followed car's forward/right plane. */
function drawCaveVelocityVector(
  ctx: CanvasRenderingContext2D,
  car: Car,
  width = 110,
  height = 34,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const forward = car.vx * car.fx + car.vy * car.fy + car.vz * car.fz;
  const lateral = car.vx * car.rx + car.vy * car.ry + car.vz * car.rz;
  const scale = (Math.min(width, height) * 0.42) / Math.max(1, car.maxSpeed);
  const endX = centerX + lateral * scale;
  const endY = centerY - forward * scale;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = car.color;
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
  const angle = Math.atan2(endY - centerY, endX - centerX);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - Math.cos(angle - Math.PI / 6) * 7,
    endY - Math.sin(angle - Math.PI / 6) * 7,
  );
  ctx.lineTo(
    endX - Math.cos(angle + Math.PI / 6) * 7,
    endY - Math.sin(angle + Math.PI / 6) * 7,
  );
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}
