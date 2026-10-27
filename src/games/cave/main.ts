import * as THREE from 'three';
import { MixedNetwork } from '../../ai/Mixed';
import { brainKey } from '../../utilities/groupScores';
import { loadBaseModelsThen, makeSubmitChecker } from '../../ai/serverSync';
import { fileUtilities } from '../../ai/utils';
import { Visualizer } from '../../ai/v2/Visualizer';
import { createAdaptiveDrawBudget } from '../../utilities/adaptiveDraw';
import { layerColor, MIXED_COLOR } from '../../utilities/ai/colors';
import { getColorScale } from '../../utilities/colors';
import {
  createCockpit,
  createSpeedo,
  updateTimingLine,
} from '../../utilities/cockpit';
import { createFrameMeter, isEditableTarget } from '../../utilities/dom';
import { readSeedFromHash, writeSeedToHash } from '../../utilities/urlSeed';
import { drawGamepadControls } from '../../utilities/driveIndicators';
import { createScoreBoard } from '../../utilities/scoreBoard';
import type { GroupActionsOptions } from '../../utilities/groupActions';
import { makeResetBrainSaves } from '../../utilities/resetBrainSaves';
import { createSidePanel } from '../../utilities/sidePanel';
import {
  bestOnSeed,
  globalRecordFromScores,
  scoreRecordForGroup,
} from '../../utilities/scoreRecords';
import { GameLoop } from '../../utilities/three/GameLoop';
import type { Ball } from './classes/Ball';
import { CaveRace } from './classes/CaveRace';
import { ChaseCamera } from './classes/ChaseCamera';
import { config, isDemo } from './classes/Config';
import { SensorViz } from './classes/SensorViz';
import { type defaultState, scoreBoardRows } from './utilities';
import { gameNow } from '../../utilities/gameClock';

type CaveState = typeof defaultState;

const neuralVisualizer = new Visualizer(config);

/** how many per-frame jump samples the action button's history holds */
const JUMP_HISTORY = 80;

/** Screen resolution divisor: 1 keeps the native device pixel ratio, 2 draws
 *  half of it, 4 a quarter. Zero, negatives and garbage fall back to this.
 *  The demo defaults to the lightest quarter so a hosted showcase never
 *  grinds a weak GPU; `?scale=` still overrides either way. */
const DEFAULT_SCREEN_SCALE = isDemo ? 4 : 2;

/** The `?scale=` override, e.g. 1 for native or 4 for the lightest draw. */
function screenScale(scale = DEFAULT_SCREEN_SCALE) {
  return Number.isFinite(scale) && scale > 0 ? scale : DEFAULT_SCREEN_SCALE;
}

const io = fileUtilities('cave', makeSubmitChecker('cave'));
if (config.CLEAR_STORAGE) io.discardModels();
io.compactSaves();

/**
 * A small playable 3D cave. The cave and collision queries are deterministic
 * and streamed by Cave; the AI training pools live in CaveRace, leaving this
 * entry point to coordinate rendering, input and the HUD.
 */
