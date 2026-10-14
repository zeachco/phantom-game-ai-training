import { describe, expect, test } from 'bun:test';
import { CLIMB_INPUT_COUNT, config } from '../src/games/climb/classes/Config';
import {
  getClimbBrainDimensions,
  PLAYER_HALF_W,
  Player,
} from '../src/games/climb/classes/Player';
import type { Platform, Tower } from '../src/games/climb/classes/Tower';
import { ControlType } from '../src/games/climb/types';

/**
 * A fake tower with the same landing/support semantics as Tower, with
 * hand-placed platforms so player dynamics can be isolated from the
 * procedural generation.
 */
function towerWith(platforms: Platform[] = []): Tower {
  return {
    platforms,
    crossedSurface(x, halfW, prevFeet, feet) {
      let top = -1;
      for (const p of platforms) {
        if (p.y > prevFeet + 1e-6 || p.y <= feet - 1e-6) continue;
        if (x + halfW <= p.x || x - halfW >= p.x + p.w) continue;
        if (p.y > top) top = p.y;
      }
      return top;
    },
    supportPlatform(x, halfW, feet, tolerance = 2) {
      if (feet <= tolerance) return null;
      for (const p of platforms) {
        if (Math.abs(p.y - feet) > tolerance) continue;
        if (x + halfW <= p.x || x - halfW >= p.x + p.w) continue;
        return p;
      }
      return null;
    },
  } as unknown as Tower;
}

function groundPlayer(x = config.TOWER_WIDTH / 2): Player {
  return new Player(x, 0, ControlType.DUMMY, towerWith());
}

function tick(player: Player, frames: number, start = 0) {
  for (let i = 0; i < frames; i++) player.update(start + i);
}

