import { MIXED_LEVELS, MixedNetwork } from '../../ai/Mixed';
import type { NeuralNetwork } from '../../ai/Network';
import { loadBaseModels, makeSubmitChecker } from '../../ai/serverSync';
import { fileUtilities } from '../../ai/utils';
import { Visualizer } from '../../ai/v2/Visualizer';
import { layerColor } from '../../utilities/ai/colors';
import { getColorScale } from '../../utilities/colors';
import { createCockpit } from '../../utilities/cockpit';
import { drawGamepadControls } from '../../utilities/driveIndicators';
import { createScoreBoard } from '../../utilities/scoreBoard';
import type { GroupActionsOptions } from '../../utilities/groupActions';
import {
  createCanvas,
  createFrameMeter,
  createUpdateLimiter,
  isEditableTarget,
  resizeCanvas,
} from '../../utilities/dom';
import { createSidePanel } from '../../utilities/sidePanel';
import {
  globalRecordFromScores,
  scoreRecordForGroup,
} from '../../utilities/scoreRecords';
import { GameLoop } from '../../utilities/three/GameLoop';
import { CAMERA_LERP, climbCameraCenterY } from './camera';
import { ClimbRace } from './classes/ClimbRace';
import { config, isDemo } from './classes/Config';
import type { Player } from './classes/Player';
import { brainId, scoreBoardRows, type defaultState } from './utilities';
import { gameNow } from '../../utilities/gameClock';

const neuralVisualizer = new Visualizer(config);

const io = fileUtilities('climb', makeSubmitChecker('climb'));
if (config.CLEAR_STORAGE) io.discardModels();
io.compactSaves();

/** world height visible on screen at the reference scale */
const VIEW_HEIGHT = 420;
/** how many per-frame jump samples the action button's history holds */
const JUMP_HISTORY = 80;