export default async (state: CaveState) => {
  const seed = readSeedFromHash('cave');

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
  // the stage overlays the canvas; the canvas and every HUD element live in
  // it, so they track the canvas edges instead of the viewport
  const stage = document.querySelector<HTMLDivElement>('.game-stage')!;
  stage.appendChild(renderer.domElement);

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

  // Wireframe is opt-in: the V key toggles it for mesh debugging.
  let wireframe = false;

  // ?path=1 draws the path check's validated drivable line (dev overlay)
  const debugPath = new URLSearchParams(location.search).get('path') === '1';

  const race = new CaveRace(state, io, seed, scene, {
    onSeedChanged: (nextSeed) => {
      writeSeedToHash('cave', nextSeed);
      state.cave?.setWireframe(wireframe);
      if (debugPath) state.cave?.debugPath();
    },
  });

  // Top-left board: the shared scoreboard rows (ghosts and live balls, best
  // first). It refreshes on the throttled HUD tick.
  const scoreBoard = createScoreBoard();
  stage.appendChild(scoreBoard.el);

  // ---- side panel: brain follow keys, group actions and the live network
  // visualization ported from the circuit game. ----
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

  const resetBrainSaves = makeResetBrainSaves({
    io,
    game: 'cave',
    mixedLabel: 'the mixed brain',
    layerLabel: (layer) => `brain ${layer}`,
    onReset: (value) => {
      console.info(
        `Reset saved weights of ${value === 0 ? 'all brains' : value}`,
      );
      race.initialize();
      followTarget = undefined;
    },
  });

  // the group of the brain the visualizer is drawing; the "all" readouts
  // report on it
  let displayedGroup: number | 'mixed' | null = null;

  // group actions + trainer readouts, shown while a brain group is followed
  const groupActions: GroupActionsOptions = {
    game: 'cave',
    io,
    label: (v) => (v === 'mixed' ? 'the mixed brain' : `brain ${v}`),
    groupColor: (v) =>
      v === 'mixed'
        ? MIXED_COLOR
        : layerColor(v, config.MAX_NETWORK_LAYERS),
    seedBest: (key) => scoreRecordForGroup('cave', key)?.seed ?? null,
    globalBest: (key) => {
      const record = scoreRecordForGroup('cave', key);
      return record ? globalRecordFromScores(record).globalScore : null;
    },
    resetLocal: resetBrainSaves,
    reinitialize: () => {
      race.initialize();
      followTarget = undefined;
    },
    groups: [1, 2, 3, 4, 5, 6, 7, 8, 9, 'mixed'],
    trainFrom: (v) => {
      const key = v === 'mixed' ? 'mixed' : String(v);
      return race.groups.find((group) => group.key === key)?.trainFrom ?? null;
    },
    setTrainFrom: (v, target) => {
      race.setTrainFrom(v, target);
    },
    teacherScore: (v) => race.teacherScore(v),
    displayedGroup: () => displayedGroup,
  };

  const legend = document.createElement('div');
  legend.className = 'side-panel-legend';
  [
    'Score board',
    '💀 crashed',
    '🏆 crashed with a higher score',
    '💜 ball is racing',
    '💚 ball is leading its group on this cave',
    '👻 cave record, frozen when its holder died',
    '🕹 human ball, WASD/arrows or a DualShock (left stick + A to jump)',
    '🎓 ball is being trained by another brain group (one student, score disqualified)',
    '🎯 the followed ball is drawn solid, the rest fade to 50%',
    '🥅 the next gate ring glows and grows',
    '🪙 a spinning coin adds score and a temporary speed boost',
    '🧭 V toggles the wireframe view',
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

  const frameMeter = createFrameMeter();
  const drawBudget = createAdaptiveDrawBudget(5);

  const info = document.createElement('div');
  info.className = 'side-panel-info';
  info.append(about, legend);

  // the trainer aside: follow buttons, group actions and the brain preview
  const panel = createSidePanel({
    groupActions,
    content: info,
    buttonColor: (v) =>
      typeof v === 'number' && v > 0
        ? layerColor(v, config.MAX_NETWORK_LAYERS)
        : '#c4c4c4',
    initialOpen: !isDemo,
    onFollow: (value) => {
      follow = value;
      // a manual change picks the category leader right away
      followTarget = undefined;
    },
  });
  // the demo profile hides the whole panel instead of starting it collapsed
  if (!isDemo) document.body.appendChild(panel.el);

  // the frame counter anchors to the stage, not the panel; demo hides it too
  if (!isDemo) stage.appendChild(frameMeter.el);

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
  stage.appendChild(position);

  // The cockpit mimics the followed ball, display only
  const cockpit = createCockpit({
    startHidden: false,
    gauge: {
      title:
        'budget remaining to make forward progress into the next cave section',
      ariaLabel: 'Cave section progress budget remaining',
      max: config.SECTION_BUDGET_FRAMES,
    },
  });

  const gateCountEl = document.createElement('div');
  gateCountEl.className = 'laps';
  gateCountEl.title = 'next gate out of the total gates in this cave';
  const gateFramesEl = document.createElement('div');
  gateFramesEl.className = 'frame-count';
  gateFramesEl.title = 'simulation frames since the previous gate';
  const totalFramesEl = document.createElement('div');
  totalFramesEl.className = 'frame-count';
  totalFramesEl.title = 'simulation frames rolled in this cave';

  const gateTiming = cockpit.timingLine(
    'gate',
    'latest completed gate split in simulation frames',
  );
  const finishTiming = cockpit.timingLine(
    'finish',
    'final cave time in simulation frames',
  );
  const timingDeltas = document.createElement('div');
  timingDeltas.className = 'timing-deltas';
  timingDeltas.append(gateTiming.el, finishTiming.el);

  const speedo = createSpeedo();
  cockpit.readout.append(
    gateCountEl,
    gateFramesEl,
    totalFramesEl,
    timingDeltas,
    speedo.el,
  );

  cockpit.el.append(cockpit.stats);
  stage.appendChild(cockpit.el);

  // Base models: server only, written to localStorage. onlyMissing so a
  // visitor's own training is never overwritten; imported brains are picked
  // up by the re-initialize.
  loadBaseModelsThen('cave', io, () => race.initialize());
  // Build the training pools from the saved `cave_` models.
  race.initialize();
  state.cave?.setWireframe(wireframe);
  if (debugPath) state.cave?.debugPath();

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
    const now = gameNow();
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
      running.add(brainKey(ball.brain, ball.brainLayers));
    }
    panel.setRunning(running, state.living > 0);
  }

  /** The 3D viewport and the panel split the window, exactly like the
   *  circuit game. */
  let viewWidth = window.innerWidth;
  function layoutViewport() {
    const next = panel.isOpen()
      ? window.innerWidth - panel.panelWidth()
      : window.innerWidth;
    if (next !== viewWidth) {
      viewWidth = next;
      renderer.setSize(next, window.innerHeight);
      camera.aspect = next / window.innerHeight;
      camera.updateProjectionMatrix();
    }
  }

  const loop = new GameLoop();
  let accumulator = 0;
  loop.play((_elapsed, dt) => {
    // Keep physics, AI and race timers at 60 Hz on every display. Limit
    // catch-up after tab suspension so it cannot spiral into a long frame.
    accumulator = Math.min(accumulator + dt, 5 / 60);
    const now = gameNow();
    while (accumulator >= 1 / 60) {
      accumulator -= 1 / 60;
      race.update(now);
      // one sim frame per fixed step, not per display refresh
      frameMeter.tick(now);
    }

    const balls = state.balls;
    followed = followedBall();
    if (followed !== previousFollowed) {
      previousFollowed = followed;
      jumpSamples.length = 0;
    }

    drawBudget.begin(balls.length);
    const seen = new Set<string>();
    for (const ball of balls) {
      seen.add(ball.label);
      let mesh = ballMeshes.get(ball.label);
      if (!mesh) {
        mesh = makeBallMesh(ball);
        ballMeshes.set(ball.label, mesh);
      }
      updateBallFocusStyle(mesh, ball === followed);
      const keep =
        ball === followed ||
        ball === state.human ||
        ball.brain.mutationIndex === 0;
      const visible =
        !ball.damaged &&
        Math.abs(ball.s - followed.s) < config.VISUAL_RANGE &&
        (keep || drawBudget.consume());
      mesh.visible = visible;
      if (!visible) continue;
      mesh.position.set(ball.x, ball.y, ball.z);
      mesh.quaternion.copy(ball.quat);
    }
    drawBudget.end();
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
    cockpit.show(isFollowedAlive ? followed.color : null);
    if (isFollowedAlive) {
      jumpSamples.push(followed.controls.jumpHeld ? 1 : 0);
      if (jumpSamples.length > JUMP_HISTORY)
        jumpSamples.splice(0, jumpSamples.length - JUMP_HISTORY);
      drawGamepadControls(cockpit.ctx, {
        x: followed.controls.moveX,
        y: followed.controls.moveY,
        color: followed.color,
        action: followed.controls.jumpHeld,
        actionLabel: 'JUMP',
        actionHistory: jumpSamples,
      });
    }

    renderer.render(scene, camera);
    layoutViewport();
    // The human ball has a stub brain, so keep showing the best racing AI
    // while the player drives.
    const visualized = followed.useAI
      ? followed
      : state.balls.find((ball) => ball.useAI && !ball.damaged);
    if (visualized?.brain) {
      displayedGroup =
        visualized.brain instanceof MixedNetwork
          ? 'mixed'
          : visualized.brainLayers;
    }
    if (panel.isOpen() && visualized?.brain)
      neuralVisualizer.renderNetwork(
        panel.network().ctx,
        visualized.brain,
        visualized.teacher,
        visualized.distillErrors,
      );
    // the loss graph follows the student's distiller, null outside a run
    panel.groupPanel.drawLossGraph(visualized?.distiller?.lossHistory ?? null);
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
      race.refreshLeaderboard();
      scoreBoard.update(
        {
          text: `${state.living}/${state.balls.length} balls`,
          color: getColorScale(
            Math.min(1, state.living / Math.max(1, state.balls.length)),
          ),
        },
        scoreBoardRows(state),
      );
      if (!isFollowedAlive) return;
      const gateNumber = Math.min(followed.nextGate + 1, config.GATES_PER_SEED);
      gateCountEl.textContent = `gate ${gateNumber}/${config.GATES_PER_SEED}`;
      gateFramesEl.textContent = `gate ${followed.framesSinceLastGate}f`;
      totalFramesEl.textContent = `total ${followed.totalRaceFrames}f`;
      speedo.set(followed.speed);

      gateTiming.label.textContent =
        followed.completedGateIndex < 0
          ? 'gate'
          : `gate${followed.completedGateIndex + 1}`;
      updateTimingLine(
        gateTiming,
        followed.completedGateIndex < 0 ? null : followed.completedGateFrames,
        null,
      );
      updateTimingLine(
        finishTiming,
        followed.lastFinishFrames > 0 ? followed.lastFinishFrames : null,
        null,
      );

      cockpit.gauge.set(
        followed.sectionFramesRemaining / config.SECTION_BUDGET_FRAMES,
        followed.sectionFramesRemaining,
      );

      // the group's live score store, so a mixed ball reads the mixed record
      const followedGroup = race.groups.find(
        (group) => group.key === brainKey(followed.brain, followed.brainLayers),
      );
      const previousBest = bestOnSeed(followedGroup?.scores ?? null, race.seed);
      const bestScore = previousBest === null ? '—' : Math.round(previousBest);
      const mutation =
        followed.brain.mutationIndex === 0
          ? 'Original model'
          : `Mut ${(followed.brain.mutationFactor * 100).toFixed(4)}%`;
      cockpit.setStats([
        `Net ${followed.brain.id}`,
        mutation,
        `Score ${Math.round(followed.brain.score)}`,
        `Best ${bestScore}`,
      ]);
    }
  });

  window.addEventListener('resize', () => {
    // force layoutViewport to reapply the split at the new window size
    viewWidth = -1;
    layoutViewport();
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyV' || event.key.toLowerCase() === 'v') {
      if (event.repeat || event.isComposing) return;
      if (isEditableTarget(event.target)) return;
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
