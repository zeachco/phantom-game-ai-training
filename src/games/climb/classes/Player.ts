import { NeuralNetwork } from '../../../ai/Network';
import { CTRL_COLORS, clamp } from '../../../ai/utils';
import { getRandomColor } from '../../../utilities/colors';
import { ControlType } from '../types';
import { config, SENSORS } from './Config';
import { Controls } from './Controls';
import { Sensor } from './Sensor';
import type { Tower } from './Tower';

/** physics half-width of the body, also how far the walls keep the spawn */
export const PLAYER_HALF_W = 11;
/** visual and camera height of a climber's body */
export const PLAYER_HEIGHT = 30;

export function getClimbBrainDimensions(rayCount = SENSORS): {
  inputCount: number;
  outputCount: number;
} {
  return {
    inputCount: rayCount + 3,
    outputCount: Object.keys(new Controls(ControlType.AI)).length,
  };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class Player {
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1 = 1;
  public grounded = true;
  public useAI: boolean;
  public damaged = false;
  public deathTime = 0;
  public bestHeight: number;
  public stallFrames = 0;
  public jumpBuffer = 0;
  public coyoteFrames = 0;
  public controls: Controls;
  public sensor?: Sensor;
  public brain?: NeuralNetwork;

  #prevFeet: number;
  #prevJumpHeld = false;
  #particles: Particle[] = [];

  constructor(
    public x: number,
    public y: number,
    controlType: ControlType,
    public tower: Tower,
    public label: string = '',
    public color: string = 'white',
    public brainLayers: number = 1,
    public brainBuilder?: (
      inputCount: number,
      outputCount: number,
    ) => NeuralNetwork,
  ) {
    this.color = CTRL_COLORS[brainLayers] || getRandomColor();
    this.controls = new Controls(controlType);
    this.useAI = controlType === ControlType.AI;
    if (controlType !== ControlType.DUMMY) {
      this.sensor = new Sensor();
      const { inputCount, outputCount } = getClimbBrainDimensions();
      this.brain = brainBuilder
        ? brainBuilder(inputCount, outputCount)
        : new NeuralNetwork(inputCount, outputCount, brainLayers);
    }
    this.bestHeight = y;
    this.#prevFeet = y;
  }

  update(now: number): void {
    if (this.damaged) {
      // Corpses ignore platforms and controls until they reach the ground.
      this.vy -= config.GRAVITY;
      if (this.vy < -config.TERMINAL_VELOCITY)
        this.vy = -config.TERMINAL_VELOCITY;
      this.y += this.vy;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
      }
      this.#updateParticles();
      return;
    }
    this.controls.update();
    const jumpHeld = this.controls.jumpHeld;
    const jumpPressed = jumpHeld && !this.#prevJumpHeld;
    if (jumpPressed) this.jumpBuffer = config.JUMP_BUFFER_FRAMES;

    const input = clamp(-1, 1, this.controls.right - this.controls.left);
    const accel = this.grounded ? config.ACCEL : config.AIR_ACCEL;
    if (input !== 0) {
      // Braking input should not leave a grounded player sliding away from
      // the requested direction for several frames. Apply ground friction
      // twice while the input opposes the current velocity.
      if (this.grounded && this.vx * input < 0)
        this.vx *= config.GROUND_FRICTION ** 2;
      this.vx += accel * input;
      this.facing = input > 0 ? 1 : -1;
      if (this.vx > config.MAX_SPEED) this.vx = config.MAX_SPEED;
      if (this.vx < -config.MAX_SPEED) this.vx = -config.MAX_SPEED;
    } else if (this.grounded) {
      this.vx *= config.GROUND_FRICTION;
      if (Math.abs(this.vx) < 0.01) this.vx = 0;
    }
    this.vy -= config.GRAVITY;
    if (this.vy < -config.TERMINAL_VELOCITY)
      this.vy = -config.TERMINAL_VELOCITY;
    if (this.jumpBuffer > 0 && (this.grounded || this.coyoteFrames > 0)) {
      // Momentum buys airtime: jump height scales from 1x at rest to 4x at
      // top speed. Since height is proportional to impulse², use the square
      // root so the configured multiplier describes actual height.
      const speedRatio = clamp(0, 1, Math.abs(this.vx) / config.MAX_SPEED);
      const heightMultiplier =
        1 + (config.MAX_JUMP_HEIGHT_MULTIPLIER - 1) * speedRatio;
      this.vy = config.JUMP_SPEED * Math.sqrt(heightMultiplier);
      this.grounded = false;
      this.coyoteFrames = 0;
      this.jumpBuffer = 0;
    }
    if (this.jumpBuffer > 0) this.jumpBuffer--;
    this.#prevJumpHeld = jumpHeld;
    this.#prevFeet = this.y;
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < PLAYER_HALF_W) {
      this.x = PLAYER_HALF_W;
      if (this.vx < 0) this.vx = -this.vx * config.WALL_BOUNCE;
    } else if (this.x > config.TOWER_WIDTH - PLAYER_HALF_W) {
      this.x = config.TOWER_WIDTH - PLAYER_HALF_W;
      if (this.vx > 0) this.vx = -this.vx * config.WALL_BOUNCE;
    }
    if (this.y <= 0) {
      this.y = 0;
      if (this.vy < 0) this.vy = 0;
      this.grounded = true;
    }
    // One-way surfaces only catch feet crossing from above. A fall that
    // nothing catches past the death speed is lethal: the corpse then keeps
    // falling to the ground on later frames.
    if (this.vy < 0) {
      const impactVy = this.vy;
      const top = this.tower.crossedSurface(
        this.x,
        PLAYER_HALF_W,
        this.#prevFeet,
        this.y,
      );
      if (top >= 0) {
        this.y = top;
        this.vy = 0;
        this.grounded = true;
        if (impactVy <= -6) this.#spawnPoof(impactVy);
      } else if (impactVy <= -config.DEATH_VELOCITY) {
        this.#die(now, 'impact');
      }
    }
    if (this.grounded) {
      if (!this.tower.hasSupport(this.x, PLAYER_HALF_W, this.y, 2)) {
        this.grounded = false;
        this.coyoteFrames = config.COYOTE_FRAMES;
      } else {
        this.coyoteFrames = config.COYOTE_FRAMES;
      }
    } else if (this.coyoteFrames > 0) this.coyoteFrames--;
    if (this.y > this.bestHeight) {
      const prevFloors = Math.floor(this.bestHeight / config.FLOOR_HEIGHT);
      const nowFloors = Math.floor(this.y / config.FLOOR_HEIGHT);
      if (nowFloors > prevFloors && this.brain)
        this.brain.score += nowFloors - prevFloors;
      this.bestHeight = this.y;
      this.stallFrames = 0;
    } else {
      this.stallFrames++;
    }
    if (this.useAI && this.stallFrames >= config.HEIGHT_BUDGET_FRAMES)
      this.#die(now, 'stall');
    if (this.sensor && this.brain) {
      this.sensor.update(this.x, this.y + PLAYER_HEIGHT * 0.5, this.tower);
      if (this.useAI) {
        const inputs = new Array<number>(this.sensor.rayCount + 3);
        for (let i = 0; i < this.sensor.rayCount; i++)
          inputs[i] = this.sensor.readings[i];
        const r = this.sensor.rayCount;
        inputs[r] = clamp(-1, 1, this.vx / config.MAX_SPEED);
        inputs[r + 1] = clamp(-1, 1, this.vy / config.JUMP_SPEED);
        inputs[r + 2] = this.grounded ? 1 : 0;
        const outputs = this.brain.process(inputs);
        this.controls.left = clamp(0, 1, outputs[0]);
        this.controls.right = clamp(0, 1, outputs[1]);
        this.controls.writeJump(outputs[2]);
      }
    }
    this.#updateParticles();
  }

  #die(now: number, cause: 'impact' | 'stall'): void {
    this.damaged = true;
    this.deathTime = now;
    if (this.brain) {
      if (cause === 'impact') this.brain.score -= Math.hypot(this.vx, this.vy);
      else this.brain.score -= config.STALL_PENALTY;
    }
  }

  #spawnPoof(impactVy: number): void {
    const count = Math.min(6, 4 + Math.floor(Math.abs(impactVy) / 6));
    for (let i = 0; i < count; i++) {
      this.#particles.push({
        x: this.x + (Math.random() - 0.5) * 10,
        y: this.y,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 1.5,
        life: 1,
      });
    }
    if (this.#particles.length > 24)
      this.#particles.splice(0, this.#particles.length - 24);
  }

  #updateParticles(): void {
    for (let i = this.#particles.length - 1; i >= 0; i--) {
      const p = this.#particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.05;
      p.life -= 0.08;
      if (p.life <= 0) this.#particles.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D, now: number, focused: boolean): void {
    if (focused && this.sensor && !this.damaged)
      this.sensor.draw(ctx, this.x, this.y + PLAYER_HEIGHT * 0.5, this.color);
    const alpha = this.damaged
      ? clamp(0, 1, 0.5 * (1 - (now - this.deathTime) / config.DEAD_LIFETIME))
      : focused
        ? 1
        : 0.5;
    if (alpha <= 0) return;
    ctx.save();
    ctx.fillStyle = 'white';
    if (focused) {
      for (const p of this.#particles) {
        ctx.globalAlpha = p.life * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (1 - p.life) * 6 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const stretch = 1 + Math.min(0.3, Math.abs(this.vy) * 0.02);
    const sx = 1 / Math.sqrt(stretch);
    const sy = stretch;
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y + PLAYER_HEIGHT * 0.5);
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.roundRect(
      -PLAYER_HALF_W,
      -PLAYER_HEIGHT * 0.5,
      PLAYER_HALF_W * 2,
      PLAYER_HEIGHT,
      8,
    );
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const eyeY = PLAYER_HEIGHT * 0.2;
    for (const offset of [-4, 4]) {
      const eyeX = this.facing * 4 + offset;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(eyeX + this.facing, eyeY, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
