import { MixedNetwork } from '../../ai/Mixed';
import { brainKey } from '../../utilities/groupScores';
import type { NeuralNetwork } from '../../ai/Network';
import {
  beginUnload,
  loadBaseModels,
  loadBaseModelsThen,
  makeSubmitChecker,
} from '../../ai/serverSync';
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
import {
  createCanvas,
  createFrameMeter,
  createLegend,
  createUpdateLimiter,
  resizeCanvas,
} from '../../utilities/dom';
import { createScoreBoard } from '../../utilities/scoreBoard';
import type { GroupActionsOptions } from '../../utilities/groupActions';
import { makeResetBrainSaves } from '../../utilities/resetBrainSaves';
import { createSidePanel } from '../../utilities/sidePanel';
import {
  globalRecordFromScores,
  scoreRecordForGroup,
} from '../../utilities/scoreRecords';
import { GameLoop } from '../../utilities/three/GameLoop';
import { readSeedFromHash, writeSeedToHash } from '../../utilities/urlSeed';
import type { Car } from './classes/Car';
import { CircuitRace } from './classes/CircuitRace';
import { config, isDemo } from './classes/Config';
import { drawGamepadControls } from '../../utilities/driveIndicators';
import { TimingBoard } from './ui/TimingBoard';
import { TrackScoreBoard } from './ui/TrackScoreBoard';
import {
  brainId,
  scoreBoardRows,
  type defaultState,
  globalRecordForGroup,
} from './utilities';
import { gameNow } from '../../utilities/gameClock';

const neuralVisualizer = new Visualizer(config);

const io = fileUtilities(
  'circuit',
  makeSubmitChecker('circuit', { globalScore: globalRecordForGroup }),
);
if (config.CLEAR_STORAGE) io.discardModels();
io.compactSaves();

/** Base models: the best community submissions from the server. */
async function loadDefaultModels(onlyMissing = false): Promise<string[]> {
  const { written } = await loadBaseModels('circuit', io, onlyMissing);
  return written;
}

/** world-space distance ahead of the car in forced follow mode */
const CAMERA_AHEAD_DISTANCE = 200;

