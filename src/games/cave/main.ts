import * as THREE from 'three';
import { MIXED_KIND, MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import { downloadModelArchive, pickModelArchive } from '../../ai/modelTransfer';
import { fileUtilities } from '../../ai/utils';
import { Visualizer } from '../../ai/v2/Visualizer';
import { layerColor } from '../../utilities/ai/colors';
import { contrastText } from '../../utilities/colors';
import { createCanvas, resizeCanvas } from '../../utilities/dom';
import { GamePad } from '../../utilities/inputs/Gamepad';
import { GameLoop } from '../../utilities/three/GameLoop';
import type { Ball } from './classes/Ball';
import { CaveRace } from './classes/CaveRace';
import { ChaseCamera } from './classes/ChaseCamera';
import { config, isDemo } from './classes/Config';
import { SensorViz } from './classes/SensorViz';
import { clearScoreRecords, type defaultState } from './utilities';

type CaveState = typeof defaultState;

const neuralVisualizer = new Visualizer(config);

/** the panel takes that share of the screen while open, capped in width,
 * the 3D cave keeps whatever is left */
const PANEL_RATIO = 0.75;
const PANEL_MAX_WIDTH = 800;

/** one captured jump sample per pixel column of the jump timeline */
const JUMP_TIMELINE_WIDTH = 110;

/** Screen resolution divisor: 1 keeps the native device pixel ratio, 2 draws
 *  half of it, 4 a quarter. Zero, negatives and garbage fall back to this. */
const DEFAULT_SCREEN_SCALE = 2;

/** The `?scale=` override, e.g. 1 for native or 4 for the lightest draw. */
function screenScale(scale = DEFAULT_SCREEN_SCALE) {
  return Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_SCREEN_SCALE;
}

const io = fileUtilities('cave');
if (config.CLEAR_STORAGE) io.discardModels();

/**
 * A small playable 3D cave. The cave and collision queries are deterministic
 * and streamed by Cave; the AI training pools live in CaveRace, leaving this
 * entry point to coordinate rendering, input and the HUD.
 */
export default async (state: CaveState) => {
  const seed = readSeed();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // the GPU budget goes to the training pool, not pixels: 1 = native, 2 = half
  const devicePixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const scale = screenScale(
    Number(new URLSearchParams(location.search).get('scale')),
  );
  renderer.setPixelRatio(devicePixelRatio / scale);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  // obstacle slabs cast soft shadows from the ball's torch onto the rock
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.inset = '0';
  renderer.domElement.style.zIndex = '0';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(config.PLANE_COLOR);
  scene.fog = new THREE.FogExp2(config.PLANE_COLOR, 0.0035);

  // the ball's torch is the main light now: the ambient sky and the camera
  // lamp stay dim so the torch carves the cave locally
  scene.add(new THREE.HemisphereLight(0x9bb7d1, 0x11151c, 0.4));
  const caveLight = new THREE.PointLight(0xffe9c0, 0.55, 420);
  scene.add(caveLight);
  // slightly above the ball so the ball itself stays lit and its own body
  // does not eat the torch: only obstacles are shadow casters
  const ballLight = new THREE.PointLight(0xfff1d8, 2.1, 180);
  ballLight.castShadow = true;
  ballLight.shadow.mapSize.set(1024, 1024);
  ballLight.shadow.camera.near = 1;
  ballLight.shadow.camera.far = 190;
  ballLight.shadow.bias = -0.002;
  ballLight.shadow.normalBias = 1.2;
  scene.add(ballLight);

  const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    1600,
  );

  // Wireframe is opt-in: the backtick key toggles it for mesh debugging.
  let wireframe = false;

  const race = new CaveRace(state, io, seed, scene, {
    onSeedChanged: (nextSeed) => {
      location.hash = `cave=${nextSeed}`;
      title.textContent = `CAVE // seed ${nextSeed}`;
      state.cave?.setWireframe(wireframe);
    },
  });

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
  hint.textContent =
    'WASD / left stick to roll\nSpace / primary button to jump · R to regenerate\n` to toggle wireframe\nAI focus draws its sensor cone';
  hint.style.position = 'fixed';
  hint.style.top = '38px';
  hint.style.left = '14px';
  hint.style.zIndex = '2';
  hint.style.color = '#e8edf4';
  hint.style.font = '600 12px monospace';
  hint.style.textShadow = '0 1px 3px #000';
  hint.style.whiteSpace = 'pre-line';
  hint.style.maxWidth = 'calc(100vw - 130px)';
  document.body.appendChild(hint);

  // ---- side panel: model actions, brain follow keys and the live network
  // visualization ported from the circuit game. It starts hidden. ----
  const networkCanvas = createCanvas();
  networkCanvas.className = 'neural-canvas';
  const networkCtx = networkCanvas.getContext('2d');

  const followPad = new GamePad(new Map());
  /** 0 follows the best-scoring AI ball, 1-9 that brain layer, 'mixed' the
   *  mixed brain; the human ball takes over while the player drives */
  let follow: number | 'mixed' = 0;
  /** the AI ball the camera currently tracks and when it took it; a new
   *  leader only takes over past FOLLOW_SWITCH_SCORE_GAP or once
   *  FOLLOW_SWITCH_MIN_MS have elapsed, so a close duel stops flickering */
  let followTarget: Ball | undefined;
  let followTargetSince = 0;
  const FOLLOW_SWITCH_SCORE_GAP = 5;
  const FOLLOW_SWITCH_MIN_MS = 5_000;
  let panelOpen = false;

  const panel = document.createElement('aside');
  panel.className = 'side-panel';
  panel.style.width = `${PANEL_RATIO * 100}%`;
  panel.style.maxWidth = `${PANEL_MAX_WIDTH}px`;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'side-panel-toggle';
  toggleBtn.textContent = '❮';
  toggleBtn.setAttribute('aria-label', 'Toggle models panel');
  toggleBtn.onclick = () => {
    panelOpen = panel.classList.toggle('open');
    toggleBtn.textContent = panelOpen ? '❯' : '❮';
  };

  const addModelButton = (text: string, title: string, onClick: () => void) => {
    const button = document.createElement('button');
    button.className = 'model-btn';
    button.textContent = text;
    button.title = title;
    button.onclick = onClick;
    return button;
  };
  const modelActions = document.createElement('div');
  modelActions.className = 'model-actions';
  modelActions.append(
    addModelButton('Save models', 'Download the cave training saves', () =>
      downloadModelArchive('cave'),
    ),
    addModelButton('Import archive', 'Load a cave model archive', async () => {
      try {
        const archive = await pickModelArchive();
        if (archive.game && archive.game !== 'cave') {
          alert(`This archive is for \`${archive.game}\`, not "cave"`);
          return;
        }
        const written = io.importModels(archive.models);
        if (!written.length) {
          alert('No compatible model in this archive');
          return;
        }
        console.info(`Loaded models: ${written.join(', ')}`);
        race.initialize();
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (message !== 'No file selected')
          alert(message || 'Unable to load models');
      }
    }),
    addModelButton('Clear training', 'Delete every saved cave brain', () => {
      if (
        !confirm(
          'Clear the current training set? This removes the saved models of this game.',
        )
      )
        return;
      io.discardGameModels();
      race.initialize();
    }),
    addModelButton('Clear records', 'Delete saved cave race records', () => {
      if (!confirm('Clear all saved cave race records? Brains are kept.'))
        return;
      clearScoreRecords();
      race.initialize();
    }),
  );

  const followKeys = document.createElement('div');
  followKeys.className = 'follow-keys';
  const followLabel = document.createElement('span');
  followLabel.textContent = 'Follow';

  const setFollow = (value: number | 'mixed') => {
    follow = value;
    followTarget = undefined;
    followKeys.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.follow === String(value));
    });
    // Mixed colors change every frame, so mixed and "all" keep a neutral DOM
    // outline instead of repainting the panel continuously.
    const color =
      typeof value === 'number' && value > 0
        ? layerColor(value, config.MAX_NETWORK_LAYERS)
        : '#c4c4c4';
    networkCanvas.style.setProperty('--network-color', color);
  };

  /** one entry per follow button: brain 1-9, all AI, mixed */
  const followBtns = new Map<
    HTMLButtonElement,
    { key: string; running?: boolean }
  >();

  const resetBrainSaves = (value: number | 'mixed') => {
    if (value === 'mixed') {
      if (!confirm(`Reset the saved weights of the mixed brain?`)) return;
      io.discardModel(MIXED_LEVELS, MIXED_KIND);
    } else if (value === 0) {
      if (!confirm('Reset all the saved cave weights?')) return;
      io.discardGameModels();
    } else {
      if (!confirm(`Reset the saved weights of brain ${value}?`)) return;
      io.discardModel(value);
    }
    console.info(
      `Reset saved weights of ${value === 0 ? 'all brains' : value}`,
    );
    race.initialize();
    followTarget = undefined;
  };

  /** long press (or right click) a brain button to reset its saved weights */
  const armReset = (
    btn: HTMLButtonElement,
    value: number | 'mixed',
    onClick: () => void,
  ) => {
    let timer = 0;
    let swallowClick = false;

    // registered before the follow click, so the click released after a
    // long press never also switches the camera
    btn.addEventListener('click', (e) => {
      if (swallowClick) {
        swallowClick = false;
        e.stopImmediatePropagation();
        return;
      }
      onClick();
    });

    const cancelHold = () => {
      if (timer) window.clearTimeout(timer);
      timer = 0;
    };
    btn.addEventListener('pointerdown', () => {
      timer = window.setTimeout(() => {
        timer = 0;
        swallowClick = true;
        resetBrainSaves(value);
      }, 650);
    });
    btn.addEventListener('pointerup', cancelHold);
    btn.addEventListener('pointerleave', cancelHold);
    btn.addEventListener('pointercancel', cancelHold);
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      cancelHold();
      if (swallowClick) swallowClick = false;
      else resetBrainSaves(value);
    });
  };

  followKeys.append(followLabel);
  (
    [
      ['brain 1', 1],
      ['brain 2', 2],
      ['brain 3', 3],
      ['brain 4', 4],
      ['brain 5', 5],
      ['brain 6', 6],
      ['brain 7', 7],
      ['brain 8', 8],
      ['brain 9', 9],
      ['all', 0],
      ['mixed', 'mixed'],
    ] as [string, number | 'mixed'][]
  ).forEach(([label, value]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.dataset.follow = String(value);
    btn.title = 'Click to follow, long press or right-click to reset';
    const color =
      typeof value === 'number' && value > 0
        ? layerColor(value, config.MAX_NETWORK_LAYERS)
        : '#c4c4c4';
    btn.style.setProperty('--btn-color', color);
    // black or white, whichever keeps the higher contrast on the ball color
    btn.style.setProperty('--btn-text', contrastText(color));
    followKeys.append(btn);
    followBtns.set(btn, { key: String(value) });
    armReset(btn, value, () => setFollow(value));
  });
  setFollow(0);

  // the brain preview lives in the panel, it grows into whatever is left
  const netWrap = document.createElement('div');
  netWrap.style.flex = '1';
  netWrap.style.position = 'relative';
  netWrap.style.minHeight = '0';
  networkCanvas.style.position = 'absolute';
  networkCanvas.style.left = '0';
  networkCanvas.style.top = '0';
  netWrap.append(networkCanvas);

  const legend = document.createElement('div');
  legend.className = 'side-panel-legend';
  [
    'At a glance',
    '🕹 human ball, WASD/arrows or a DualShock (left stick + A to jump)',
    '🎯 the followed ball is drawn solid, the rest fade to 50%',
    '🥅 the next gate ring glows and grows',
    '🪙 a spinning coin adds score and a temporary speed boost',
    '🧭 ` toggles the wireframe view',
    '📉 the section gauge kills a ball that stops progressing',
  ].forEach((line, i) => {
    const el = document.createElement('span');
    el.textContent = line;
    if (i === 0) el.className = 'legend-title';
    legend.append(el);
  });

  const about = document.createElement('div');
  about.className = 'side-panel-about';
  about.textContent = `It's a competition between ${config.MAX_NETWORK_LAYERS} different brain designs, plus a brain trained to hot-swap the proper one for the rock ahead (the mixed brain). Each ball is a rolling sphere in a streamed 3D cave: a forward sensor cone feeds its brain, and gravity, jumps and hard wall impacts decide who survives. Gates are claimed in order along the tunnel, and a section gauge kills any ball that stops making forward progress. The cave is infinite: each time a brain completes the last gate the seed advances to a fresh random cave, and groups that already finished a cave return as a mutation-only swarm of their champion, so brains are selected for completing unknown caves, not for shaving frames off one. A random explorer and a scout that re-runs the group's oldest saved line keep the population from converging on a single overfit brain.`;

  const footer = document.createElement('div');
  footer.className = 'side-panel-footer';
  footer.textContent = 'Long press for reset (right-click also works)';

  const info = document.createElement('div');
  info.className = 'side-panel-info';
  info.append(about, legend);

  const panelContent = document.createElement('div');
  panelContent.className = 'side-panel-content';
  panelContent.append(modelActions, followKeys, netWrap, info, footer);

  panel.append(toggleBtn, panelContent);
  // the demo profile hides the whole panel instead of starting it collapsed
  if (!isDemo) document.body.appendChild(panel);

  const position = document.createElement('div');
  position.className = 'cave-position';
  const positionLabel = document.createElement('div');
  positionLabel.className = 'cave-position-label';
  positionLabel.textContent = 'POSITION';
  const positionValue = document.createElement('span');
  positionValue.className = 'cave-position-value';
  const positionTotal = document.createElement('span');
  positionTotal.className = 'cave-position-total';
  position.append(positionLabel, positionValue, positionTotal);
  document.body.appendChild(position);

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
  const jumpCanvas = document.createElement('canvas');
  jumpCanvas.className = 'jump-timeline-canvas';
  jumpCanvas.width = JUMP_TIMELINE_WIDTH;
  jumpCanvas.height = 34;
  jumpCanvas.title = 'jump input each rendered frame, newest at the right edge';
  const jumpCtx = jumpCanvas.getContext('2d');
  controlIndicators.append(controlCanvas, velocityCanvas, jumpCanvas);

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

  // Build the training pools from the saved `cave_` models.
  race.initialize();
  state.cave?.setWireframe(wireframe);

  // Rays are a spectator/debug aid: they appear while the camera follows an
  // AI ball and hide as soon as the player's own ball is followed.
  const humanSensor = state.human?.sensor;
  const sensorViz = new SensorViz(
    humanSensor?.rayCount ?? config.SENSORS + 2,
    humanSensor?.surfaceIndices ?? [],
  );
  scene.add(sensorViz.group);

  const ballGeometry = new THREE.SphereGeometry(config.BALL_RADIUS, 20, 14);
  const markerGeometry = new THREE.SphereGeometry(
    config.BALL_RADIUS * 0.34,
    10,
    8,
  );

  // Meshes are keyed by ball label (layer:slot, or 'human') so a group
  // respawn reuses its slot's mesh instead of allocating every generation.
  const ballMeshes = new Map<string, THREE.Group>();
  const makeBallMesh = (ball: Ball) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      ballGeometry,
      new THREE.MeshStandardMaterial({
        wireframe,
        color: ball.color,
        emissive: ball.color,
        emissiveIntensity: ball.useAI ? 0.12 : 0.7,
        roughness: 0.55,
        metalness: 0.15,
      }),
    );
    body.frustumCulled = false;
    group.add(body);
    // an off-center patch makes the visual roll legible
    const marker = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshBasicMaterial({
        wireframe,
        color: ball.useAI ? ball.color : 0xffffaa,
      }),
    );
    marker.position.set(
      0,
      config.BALL_RADIUS * 0.55,
      -config.BALL_RADIUS * 0.75,
    );
    marker.frustumCulled = false;
    group.add(marker);
    group.frustumCulled = false;
    group.visible = false;
    scene.add(group);
    return group;
  };

  const updateBallFocusStyle = (mesh: THREE.Group, focused: boolean) => {
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
        material.depthTest = true;
      }
    });
  };

  let followed: Ball = state.human ?? state.balls[0];
  let lastHud = 0;
  // one sample per rendered frame, oldest dropped past the canvas width so the
  // line appears to scroll left; cleared whenever the followed ball changes
  const jumpSamples: number[] = [];
  let previousFollowed = followed;
  const chaseCamera = new ChaseCamera();

  /** The ball the camera and the network visualizer follow: the player while
   *  they drive, otherwise the best-scoring ball of the selected category. A
   *  new leader only takes over past FOLLOW_SWITCH_SCORE_GAP or once
   *  FOLLOW_SWITCH_MIN_MS have elapsed, so a close duel stops flickering. */
  function followedBall(): Ball {
    const human = state.human;
    if (human?.controls.playerActive && !human.damaged) return human;
    const inCategory = (ball: Ball) =>
      !ball.damaged &&
      (follow === 'mixed'
        ? ball.brain instanceof MixedNetwork
        : follow > 0
        ? ball.brainLayers === follow && !(ball.brain instanceof MixedNetwork)
        : true);
    let leader: Ball | undefined;
    for (const ball of state.balls) {
      if (
        ball.useAI &&
        inCategory(ball) &&
        (!leader || ball.brain.score > leader.brain.score)
      )
        leader = ball;
    }
    if (!leader) leader = state.balls.find((ball) => !ball.damaged);
    const current = followTarget;
    const now = performance.now();
    if (
      current &&
      current !== leader &&
      leader &&
      state.balls.includes(current) &&
      inCategory(current) &&
      leader.brain.score - current.brain.score <= FOLLOW_SWITCH_SCORE_GAP &&
      now - followTargetSince < FOLLOW_SWITCH_MIN_MS
    )
      return current;
    if (leader !== current) {
      followTarget = leader;
      followTargetSince = now;
    }
    return leader ?? state.balls[0];
  }

  /** Fill the follow buttons with their running/dead state once per HUD tick. */
  function updateFollowButtons() {
    const running = new Set<string>();
    for (const ball of state.balls) {
      if (ball.damaged || !ball.useAI) continue;
      running.add(
        ball.brain instanceof MixedNetwork ? 'mixed' : String(ball.brainLayers),
      );
    }
    followBtns.forEach((info, btn) => {
      const isRunning =
        info.key === '0' ? state.living > 0 : running.has(info.key);
      if (isRunning === info.running) return;
      info.running = isRunning;
      btn.classList.toggle('running', isRunning);
      btn.classList.toggle('dead', !isRunning);
    });
  }

  /** The 3D viewport and the network canvas split the window while the panel
   *  is open, exactly like the circuit game. */
  let viewWidth = window.innerWidth;
  function layoutViewport() {
    const panelWidth = Math.round(
      Math.min(window.innerWidth * PANEL_RATIO, PANEL_MAX_WIDTH),
    );
    const next = panelOpen ? window.innerWidth - panelWidth : window.innerWidth;
    if (next !== viewWidth) {
      viewWidth = next;
      renderer.setSize(next, window.innerHeight);
      camera.aspect = next / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    if (panelOpen)
      resizeCanvas(
        networkCanvas,
        networkCtx,
        netWrap.clientWidth,
        netWrap.clientHeight,
      );
  }

  const loop = new GameLoop();
  let accumulator = 0;
  loop.play((_elapsed, dt) => {
    // 1-9 follow a brain layer, 0 the mixed brain (click the panel for "all").
    for (let digit = 0; digit <= 9; digit++) {
      if (followPad.once(`Digit${digit}`))
        setFollow(digit === 0 ? 'mixed' : digit);
    }

    // Keep physics, AI and race timers at 60 Hz on every display. Limit
    // catch-up after tab suspension so it cannot spiral into a long frame.
    accumulator = Math.min(accumulator + dt, 5 / 60);
    const now = performance.now();
    while (accumulator >= 1 / 60) {
      accumulator -= 1 / 60;
      race.update(now);
    }

    const balls = state.balls;
    followed = followedBall();
    if (followed !== previousFollowed) {
      previousFollowed = followed;
      jumpSamples.length = 0;
    }

    const seen = new Set<string>();
    for (const ball of balls) {
      seen.add(ball.label);
      let mesh = ballMeshes.get(ball.label);
      if (!mesh) {
        mesh = makeBallMesh(ball);
        ballMeshes.set(ball.label, mesh);
      }
      updateBallFocusStyle(mesh, ball === followed);
      const visible =
        !ball.damaged && Math.abs(ball.s - followed.s) < config.VISUAL_RANGE;
      mesh.visible = visible;
      if (!visible) continue;
      mesh.position.set(ball.x, ball.y, ball.z);
      mesh.quaternion.copy(ball.quat);
    }
    for (const [label, mesh] of ballMeshes) {
      if (seen.has(label)) continue;
      scene.remove(mesh);
      mesh.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        for (const material of materials) material.dispose();
      });
      ballMeshes.delete(label);
    }

    const cave = state.cave;
    if (!cave) return;
    const showRays = followed.useAI && !followed.damaged;
    sensorViz.update(followed, showRays);
    chaseCamera.update(camera, followed, cave);
    caveLight.position.copy(camera.position);
    ballLight.position.set(
      followed.x,
      followed.y + config.BALL_RADIUS * 2.2,
      followed.z,
    );
    // the torch takes the followed ball's colour so each car lights its own
    // patch of cave in its own tint
    ballLight.color.set(followed.color || '#ffffff');

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
      jumpSamples.push(followed.controls.jumpHeld ? 1 : 0);
      if (jumpSamples.length > JUMP_TIMELINE_WIDTH)
        jumpSamples.splice(0, jumpSamples.length - JUMP_TIMELINE_WIDTH);
      if (jumpCtx) drawJumpTimeline(jumpCtx, jumpSamples, followed.color);
    }

    renderer.render(scene, camera);
    layoutViewport();
    // The human ball has a stub brain, so keep showing the best racing AI
    // while the player drives.
    const visualized = followed.useAI
      ? followed
      : state.balls.find((ball) => ball.useAI && !ball.damaged);
    if (panelOpen && visualized?.brain)
      neuralVisualizer.renderNetwork(networkCtx, visualized.brain);
    if (now - lastHud > 50) {
      lastHud = now;
      updateFollowButtons();
      const followedIndex = balls.indexOf(followed);
      const rank =
        1 +
        balls.filter(
          (ball, index) =>
            ball.s > followed.s ||
            (ball.s === followed.s && index < followedIndex),
        ).length;
      positionValue.textContent = String(rank);
      positionTotal.textContent = `/${balls.length}`;
      position.setAttribute(
        'aria-label',
        `Position ${rank} of ${balls.length}`,
      );
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
        const previousBest = history?.[String(race.seed)];
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
    // force layoutViewport to reapply the split at the new window size
    viewWidth = -1;
    layoutViewport();
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Backquote' || event.key === '`') {
      if (event.repeat || event.isComposing) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select'))
      )
        return;
      event.preventDefault();
      wireframe = !wireframe;
      state.cave?.setWireframe(wireframe);
      for (const mesh of ballMeshes.values()) {
        mesh.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) {
            if (
              material instanceof THREE.MeshBasicMaterial ||
              material instanceof THREE.MeshStandardMaterial
            )
              material.wireframe = wireframe;
          }
        });
      }
      return;
    }
    if (event.key.toLowerCase() !== 'r') return;
    race.applyUserSeed(Math.max(0, race.seed + 1));
  });
  window.addEventListener('beforeunload', () => race.saveAll());
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

/**
 * A left-scrolling strip of jump input: one 1px column per rendered frame,
 * newest at the right edge. A raised bar means the jump channel was held that
 * frame (a brain's third output or a live Space / primary-button press), so a
 * single-frame tap reads as a needle and a held jump as a plateau.
 */
function drawJumpTimeline(
  ctx: CanvasRenderingContext2D,
  samples: number[],
  color: string,
  width = JUMP_TIMELINE_WIDTH,
  height = 34,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(25, 52, 94, 0.55)';
  ctx.fillRect(0, 0, width, height);

  // silence baseline, matching the velocity vector's axis
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 5.5);
  ctx.lineTo(width, height - 5.5);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  const offset = width - samples.length;
  for (let i = 0; i < samples.length; i++) {
    if (!samples[i]) continue;
    ctx.fillRect(offset + i, 3, 1, height - 9);
  }

  ctx.globalAlpha = 0.7;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.globalAlpha = 1;
}