export default async (state: typeof defaultState) => {
  // the stage overlays the canvas; the canvas and every HUD element live in
  // it, so they track the canvas edges instead of the viewport
  const stage = document.querySelector<HTMLDivElement>('.game-stage')!;
  const gameCanvas = createCanvas();
  stage.appendChild(gameCanvas);

  const gameCtx = gameCanvas.getContext('2d');

  /** 0 follows the best score overall, 1-9 the best climber of that brain
   *  layer, 'mixed' the mix */
  let follow: number | 'mixed' = 0;
  /** driving the human player takes the camera; it gives it back on a crash
   *  or a manual follow change */
  let humanFollow = false;
  let camSet = false;

  const resetBrainSaves = (value: number | 'mixed') => {
    if (value === 0) {
      if (!confirm('Reset all the saved climb weights?')) return;
      io.discardGameModels();
      console.info('Reset saved weights of all brains');
      race.initialize();
    } else if (value === 'mixed') {
      if (!confirm(`Reset the saved weights of ${brainId(0, undefined)}?`))
        return;
      io.discardModel(MIXED_LEVELS, 'mixed');
    } else {
      if (!confirm(`Reset the saved weights of ${brainId(value, undefined)}?`))
        return;
      io.discardModel(value);
      // the mixed selector's output width and expert slots are pinned to the
      // saved brains it routes to, so dropping one invalidates its routing
      io.discardModel(MIXED_LEVELS, 'mixed');
    }
    race.resetBrainGroup(value);
  };

  // the group of the brain the visualizer is drawing; the "all" readouts
  // report on it
  let displayedGroup: number | 'mixed' | null = null;

  // group actions + trainer readouts, shown while a brain group is followed
  const groupActions: GroupActionsOptions = {
    game: 'climb',
    io,
    label: (v) => (v === 'mixed' ? 'the mixed brain' : `brain ${v}`),
    groupColor: (v) =>
      v === 'mixed'
        ? config.MIXED_COLOR
        : layerColor(v, config.MAX_NETWORK_LAYERS),
    seedBest: (key) => scoreRecordForGroup('climb', key)?.seed ?? null,
    globalBest: (key) => {
      const record = scoreRecordForGroup('climb', key);
      return record ? globalRecordFromScores(record).globalScore : null;
    },
    resetLocal: resetBrainSaves,
    reinitialize: () => race.initialize(),
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

  const about = document.createElement('div');
  about.className = 'side-panel-about';
  about.textContent =
    'Climb: a seeded Icy Tower-style tower. Every brain line climbs the same ' +
    'tower at once; a line that banks floors saves its brain, and when enough ' +
    'lines hold the seed target the tower gets harder. Arrows / WASD move, ' +
    'Space or the gamepad primary button jumps. 1-9 and ` follow a line, ' +
    '0 the best climber, R jumps to a random seed, < and > step the seed.';

  const frameMeter = createFrameMeter();

  // the trainer aside: follow buttons, group actions and the brain preview
  const panel = createSidePanel({
    groupActions,
    content: about,
    buttonColor: (v) =>
      v === 'mixed'
        ? config.MIXED_COLOR
        : v === 0
          ? '#c4c4c4'
          : layerColor(v, config.MAX_NETWORK_LAYERS),
    initialOpen: !isDemo,
    onFollow: (value) => {
      follow = value;
      humanFollow = false;
    },
  });
  // the demo profile hides the whole panel instead of starting it collapsed
  if (!isDemo) document.body.appendChild(panel.el);

  // the frame counter anchors to the stage, not the panel; demo hides it too
  if (!isDemo) stage.appendChild(frameMeter.el);

  // The cockpit mimics the followed climber, display only
  const cockpit = createCockpit({
    gauge: {
      title:
        'height frames remaining before the height budget kills the followed climber',
      ariaLabel: 'Height budget remaining',
      max: config.HEIGHT_BUDGET_FRAMES,
    },
  });
  const jumpSamples: number[] = [];

  const floorEl = document.createElement('div');
  floorEl.className = 'laps';
  floorEl.title = 'floors of personal-best height on this seed';
  floorEl.textContent = 'floor 0';
  const comboEl = document.createElement('div');
  comboEl.className = 'combo-indicator';
  comboEl.title = 'landing and wall-bounce combo';
  comboEl.hidden = true;
  const seedCountdown = document.createElement('div');
  seedCountdown.className = 'finish-countdown';
  seedCountdown.style.color = 'red';
  seedCountdown.hidden = true;
  cockpit.readout.append(seedCountdown, comboEl, floorEl);
  // The network stays in the sidebar, but its stats travel with the in-game
  // cockpit as inline text after the readout, visible when the panel is
  // closed.
  cockpit.el.append(cockpit.stats);
  stage.appendChild(cockpit.el);

  // The map selector stays in the top-left HUD so it remains available while
  // the model panel is closed.
  const seedControls = document.createElement('div');
  seedControls.className = 'seed-controls';
  // standalone: positioned at the stage's top-left corner instead of being
  // embedded in a board header
  seedControls.classList.add('standalone');
  const seedLabel = document.createElement('span');
  seedLabel.className = 'seed-label';
  const previousSeed = document.createElement('button');
  previousSeed.type = 'button';
  previousSeed.textContent = '<';
  previousSeed.title = 'Previous tower';
  const nextSeed = document.createElement('button');
  nextSeed.type = 'button';
  nextSeed.textContent = '>';
  nextSeed.title = 'Next tower';
  const randomSeed = document.createElement('button');
  randomSeed.type = 'button';
  randomSeed.textContent = 'R';
  randomSeed.title = 'Random tower';
  seedControls.append(previousSeed, seedLabel, nextSeed, randomSeed);
  stage.appendChild(seedControls);

  const climbProgress = document.createElement('aside');
  climbProgress.className = 'climb-progress';
  const platformLabel = document.createElement('div');
  platformLabel.className = 'climb-progress-label';
  platformLabel.textContent = 'platform';
  const platformValue = document.createElement('div');
  platformValue.className = 'climb-platform-value';
  platformValue.textContent = '0';
  climbProgress.append(platformLabel, platformValue);
  stage.appendChild(climbProgress);
  // the shared live scoreboard: a DOM board at the stage's left edge
  const scoreBoard = createScoreBoard();
  stage.appendChild(scoreBoard.el);

  const loop = new GameLoop();
  const shouldUpdateDom = createUpdateLimiter(20);
  let lastCountdownTenths = -1;

  function writeSeed(seed: number) {
    history.replaceState(
      null,
      '',
      `${location.pathname}${location.search}#climb=${seed}`,
    );
  }

  const seed = (() => {
    const match = location.hash.match(/climb=(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  })();
  writeSeed(seed);

  const race = new ClimbRace(state, io, seed, {
    onReset: () => {
      camSet = false;
      camTop = 0;
    },
    onHumanCrash: () => {
      humanFollow = false;
    },
    onSeedChanged: (nextSeed) => {
      writeSeed(nextSeed);
      camSet = false;
      camTop = 0;
      seedCountdown.hidden = true;
    },
  });

  previousSeed.onclick = () => race.applyUserSeed(Math.max(0, race.seed - 1));
  nextSeed.onclick = () => race.applyUserSeed(race.seed + 1);
  randomSeed.onclick = () =>
    race.applyUserSeed(Math.floor(Math.random() * 1000));

  const onKey = (e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) return;
    if (e.code === 'KeyR') race.applyUserSeed(Math.floor(Math.random() * 1000));
  };
  document.addEventListener('keydown', onKey);

  /** world-space y at the bottom of the view; the camera only ever climbs */
  let camTop = 0;

  // Base models: server only, written to localStorage. onlyMissing so a
  // visitor's own training is never overwritten; imported brains are picked
  // up by the re-initialize.
  void (async () => {
    try {
      const { written } = await loadBaseModels('climb', io, true);
      if (written.length) {
        console.info(`Loaded base models: ${written.join(', ')}`);
        race.initialize();
      }
    } catch (err) {
      console.warn('Unable to load base climb models', err);
    }
  })();
  race.initialize();

  const followedPlayer = (): Player | undefined => {
    const h = state.human;
    if (humanFollow && h && !h.damaged) return h;
    if (follow === 0) return state.sortedPlayers[0];
    const group = race.groups.find((g) =>
      follow === 'mixed' ? g.isMixed : g.layer === follow,
    );
    if (!group) return undefined;
    let best: Player | undefined;
    let bestScore = -1;
    for (const p of group.pool) {
      if (p.damaged) continue;
      const score = p.brain?.score ?? 0;
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    return best;
  };

  loop.play(
    (_es, _dt, paused) => {
      const now = gameNow();
      if (!paused) frameMeter.tick(now);
      // the simulation freezes while paused, but the camera and the render
      // below keep updating on the frozen scene
      if (state.playing && !paused) {
        race.update(now);
        // the first drive input takes the camera to the human player
        const h = state.human;
        if (h?.controls.playerActive && !h.damaged) humanFollow = true;
      }

      const domUpdateDue = shouldUpdateDom(now);
      if (domUpdateDue) {
        race.refreshLeaderboard();
        updateFollowButtons();
        seedLabel.textContent = `seed ${race.seed}`;
        if (race.seedChangeAt) {
          const remaining = Math.max(0, race.seedChangeAt - now);
          const tenths = Math.floor(remaining / 100);
          seedCountdown.hidden = false;
          if (tenths !== lastCountdownTenths) {
            lastCountdownTenths = tenths;
            seedCountdown.textContent = `next tower in ${(tenths / 10).toFixed(1)}s`;
          }
        } else {
          seedCountdown.hidden = true;
        }
      }

      // the game canvas keeps whatever width the open panel leaves
      const gameWidth = panel.isOpen()
        ? window.innerWidth - panel.panelWidth()
        : window.innerWidth;
      resizeCanvas(gameCanvas, gameCtx, gameWidth, window.innerHeight);

      // camera: the whole tower width always fits and centers the followed
      // player's body. It targets location only; velocity never predicts the
      // direction of travel.
      const scale = Math.min(
        gameCanvas.height / VIEW_HEIGHT,
        gameCanvas.width / (config.TOWER_WIDTH + 40),
      );
      const viewH = gameCanvas.height / scale;
      const viewW = gameCanvas.width / scale;
      const followed = followedPlayer();
      if (state.playing) {
        // camTop is the bottom edge of the viewport, so convert the desired
        // centre into its lower edge before applying the world-floor clamp.
        const cameraCenter = followed
          ? climbCameraCenterY(followed, viewH)
          : climbCameraCenterY({ y: state.highestY }, viewH);
        const target = Math.max(0, cameraCenter - viewH * 0.5);
        if (!camSet) {
          camTop = 0;
          camSet = true;
        }
        camTop += (target - camTop) * CAMERA_LERP;
      }
      state.camY = camTop;

      const offsetX = (viewW / 2 - config.TOWER_WIDTH / 2) * scale;
      const offsetY = (camTop + viewH) * scale;

      // sky
      const sky = gameCtx.createLinearGradient(0, 0, 0, gameCanvas.height);
      sky.addColorStop(0, config.SKY_TOP);
      sky.addColorStop(1, config.SKY_BOTTOM);
      gameCtx.fillStyle = sky;
      gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

      // parallax clouds, deterministic per screen position
      drawClouds(
        gameCtx,
        gameCanvas.width,
        gameCanvas.height,
        camTop,
        scale,
        now,
      );

      gameCtx.save();
      gameCtx.setTransform(scale, 0, 0, -scale, offsetX, offsetY);
      const viewMinY = camTop - 40;
      const viewMaxY = camTop + viewH + 40;

      state.tower?.draw(gameCtx, viewMinY, viewMaxY);

      // climbers, the followed one and the human last
      const margin = 30;
      for (const p of state.players) {
        if (p === state.human || p === followed) continue;
        if (
          p.y < viewMinY ||
          p.y > viewMaxY ||
          p.x < -margin ||
          p.x > config.TOWER_WIDTH + margin
        )
          continue;
        p.draw(gameCtx, now, false);
      }
      if (followed) followed.draw(gameCtx, now, true);
      if (state.human && state.human !== followed)
        state.human.draw(gameCtx, now, false);
      gameCtx.restore();

      // the cockpit mimics the followed climber, hidden while it is dead
      if (domUpdateDue) {
        cockpit.show(followed && !followed.damaged ? followed.color : null);
        cockpit.stats.classList.toggle(
          'hidden',
          !neuralVisualizer.renderStats || !followed?.brain,
        );
        platformValue.textContent = String(followed?.bestPlatform ?? 0);
        scoreBoard.update(
          {
            text: `${state.living}/${state.population} climbers`,
            color: getColorScale(
              Math.min(1, state.living / Math.max(1, state.population)),
            ),
          },
          scoreBoardRows(state),
        );
      }
      if (followed) {
        const c = followed.controls;
        jumpSamples.push(c.jumpHeld ? 1 : 0);
        if (jumpSamples.length > JUMP_HISTORY) jumpSamples.shift();
        drawGamepadControls(cockpit.ctx, {
          x: c.right - c.left,
          y: 0,
          color: followed.color,
          action: c.jumpHeld,
          actionLabel: 'JUMP',
          actionHistory: jumpSamples,
        });
        comboEl.hidden = followed.comboValue < 2;
        comboEl.textContent = `x${followed.comboValue}`;
        floorEl.textContent = `floor ${Math.round(followed.brain?.score ?? 0)}`;
        if (followed.brain && neuralVisualizer.renderStats)
          updateBrainStats(followed.brain, followed);
        // The gauge drains while the followed climber fails to set a new
        // height record; at zero the stall death hits humans and AIs alike.
        const budget = Math.max(
          0,
          config.HEIGHT_BUDGET_FRAMES - followed.stallFrames,
        );
        cockpit.gauge.set(budget / config.HEIGHT_BUDGET_FRAMES, budget);
      }

      const followedBrain = followed?.brain;
      if (followedBrain)
        displayedGroup =
          followedBrain instanceof MixedNetwork
            ? 'mixed'
            : (followed?.brainLayers ?? null);
      if (panel.isOpen() && followedBrain)
        neuralVisualizer.renderNetwork(
          panel.network().ctx,
          followedBrain,
          followed?.teacher ?? null,
          followed?.distillErrors ?? null,
        );
      // the loss graph follows the student's distiller, null outside a run
      panel.groupPanel.drawLossGraph(followed?.distiller?.lossHistory ?? null);
    },
    {
      maxFps: config.HUMAN_FPS_CAP,
      // Cap the simulation whenever the human has taken control, even if the
      // camera has since been switched to an AI player.
      shouldCap: () =>
        config.HUMAN_FPS_CAP_ENABLED &&
        !!state.human?.controls.playerActive &&
        !state.human.damaged,
    },
  );

  /** Rebuild the inline stats block of the followed brain; the DOM is only
   *  touched when the rendered text changes, so a steady frame is cheap. */
  function updateBrainStats(network: NeuralNetwork, player: Player) {
    const groupKey =
      network instanceof MixedNetwork ? 'mixed' : String(player.brainLayers);
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

  /** Fill the follow buttons with their running/dead state once per HUD tick. */
  function updateFollowButtons() {
    const running = new Set<string>();
    for (const p of state.players) {
      if (p.damaged || !p.useAI) continue;
      running.add(
        p.brain instanceof MixedNetwork ? 'mixed' : String(p.brainLayers),
      );
    }
    panel.setRunning(running, state.living > 0);
  }
};

/** two parallax layers of soft ellipses, positioned from a stable hash so the
 *  sky never flickers between frames. Clouds also drift sideways at a
 *  per-layer speed and wrap around once fully offscreen */
function drawClouds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  camTop: number,
  scale: number,
  now: number,
) {
  ctx.fillStyle = config.CLOUD_COLOR;
  // half the horizontal wrap slack, wider than a whole cloud so it is fully
  // offscreen before it comes back around
  const margin = 100;
  for (let layer = 0; layer < 2; layer++) {
    const parallax = layer === 0 ? 0.2 : 0.4;
    const drift = camTop * parallax * scale;
    const count = layer === 0 ? 4 : 6;
    const wrapW = width + margin * 2;
    const driftX = (now * 0.001 * (layer === 0 ? 6 : 14)) % wrapW;
    for (let i = 0; i < count; i++) {
      const seedX = (i * 173 + layer * 97) % 1000;
      const seedY = (i * 331 + layer * 61) % 1000;
      const baseX = (seedX / 1000) * width + (layer === 0 ? 0 : width * 0.3);
      const x = ((baseX + driftX) % wrapW) - margin;
      const y =
        ((height - (seedY / 1000) * height * 1.5 + drift) % (height + 120)) -
        60;
      const r = (layer === 0 ? 26 : 16) + (seedX % 14);
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.8, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + r, y - r * 0.4, r * 1.1, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