export default async (state: typeof defaultState) => {
  // the stage overlays the canvas; the canvas and every HUD element live in
  // it, so they track the canvas edges instead of the viewport
  const stage = document.querySelector<HTMLDivElement>('.game-stage')!;
  const carCanvas = createCanvas();
  stage.appendChild(carCanvas);

  const carCtx = carCanvas.getContext('2d');

  /** 0 follows the best score overall, 1-9 the best car of that brain layer */
  let follow: number | 'mixed' = 0;
  /** manual/player follow enables the rotating, ahead-of-car camera mode */
  let followForced = false;
  /** world x/y mapped to the screen center, lerps so target switches animate */
  let camX = 0;
  let camY = 0;
  let camAngle = 0;
  let camAngleSet = false;
  let camSet = false;

  // driving the human car takes the camera; it gives it back on a crash or
  // a manual follow change
  let humanFollow = false;
  /** the AI car the camera currently tracks and when it took it; a new
   *  leader only takes over past FOLLOW_SWITCH_SCORE_GAP or once
   *  FOLLOW_SWITCH_MIN_MS have elapsed, so a close duel stops flickering */
  let followTarget: Car | undefined;
  let followTargetSince = 0;
  const FOLLOW_SWITCH_SCORE_GAP = 5;
  const FOLLOW_SWITCH_MIN_MS = 5_000;
  /** keep the just-finished focus long enough for its timing row to be read */
  const FINISH_FOCUS_MS = 3_000;
  let humanDriving = false;
  let lastCountdownTenths = -1;

  const setFollow = (value: number | 'mixed', forced = true) => {
    follow = value;
    followForced = forced;
    humanFollow = false;
    // a manual change picks the category leader right away
    followTarget = undefined;
  };

  const resetBrainSaves = makeResetBrainSaves({
    io,
    game: 'circuit',
    mixedLabel: 'the mixed brain',
    layerLabel: (layer) => brainId(layer),
    onReset: (value) => {
      console.info(
        `Reset saved weights of ${value === 0 ? 'all brains' : value}`,
      );
      if (value === 0) race.initialize();
      else {
        race.resetBrainGroup(value);
        camSet = false;
        followTarget = undefined;
        lastFollowed = undefined;
      }
    },
  });

  // the race is built further down, but the group-action callbacks above are
  // already wired to it: keep the binding assignable so they can no-op until
  // it exists
  let race: CircuitRace;

  // the group of the brain the visualizer is drawing; the "all" readouts
  // report on it
  let displayedGroup: number | 'mixed' | null = null;

  // group actions + trainer readouts, shown while a brain group is followed
  const groupActions: GroupActionsOptions = {
    game: 'circuit',
    io,
    label: (v) => (v === 'mixed' ? 'the mixed brain' : `brain ${v}`),
    groupColor: (v) =>
      v === 'mixed'
        ? MIXED_COLOR
        : layerColor(v, config.MAX_NETWORK_LAYERS),
    seedBest: (key) => scoreRecordForGroup('circuit', key)?.seed ?? null,
    globalBest: (key) => {
      const record = scoreRecordForGroup('circuit', key);
      return record ? globalRecordFromScores(record).globalScore : null;
    },
    resetLocal: resetBrainSaves,
    reinitialize: () => race?.initialize(),
    groups: [1, 2, 3, 4, 5, 6, 7, 8, 9, 'mixed'],
    trainFrom: (v) => {
      if (!race) return null;
      const key = v === 'mixed' ? 'mixed' : String(v);
      return race.groups.find((group) => group.key === key)?.trainFrom ?? null;
    },
    setTrainFrom: (v, target) => {
      race?.setTrainFrom(v, target);
    },
    teacherScore: (v) => (race ? race.teacherScore(v) : null),
    displayedGroup: () => displayedGroup,
  };

  const legend = createLegend([
    'Score board',
    '💀 crashed, fades out over 3s from 50% opacity',
    '🏆 crashed with a higher score',
    '💜 car is racing',
    '💚 car is leading its group on this track',
    '👻 track record, frozen when its holder died',
    '🕹 human car, driven with arrows/WASD or a DualShock (left stick + L2/R2)',
    '🧭 ` follows the mixed brain',
    '🎓 car is being trained by another brain group (one student, score disqualified)',
    '🏁 next checkpoint glows',
    '🚧 gray obstacle (circle or wall)',
  ]);

  const about = document.createElement('div');
  about.className = 'side-panel-about';
  about.textContent = `It's a competition between ${config.MAX_NETWORK_LAYERS} different brain designs, plus a brain trained to hot-swap the proper one given the road situation of each frame (the mixed brain). They can all be visualized, and you can play against them to compete, or follow / tweak a specific architecture. Each time an instance of a neural network completes ${config.LAPS_PER_SEED} laps, the map is regenerated to a random configuration; each seed keeps its former score as a HUD reference, but every generated track starts a fresh record so mutated brains have a reachable goal, and groups that have finished a track are never retrained on it. Finishing a track pays a large one-time bonus, so brains are selected for completing the map, not for being fast on one known track; the last car of a pool is a fresh random explorer while the group is still finding its feet (under 2 laps on the map) and a regular mutation car once it is proven, and a scout re-runs the group's oldest saved line, so the population can never fully converge on one overfit brain.`;

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
    onFollow: (value, origin) => {
      // the keyboard "all" keeps the fixed world camera, every other manual
      // pick switches to the car-up camera
      setFollow(value, origin !== 'key' || value !== 0);
    },
  });
  // the demo profile hides the whole panel instead of starting it collapsed
  if (!isDemo) document.body.appendChild(panel.el);

  // The cockpit mimics the followed car, display only.
  const cockpit = createCockpit({
    gauge: {
      title: 'checkpoint frames remaining for the followed car',
      ariaLabel: 'Checkpoint frames remaining',
      max: config.CHECKPOINT_BUDGET_FRAMES,
    },
  });
  // the race, laps and speed readouts sit together, race on top, laps just
  // above the speed
  const lapsEl = document.createElement('div');
  lapsEl.className = 'laps';
  lapsEl.title = 'laps on this map';
  lapsEl.textContent = `lap 0/${config.LAPS_PER_SEED}`;
  const lapFramesEl = document.createElement('div');
  lapFramesEl.className = 'frame-count';
  lapFramesEl.title = 'simulation frames on the current lap';
  lapFramesEl.textContent = 'lap 0f';
  const totalFramesEl = document.createElement('div');
  totalFramesEl.className = 'frame-count';
  totalFramesEl.title = 'simulation frames on this map';
  totalFramesEl.textContent = 'total 0f';

  const checkpointTiming = cockpit.timingLine(
    'cp',
    'latest checkpoint split in simulation frames; delta is against the track best',
  );
  const lapTiming = cockpit.timingLine(
    'lap',
    'latest completed lap in simulation frames; delta is against the track best',
  );
  const finishTiming = cockpit.timingLine(
    'finish',
    'final race time in simulation frames; delta is against the track best',
  );
  const timingDeltas = document.createElement('div');
  timingDeltas.className = 'timing-deltas';
  timingDeltas.append(checkpointTiming.el, lapTiming.el, finishTiming.el);
  const finishCountdown = document.createElement('div');
  finishCountdown.className = 'finish-countdown';
  finishCountdown.style.color = 'red';
  finishCountdown.hidden = true;
  const raceEndCountdown = document.createElement('div');
  raceEndCountdown.className = 'race-end-countdown';
  raceEndCountdown.setAttribute('role', 'status');
  raceEndCountdown.setAttribute('aria-live', 'polite');
  raceEndCountdown.hidden = true;
  stage.appendChild(raceEndCountdown);
  const speedo = createSpeedo();
  cockpit.readout.append(
    finishCountdown,
    lapsEl,
    lapFramesEl,
    totalFramesEl,
    timingDeltas,
    speedo.el,
  );
  // The network stays in the sidebar, but its stats travel with the in-game
  // cockpit as inline text after the readout, visible when the panel is closed.
  cockpit.el.append(cockpit.stats);
  stage.appendChild(cockpit.el);

  let lastFollowed: Car | undefined;
  // The loop's first tick is eager, so every state it reads must exist by then.
  const shouldUpdateDom = createUpdateLimiter(20);

  // the frame counter anchors to the stage, not the panel; demo hides both
  if (!isDemo) stage.appendChild(frameMeter.el);

  const loop = new GameLoop();

  /** The race owns simulation state; this function coordinates browser UI. */
  const seed = readSeedFromHash('circuit');
  writeSeedToHash('circuit', seed);

  const humanCelebration = document.createElement('div');
  humanCelebration.className = 'human-celebration';
  humanCelebration.setAttribute('role', 'status');
  humanCelebration.setAttribute('aria-live', 'polite');
  humanCelebration.textContent = '🎉 CONGRATZ! YOU FINISHED FIRST! 🎉';
  humanCelebration.hidden = true;
  stage.appendChild(humanCelebration);

  let humanCelebrationTimer = 0;
  const showHumanCelebration = () => {
    if (humanCelebrationTimer) window.clearTimeout(humanCelebrationTimer);
    humanCelebration.hidden = false;
    humanCelebration.classList.add('visible');
    humanCelebrationTimer = window.setTimeout(() => {
      humanCelebration.hidden = true;
      humanCelebration.classList.remove('visible');
      humanCelebrationTimer = 0;
    }, 6_000);
  };
  const hideHumanCelebration = () => {
    if (humanCelebrationTimer) window.clearTimeout(humanCelebrationTimer);
    humanCelebrationTimer = 0;
    humanCelebration.hidden = true;
    humanCelebration.classList.remove('visible');
  };

  race = new CircuitRace(state, io, seed, {
    onReset: () => {
      camSet = false;
      followTarget = undefined;
      lastFollowed = undefined;
    },
    onHumanCrash: () => {
      humanFollow = false;
      humanDriving = false;
    },
    onHumanFinish: showHumanCelebration,
    onSeedChanged: (nextSeed) => {
      writeSeedToHash('circuit', nextSeed);
      timingBoard.setSeed(nextSeed);
      hideHumanCelebration();
      finishCountdown.hidden = true;
      raceEndCountdown.hidden = true;
      camSet = false;
    },
  });

  // The map selector stays in the top-left HUD so it remains available while
  // the model panel is closed. Buttons apply immediately and update the hash.
  const seedControls = document.createElement('div');
  seedControls.className = 'seed-controls';
  const previousSeed = document.createElement('button');
  previousSeed.type = 'button';
  previousSeed.textContent = '<';
  previousSeed.title = 'Previous map';
  previousSeed.onclick = () => race.applyUserSeed(Math.max(0, race.seed - 1));
  const nextSeed = document.createElement('button');
  nextSeed.type = 'button';
  nextSeed.textContent = '>';
  nextSeed.title = 'Next map';
  nextSeed.onclick = () => race.applyUserSeed(race.seed + 1);
  seedControls.append(previousSeed, nextSeed);

  const timingBoard = new TimingBoard(
    race.groups,
    race.completedFinishes,
    race.seed,
    () => state.human,
  );
  timingBoard.appendHeaderControl(seedControls);
  const trackScoreBoard = new TrackScoreBoard(race.groups);
  const topRightHud = document.createElement('div');
  topRightHud.className = 'top-right-hud';
  // Keep global scores in the upper slot and the current race beneath it.
  topRightHud.append(trackScoreBoard.element, timingBoard.element);
  stage.appendChild(topRightHud);
  // the shared live scoreboard: a DOM board at the stage's left edge
  const scoreBoard = createScoreBoard();
  stage.appendChild(scoreBoard.el);
  const runningCategories = new Set<string>();
  if (isDemo) {
    try {
      const written = await loadDefaultModels(true);
      if (written.length)
        console.info(`Loaded default models: ${written.join(', ')}`);
    } catch (err) {
      console.warn('Unable to load default circuit models', err);
    }
  }
  // Base models: server only, written to localStorage. onlyMissing so a
  // visitor's own training is never overwritten; imported brains are picked
  // up by the re-initialize. (The ?demo=true block above already loads them.)
  if (!isDemo) loadBaseModelsThen('circuit', io, () => race.initialize());
  race.initialize();
  timingBoard.update();
  trackScoreBoard.update(race.seed);
  // paint the button states before the first frame, they load with their colors
  updateFollowButtons();

  loop.play(
    (_es, _dt, paused) => {
      const now = gameNow();
      if (!paused) frameMeter.tick(now);
      // the simulation freezes while paused, but the camera and the render
      // below keep updating on the frozen scene
      if (state.playing && !paused) {
        race.update(now);

        // The first drive input takes the camera to the human car.
        const h = state.human;
        const driving =
          !!h &&
          (h.controls.throttle !== 0 ||
            h.controls.left !== 0 ||
            h.controls.right !== 0);
        if (driving && !humanDriving) humanFollow = true;
        humanDriving = driving;
      }

      // The simulation and canvases can run at their normal frame rate, but
      // all HUD and other DOM writes share a 20 FPS budget.
      const domUpdateDue = shouldUpdateDom(now);
      if (domUpdateDue) {
        race.refreshLeaderboard();
        timingBoard.update();
        trackScoreBoard.update(race.seed);
        scoreBoard.update(
          {
            text: `${state.living}/${state.population} cars`,
            color: getColorScale(
              Math.min(1, state.living / Math.max(1, state.population)),
            ),
          },
          scoreBoardRows(state),
        );
        updateFollowButtons();
        if (race.seedChangeAt) {
          const remaining = Math.max(0, race.seedChangeAt - now);
          finishCountdown.hidden = false;
          const humanInControl =
            humanFollow && !!state.human && !state.human.damaged;
          finishCountdown.hidden = humanInControl;
          raceEndCountdown.hidden = !humanInControl;
          // the label changes at most once per tenth of a second
          const tenths = Math.floor(remaining / 100);
          const seconds = (tenths / 10).toFixed(1);
          if (tenths !== lastCountdownTenths) {
            lastCountdownTenths = tenths;
            finishCountdown.textContent = `next track in ${seconds}s`;
          }
          if (humanInControl) {
            raceEndCountdown.textContent = `${seconds}s remaining`;
            hideHumanCelebration();
          }
        } else {
          raceEndCountdown.hidden = true;
        }
      }

      // the car canvas keeps whatever width the open panel leaves
      const carWidth = panel.isOpen()
        ? window.innerWidth - panel.panelWidth()
        : window.innerWidth;
      resizeCanvas(carCanvas, carCtx, carWidth, window.innerHeight);
      const camTarget = followedCar();
      const carUpFollow = followForced || humanFollow;
      const targetCameraAngle =
        carUpFollow && camTarget
          ? camTarget.vx !== 0 || camTarget.vy !== 0
            ? Math.atan2(-camTarget.vx, -camTarget.vy)
            : camTarget.angle
          : 0;
      if (state.playing && race.seedChangeAt && !camTarget) {
        const spawn = race.circuit.getSpawn();
        camX = spawn.x;
        camY = spawn.y;
        camSet = true;
      } else if (state.playing && camTarget) {
        // Displace the camera along the car's current world-space direction;
        // the view rotation is applied afterward and can lerp independently.
        const followX = carUpFollow
          ? camTarget.x - Math.sin(targetCameraAngle) * CAMERA_AHEAD_DISTANCE
          : camTarget.x - 2 * camTarget.vx;
        const followY = carUpFollow
          ? camTarget.y - Math.cos(targetCameraAngle) * CAMERA_AHEAD_DISTANCE
          : camTarget.y - 2 * camTarget.vy;
        if (!camSet) {
          camX = followX;
          camY = followY;
          camSet = true;
        }
        // Keep the camera ahead of the car in car-up mode so more of the
        // upcoming track is visible. In fixed-world mode, the small velocity
        // lead keeps the target visually centered.
        camX += (followX - camX) * 0.1;
        camY += (followY - camY) * 0.1;
      }
      if (carUpFollow && camTarget) {
        if (!camAngleSet) {
          camAngle = targetCameraAngle;
          camAngleSet = true;
        } else {
          // Interpolate over the shortest arc so the camera never snaps at π.
          const delta = Math.atan2(
            Math.sin(targetCameraAngle - camAngle),
            Math.cos(targetCameraAngle - camAngle),
          );
          camAngle += delta * 0.1;
        }
      } else {
        camAngle = 0;
        camAngleSet = false;
      }
      const cameraAngle = camAngle;
      // the controls mimic the followed car, hidden while it is dead
      if (domUpdateDue) {
        cockpit.show(
          camTarget && !lastFollowed?.damaged ? camTarget.color : null,
        );
      }
      if (camTarget) {
        const c = camTarget.controls;
        drawGamepadControls(cockpit.ctx, {
          x: c.right - c.left,
          y: c.throttle,
          color: camTarget.color,
        });
        if (domUpdateDue) {
          speedo.set(Math.hypot(camTarget.vx, camTarget.vy));
          lapsEl.textContent = `lap ${Math.min(
            camTarget.laps + 1,
            config.LAPS_PER_SEED,
          )}/${config.LAPS_PER_SEED}`;
          lapFramesEl.textContent = `lap ${camTarget.framesSinceLapStart}f`;
          totalFramesEl.textContent = `total ${
            camTarget.totalRaceFrames + camTarget.framesSinceLapStart
          }f`;
          updateFocusedTiming(camTarget);
          cockpit.gauge.set(
            camTarget.checkpointFramesRemaining /
              config.CHECKPOINT_BUDGET_FRAMES,
            camTarget.checkpointFramesRemaining,
          );
        }
      }
      lastFollowed = camTarget;
      carCtx.save();
      // Paint the screen-space background before rotating the world, otherwise
      // the corners of a rotated viewport can expose the old frame.
      carCtx.fillStyle = config.PLANE_COLOR;
      carCtx.fillRect(0, 0, carCanvas.width, carCanvas.height);
      carCtx.translate(carCanvas.width / 2, carCanvas.height / 2);
      carCtx.rotate(cameraAngle);
      carCtx.translate(-camX, -camY);

      race.circuit.draw(carCtx);
      const nextCheckpoint = camTarget
        ? race.circuit.checkpoints[camTarget.nextCheckpoint]
        : undefined;
      // Compute the world view box once up front: checkpoints and obstacles
      // are culled against it, and the car loop below reuses the same bounds.
      // A rotated screen rectangle has a larger axis-aligned world bounding
      // box, so keep the margin conservative so geometry never pops at corners.
      const viewMargin = 50;
      const sinCamera = Math.abs(Math.sin(cameraAngle));
      const cosCamera = Math.abs(Math.cos(cameraAngle));
      const viewHalfWidth =
        (carCanvas.width * cosCamera + carCanvas.height * sinCamera) / 2;
      const viewHalfHeight =
        (carCanvas.width * sinCamera + carCanvas.height * cosCamera) / 2;
      const viewMinX = camX - viewHalfWidth - viewMargin;
      const viewMaxX = camX + viewHalfWidth + viewMargin;
      const viewMinY = camY - viewHalfHeight - viewMargin;
      const viewMaxY = camY + viewHalfHeight + viewMargin;
      for (let i = 0; i < race.circuit.checkpoints.length; i++) {
        const checkpoint = race.circuit.checkpoints[i];
        if (
          checkpoint.maxX < viewMinX ||
          checkpoint.minX > viewMaxX ||
          checkpoint.maxY < viewMinY ||
          checkpoint.minY > viewMaxY
        )
          continue;
        checkpoint.draw(carCtx, checkpoint === nextCheckpoint);
      }
      for (let i = 0; i < race.circuit.obstacles.length; i++) {
        const obstacle = race.circuit.obstacles[i];
        const aabb = obstacle.aabb;
        if (
          aabb.maxX < viewMinX ||
          aabb.minX > viewMaxX ||
          aabb.maxY < viewMinY ||
          aabb.minY > viewMaxY
        )
          continue;
        obstacle.draw(carCtx);
      }
      // Show the predictive collision radius only when the followed car's
      // current sensor fan can see the moving obstacle.
      const followedSensor = camTarget?.sensor;
      if (followedSensor) {
        for (const obstacle of race.circuit.obstacles) {
          if (
            obstacle.type !== 'moving' ||
            !followedSensor.isObstacleInView(obstacle)
          ) {
            continue;
          }
          const distance = Math.hypot(
            obstacle.x - followedSensor.car.x,
            obstacle.y - followedSensor.car.y,
          );
          obstacle.drawCollisionRadius(carCtx, distance);
        }
      }
      // the human car draws last, above every other car, no sensor fan
      const corpseNow = gameNow();
      drawBudget.begin(state.cars.length);
      for (let i = 0; i < state.cars.length; i++) {
        const car = state.cars[i];
        if (car === state.human) continue;
        const keep = car === camTarget || car.brain.mutationIndex === 0;
        const box = car.aabb;
        if (
          !keep &&
          (box.maxX < viewMinX ||
            box.minX > viewMaxX ||
            box.maxY < viewMinY ||
            box.minY > viewMaxY ||
            !drawBudget.consume())
        )
          continue;
        if (car.damaged) {
          // fade from 50% opacity to 0 over DEAD_LIFETIME
          carCtx.globalAlpha =
            0.5 *
            Math.max(0, 1 - (corpseNow - car.deathTime) / config.DEAD_LIFETIME);
        } else {
          carCtx.globalAlpha = i === 0 || !car.useAI ? 1 : 0.3;
        }
        car.draw(carCtx, car === camTarget);
      }
      drawBudget.end();
      if (state.human) {
        carCtx.globalAlpha = 1;
        state.human.draw(carCtx, false);
      }
      carCtx.globalAlpha = 1;

      carCtx.restore();

      const followed = camTarget?.brain;
      if (panel.isOpen() && followed) {
        displayedGroup =
          followed instanceof MixedNetwork
            ? 'mixed'
            : camTarget?.brainLayers ?? null;
        // a distilling car shows its brain next to its teacher, with the live
        // training error on the controls
        neuralVisualizer.renderNetwork(
          panel.network().ctx,
          followed,
          camTarget?.teacher ?? null,
          camTarget?.distillErrors ?? null,
        );
      }
      // the loss graph follows the student's distiller, null outside a run
      panel.groupPanel.drawLossGraph(camTarget?.distiller?.lossHistory ?? null);
      // The KeyS shortcut toggles the stats, now an inline DOM block in the cockpit.
      if (domUpdateDue) {
        const statsOn = neuralVisualizer.renderStats;
        cockpit.stats.classList.toggle('hidden', !statsOn || !followed);
        if (statsOn && followed && camTarget)
          updateBrainStats(followed, camTarget);
      }
    },
    {
      maxFps: config.HUMAN_FPS_CAP,
      shouldCap: () => config.HUMAN_FPS_CAP_ENABLED && humanFollow,
    },
  );

  /** car buttons stay filled with their car color while the category
   *  races, and turn to an outline once its last car is dead */
  function updateFollowButtons() {
    // one pass fills every category at once instead of one scan per button
    runningCategories.clear();
    for (const car of state.cars) {
      if (car.damaged) continue;
      runningCategories.add(brainKey(car.brain, car.brainLayers));
    }
    panel.setRunning(runningCategories, state.living > 0);
  }

  function followedCar(): Car | undefined {
    // During the map transition, keep the player-controlled car in view;
    // otherwise the normal camera rests at the next map's spawn point.
    if (race.seedChangeAt) {
      if (humanFollow && state.human && !state.human.damaged)
        return state.human;
      return undefined;
    }
    const now = gameNow();
    const freshFinish = (car: Car) =>
      car.finished &&
      car.completedLapAt > 0 &&
      now - car.completedLapAt < FINISH_FOCUS_MS;
    if (
      humanFollow &&
      state.human &&
      !state.human.damaged &&
      (!state.human.finished || freshFinish(state.human))
    )
      return state.human;
    const inCategory = (car: Car) =>
      !car.damaged &&
      !car.finished &&
      (follow === 'mixed'
        ? car.brain instanceof MixedNetwork
        : follow > 0
        ? car.brainLayers === follow && !(car.brain instanceof MixedNetwork)
        : true);
    // the leaderboard sort runs on HUD ticks only, so the camera target
    // resolves the leader with a single max-score scan
    let leader: Car | undefined;
    for (const car of state.cars) {
      if (inCategory(car) && (!leader || car.brain.score > leader.brain.score))
        leader = car;
    }
    if (!leader) {
      for (const car of state.cars) {
        if (!car.damaged && !car.finished) {
          leader = car;
          break;
        }
      }
    }
    const current = followTarget;
    // Let the just-finished target remain focused briefly so its final timing
    // and delta are visible before the camera picks another racer.
    if (current && !current.damaged && freshFinish(current)) return current;
    if (
      current &&
      current !== leader &&
      leader &&
      state.cars.includes(current) &&
      inCategory(current) &&
      leader.brain.score - current.brain.score <= FOLLOW_SWITCH_SCORE_GAP &&
      now - followTargetSince < FOLLOW_SWITCH_MIN_MS
    ) {
      return current;
    }
    if (leader !== current) {
      followTarget = leader;
      followTargetSince = now;
    }
    return leader;
  }

  /** Rebuild the inline stats block of the followed brain; the DOM is only
   *  touched when the rendered text changes, so a steady frame is cheap. */
  function updateFocusedTiming(car: Car) {
    checkpointTiming.label.textContent =
      car.lastCheckpointIndex < 0 ? 'cp' : `cp${car.lastCheckpointIndex + 1}`;
    updateTimingLine(
      checkpointTiming,
      car.lastCheckpointIndex < 0 ? null : car.lastCheckpointFrames,
      car.lastCheckpointIndex < 0 ? null : car.lastCheckpointDelta,
    );
    updateTimingLine(
      lapTiming,
      car.laps < 1 ? null : car.completedLapFrames,
      car.laps < 1 ? null : car.lastLapDelta,
    );
    updateTimingLine(
      finishTiming,
      car.lastFinishFrames > 0 ? car.lastFinishFrames : null,
      car.lastFinishFrames > 0 ? car.lastFinishDelta : null,
    );
  }

  function updateBrainStats(network: NeuralNetwork, car: Car) {
    const mixed = network instanceof MixedNetwork;
    // Former record on this exact seed, from earlier visits to the track: the
    // live score of the current race is `scores.seed`, history is per seed.
    const groupKey = mixed ? 'mixed' : String(car.brainLayers);
    const group = race.groups.find((candidate) => candidate.key === groupKey);
    const previousBest = group?.scores.history[String(race.seed)];
    const best =
      typeof previousBest === 'number' && previousBest > 0
        ? Math.round(previousBest)
        : '—';
    const mutation =
      network.mutationIndex === 0
        ? 'Original model'
        : `Mut ${(network.mutationFactor * 100).toFixed(4)}%`;
    const lines = [
      `Net ${network.id}`,
      mutation,
      `Score ${Math.round(network.score)}`,
      `Best ${best}`,
    ];
    cockpit.setStats(lines);
  }

  // A reload never loses more than the most recent promotions, and the
  // models those last saves promote go straight to the server on a
  // sendBeacon instead of dying in the in-flight fetch chain.
  window.addEventListener('beforeunload', () => {
    beginUnload();
    race.saveAll();
  });
};
