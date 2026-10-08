import * as THREE from 'three';
import { GameLoop } from '../../utilities/three/GameLoop';
import { Ball, getCaveBrainDimensions } from './classes/Ball';
import { Cave } from './classes/Cave';
import { ChaseCamera } from './classes/ChaseCamera';
import { config } from './classes/Config';
import { ControlType } from './types';

interface CaveState {
  cave?: Cave;
  balls: Ball[];
  human?: Ball;
  seed: number;
}

const BALL_COUNT = 10;

/**
 * A small playable 3D cave prototype. The cave and collision queries are
 * deterministic and streamed by Cave; this entry point keeps rendering and
 * input orchestration separate from the simulation classes.
 */
export default async (state: CaveState) => {
  const seed = readSeed();
  state.seed = seed;
  state.balls = [];

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
  const human = new Ball(
    spawn,
    ControlType.HUMAN,
    config.BALL_MAX_SPEED,
    'human',
    '#ddffbb',
    1,
    undefined,
    0,
    cave,
  );
  state.human = human;
  state.balls.push(human);

  // The prototype keeps a modest AI population so it remains responsive while
  // still exercising the same neural inputs and streaming physics.
  const { inputCount, outputCount } = getCaveBrainDimensions();
  void inputCount;
  void outputCount;
  for (let i = 0; i < BALL_COUNT; i++) {
    const ai = new Ball(
      spawn,
      ControlType.AI,
      config.BALL_MAX_SPEED,
      `A${i}`,
      '',
      1 + (i % config.MAX_NETWORK_LAYERS),
      undefined,
      0,
      cave,
    );
    state.balls.push(ai);
  }

  const ballGeometry = new THREE.SphereGeometry(config.BALL_RADIUS, 20, 14);
  const markerGeometry = new THREE.SphereGeometry(
    config.BALL_RADIUS * 0.34,
    10,
    8,
  );
  const ballMeshes = new Map<Ball, THREE.Group>();
  for (const ball of state.balls) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      ballGeometry,
      new THREE.MeshStandardMaterial({
        color: ball.color === 'white' ? 0xffffff : ball.color,
        emissive: ball.color === 'white' ? 0x222222 : ball.color,
        emissiveIntensity: ball === human ? 0.7 : 0.12,
        roughness: 0.55,
        metalness: 0.15,
        depthTest: ball !== human,
      }),
    );
    body.frustumCulled = false;
    group.add(body);
    // an off-center patch makes the visual roll legible
    const marker = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshBasicMaterial({
        color: ball === human ? 0xffffaa : ball.color,
        depthTest: ball !== human,
      }),
    );
    marker.position.set(
      0,
      config.BALL_RADIUS * 0.55,
      -config.BALL_RADIUS * 0.75,
    );
    marker.frustumCulled = false;
    group.add(marker);
    group.renderOrder = ball === human ? 10 : 1;
    group.frustumCulled = false;
    group.visible = false;
    scene.add(group);
    ballMeshes.set(ball, group);
  }

  const updateBallFocusStyle = (
    ball: Ball,
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
        // close-obstruction visibility fallback to the followed ball.
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
  hint.textContent = 'WASD / left stick to roll · R to regenerate';
  hint.style.position = 'fixed';
  hint.style.top = '38px';
  hint.style.left = '14px';
  hint.style.zIndex = '2';
  hint.style.color = '#e8edf4';
  hint.style.font = '600 12px monospace';
  hint.style.textShadow = '0 1px 3px #000';
  document.body.appendChild(hint);

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
  totalFramesEl.title = 'simulation frames rolled in this cave';

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

  const respawn = (ball: Ball) => {
    // Balls intentionally share one starting transform; there is no
    // ball-to-ball collision system, so overlapping spawn slots are harmless.
    ball.reset(spawn);
    ball.brain.score = 0;
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
      for (const ball of state.balls) {
        if (ball.damaged) {
          if (now - ball.deathTime > 900) {
            respawn(ball);
            ball.deathTime = 0;
          }
          continue;
        }
        const alive = !ball.damaged;
        ball.update(cave);
        if (alive && ball.damaged) ball.deathTime = now;
      }
    }

    let minS = human.s;
    let maxS = human.s;
    for (const ball of state.balls) {
      if (ball.damaged) continue;
      minS = Math.min(minS, ball.s);
      maxS = Math.max(maxS, ball.s);
    }
    cave.update(
      minS - config.CAVE_CHUNKS_BEHIND * config.CAVE_SEGMENT_LENGTH,
      maxS + config.CAVE_CHUNKS_AHEAD * config.CAVE_SEGMENT_LENGTH,
      dt,
    );

    const living = state.balls.filter((ball) => !ball.damaged);
    const best = living.reduce(
      (leader, ball) => (ball.s > leader.s ? ball : leader),
      human,
    );
    followed = human.damaged ? best : human;

    for (const ball of state.balls) {
      const mesh = ballMeshes.get(ball);
      if (!mesh) continue;
      updateBallFocusStyle(ball, mesh, ball === followed);
      const visible =
        !ball.damaged && Math.abs(ball.s - followed.s) < config.VISUAL_RANGE;
      mesh.visible = visible;
      if (!visible) continue;
      mesh.position.set(ball.x, ball.y, ball.z);
      mesh.quaternion.copy(ball.quat);
    }

    const cameraObstructed = chaseCamera.update(camera, followed, cave, dt);
    if (cameraObstructed) {
      ballMeshes.get(followed)?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        object.renderOrder = 10;
        for (const material of materials) material.depthTest = false;
      });
    }
    caveLight.position.copy(camera.position);

    // Highlight the followed ball's next ring without rebuilding the mesh.
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
        drawStick(
          controlCtx,
          followed.controls.moveX,
          followed.controls.moveY,
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

/** Draw the followed ball's stick input: a vector from center to (x, y). */
function drawStick(
  ctx: CanvasRenderingContext2D,
  moveX: number,
  moveY: number,
  color: string,
  size = 110,
) {
  const center = size / 2;
  const radius = size * 0.4;
  const x = Math.max(-1, Math.min(1, moveX));
  const y = Math.max(-1, Math.min(1, moveY));

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(25, 52, 94, 0.55)';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(center, 8);
  ctx.lineTo(center, size - 8);
  ctx.moveTo(8, center);
  ctx.lineTo(size - 8, center);
  ctx.stroke();

  const endX = center + x * radius;
  const endY = center - y * radius;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(center, center);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(endX, endY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Project 3D velocity into the followed ball's track forward/right plane. */
function drawCaveVelocityVector(
  ctx: CanvasRenderingContext2D,
  ball: Ball,
  width = 110,
  height = 34,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const forward = ball.vx * ball.fx + ball.vy * ball.fy + ball.vz * ball.fz;
  const lateral = ball.vx * ball.rx + ball.vy * ball.ry + ball.vz * ball.rz;
  const scale = (Math.min(width, height) * 0.42) / Math.max(1, ball.maxSpeed);
  const endX = centerX + lateral * scale;
  const endY = centerY - forward * scale;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = ball.color;
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
  ctx.fillStyle = ball.color;
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