describe('climb player physics', () => {
  test('rests on the ground without sinking or bouncing', () => {
    const player = groundPlayer();
    tick(player, 30);
    expect(player.y).toBe(0);
    expect(player.vy).toBe(0);
    expect(player.grounded).toBe(true);
  });

  test('a jump fires with the full impulse and the apex clears the worst row spacing', () => {
    const player = groundPlayer();
    player.controls.jump = 1;
    player.update(0);
    expect(player.vy).toBe(config.JUMP_SPEED);
    expect(player.grounded).toBe(false);
    player.controls.jump = 0;
    let maxY = player.y;
    for (let i = 1; i < 90 && !player.grounded; i++) {
      player.update(i);
      if (player.y > maxY) maxY = player.y;
    }
    expect(player.grounded).toBe(true);
    expect(player.y).toBe(0);
    // the discrete apex sits a few units above JUMP_SPEED²/(2·GRAVITY)
    const idealApex = config.JUMP_SPEED ** 2 / (2 * config.GRAVITY);
    expect(maxY).toBeGreaterThan(idealApex - 1);
    expect(maxY).toBeLessThan(idealApex + 6);
    expect(maxY).toBeGreaterThan(config.ROW_SPACING_MAX * 1.1);
  });

  test('walking off an edge keeps the jump armed for the coyote window', () => {
    const tower = towerWith([{ x: 100, y: 50, w: 200 }]);
    const player = new Player(290, 50, ControlType.DUMMY, tower);
    player.controls.right = 1;
    player.update(0);
    expect(player.grounded).toBe(true);
    while (player.grounded) player.update(1);
    expect(player.coyoteFrames).toBeGreaterThan(0);
    player.controls.right = 0;
    player.controls.jump = 1;
    player.update(2);
    player.controls.jump = 0;
    expect(player.vy).toBeGreaterThan(config.JUMP_SPEED);
    expect(player.vy).toBeLessThanOrEqual(
      config.JUMP_SPEED * Math.sqrt(config.MAX_JUMP_HEIGHT_MULTIPLIER),
    );
    expect(player.grounded).toBe(false);
  });

  test('full movement speed gives twice the jump height', () => {
    const player = groundPlayer();
    player.vx = config.MAX_SPEED;
    player.controls.right = 1;
    player.controls.jump = 1;
    player.update(0);
    expect(player.vy).toBe(
      config.JUMP_SPEED * Math.sqrt(config.MAX_JUMP_HEIGHT_MULTIPLIER),
    );
  });

  test('a jump press just before touchdown is buffered and fires on landing', () => {
    const player = new Player(320, 10, ControlType.DUMMY, towerWith());
    tick(player, 7);
    expect(player.grounded).toBe(false);
    player.controls.jump = 1;
    player.update(7);
    player.controls.jump = 0;
    for (let frame = 8; frame < 30 && !player.grounded; frame++)
      player.update(frame);
    expect(player.grounded).toBe(true);
    expect(player.y).toBe(0);
    player.update(30); // the buffered press fires on the first grounded frame
    expect(player.comboValue).toBe(2);
    expect(player.vy).toBe(config.JUMP_SPEED * config.COMBO_JUMP_STRENGTH);
    expect(player.grounded).toBe(false);
  });

  test('platforms catch a falling player, and one jumping up passes through', () => {
    const tower = towerWith([{ x: 200, y: 60, w: 240 }]);
    const falling = new Player(320, 100, ControlType.DUMMY, tower);
    tick(falling, 60);
    expect(falling.y).toBe(60);
    expect(falling.vy).toBe(0);
    expect(falling.grounded).toBe(true);
    expect(falling.damaged).toBe(false);

    // rising through the platform from below: no snap down, no landing
    const rising = new Player(320, 52, ControlType.DUMMY, tower);
    rising.vy = 10;
    rising.update(0);
    rising.update(1);
    expect(rising.y).toBeGreaterThan(60);
    expect(rising.grounded).toBe(false);
  });

  test('a released key slides to a stop on the ground', () => {
    const player = groundPlayer();
    player.vx = config.MAX_SPEED;
    tick(player, 10);
    expect(player.vx).toBeCloseTo(
      config.MAX_SPEED * config.GROUND_FRICTION ** 10,
      6,
    );
    tick(player, 60, 10);
    expect(player.vx).toBe(0);
    expect(player.x).toBeGreaterThan(config.TOWER_WIDTH / 2); // slid right
    expect(player.x).toBeLessThan(config.TOWER_WIDTH / 2 + 60);
  });

  test('opposite ground input applies doubled friction before acceleration', () => {
    const player = groundPlayer();
    player.vx = config.MAX_SPEED;
    player.controls.left = 1;
    player.update(0);
    expect(player.vx).toBeCloseTo(
      config.MAX_SPEED * config.GROUND_FRICTION ** 2 - config.ACCEL,
      6,
    );
  });

  test('side walls bounce horizontal velocity unchanged in magnitude', () => {
    const player = groundPlayer(PLAYER_HALF_W + 1);
    player.vx = -4;
    player.update(0);
    expect(player.x).toBe(PLAYER_HALF_W);
    expect(player.vx).toBeCloseTo(4 * config.GROUND_FRICTION, 6);
  });

  test('a fall past DEATH_HEIGHT below the last touched platform kills, a shorter drop onto the ground does not', () => {
    // spawned standing on their reference surface, then left to fall
    const killer = new Player(320, 400, ControlType.DUMMY, towerWith());
    tick(killer, 100);
    expect(killer.damaged).toBe(true);
    expect(killer.y).toBe(0); // the corpse kept falling to the ground

    const survivor = new Player(320, 100, ControlType.DUMMY, towerWith());
    tick(survivor, 60);
    expect(survivor.damaged).toBe(false);
    expect(survivor.y).toBe(0);
    expect(survivor.grounded).toBe(true);
  });

  test('any climber that never improves dies of the height budget', () => {
    const ai = new Player(320, 0, ControlType.AI, towerWith(), 't', '', 1);
    ai.brain!.process = () => [0, 0, 0];
    tick(ai, config.HEIGHT_BUDGET_FRAMES + 10);
    expect(ai.damaged).toBe(true);
    expect(ai.brain!.score).toBe(-config.STALL_PENALTY);

    const human = groundPlayer();
    tick(human, config.HEIGHT_BUDGET_FRAMES + 10);
    expect(human.damaged).toBe(true);
  });

  test('each new floor of personal best height banks one point', () => {
    const tower = towerWith([
      { x: 0, y: 50, w: config.TOWER_WIDTH },
      { x: 0, y: 100, w: config.TOWER_WIDTH },
    ]);
    const ai = new Player(320, 0, ControlType.AI, tower, 't', '', 1);
    ai.brain!.process = () => [0, 0, 0];
    ai.y = 51;
    ai.update(0);
    expect(ai.brain!.score).toBe(1);
    ai.y = 101;
    ai.update(1);
    expect(ai.brain!.score).toBe(2);
    ai.y = 80;
    ai.update(2);
    expect(ai.brain!.score).toBe(2); // a lower height never un-banks floors
  });

  test('the brain sees the full input vector and writes the three drive outputs', () => {
    const { inputCount, outputCount } = getClimbBrainDimensions();
    expect(inputCount).toBe(CLIMB_INPUT_COUNT);
    expect(outputCount).toBe(3);
    const ai = new Player(320, 0, ControlType.AI, towerWith(), 't', '', 1);
    expect(ai.sensor!.inputCount).toBe(CLIMB_INPUT_COUNT);
    const seen: number[][] = [];
    ai.brain!.process = (inputs: number[]) => {
      seen.push(inputs);
      return [0, 0.9, 0];
    };
    ai.update(0);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toHaveLength(inputCount);
    for (const v of seen[0]) expect(Number.isFinite(v)).toBe(true);
    // the brain's right output drives the player on the next frame
    expect(ai.controls.right).toBeCloseTo(0.9, 6);
    ai.update(1);
    expect(ai.vx).toBeGreaterThan(0);
  });

  test('corpses ignore platforms and rest on the ground, fading out', () => {
    const tower = towerWith([{ x: 200, y: 60, w: 240 }]);
    const player = new Player(320, 100, ControlType.DUMMY, tower);
    player.damaged = true;
    player.deathTime = 0;
    tick(player, 120, 0);
    expect(player.y).toBe(0);
    expect(player.vy).toBe(0);
  });
});
