import { Segment } from './Segment';
import { Path } from './Path';
import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three';
import { NeuralInput } from './NeuralInput';

const geometry = new BoxGeometry();

const ACC = 0.005;
const RATIO_RA = 0.8;
const FRICTION = 0.95;
const FUEL_PER_TRUSTER = 0.1;
const OXYGEN_PER_TICK = 0.1;

export class Mob {
  public mesh: Mesh;
  public x = 0;
  public y = 0;
  public a = 0;
  public vx = 0;
  public vy = 0;
  public va = 0;
  public fuel = 100;
  public oxygen = 100;
  public score = 0;
  private material: MeshBasicMaterial;
  private _index = 0;
  public ctrl: NeuralInput;
  constructor(public path: Path, public onCheckpoint: (mob: Mob) => void) {
    this.material = new MeshBasicMaterial({ color: 0xff00ff });
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.scale.set(1, 0.3, 0.1);
    this.mesh.position.set(this.x, this.y, 0);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.a += this.va;
    this.vx *= FRICTION;
    this.vy *= FRICTION;
    this.va *= FRICTION;
    if (this.oxygen > 0) this.oxygen -= OXYGEN_PER_TICK;

    if (this.target.isInRange(this.mesh, 3)) {
      this.score++;
      this.onCheckpoint(this);
      this.fuel += 50;
      this.oxygen += 50;
      this.targetIndex++;
    }

    // this.material.color.setHSL(0, 50, 50);
    if (this.isDead()) {
      this.material.color.setRGB(128, 128, 128);
      this.onCheckpoint(this);
      this.reset();
    } else {
      const col = (c) => {
        let co = c * 2.55;
        if (co < 0) co = 0;
        if (co > 255) co = 255;
        return Math.round(co);
      };
      this.material.color.setRGB(
        col(this.fuel),
        col(this.oxygen),
        col(this.oxygen),
      );
    }

    // this.material.color
    this.mesh.position.set(this.x, this.y, 0);
    this.mesh.rotation.set(0, 0, this.a);
  }

  private normalizedIndex(index = this._index) {
    return index % this.path.segments.length;
  }

  public set targetIndex(value) {
    this._index = this.normalizedIndex(value);
  }

  public get targetIndex() {
    return this._index;
  }

  public get target(): Segment {
    return this.path.segments[this.targetIndex];
  }

  public trustLeft() {
    if (this.fuel < 0) return;
    this.fuel -= FUEL_PER_TRUSTER;
    this.va -= ACC * RATIO_RA;
    this.vx += Math.cos(this.a) * ACC;
    this.vy += Math.sin(this.a) * ACC;
  }

  public trustRight() {
    if (this.fuel < 0) return;
    this.fuel -= FUEL_PER_TRUSTER;
    this.va += ACC * RATIO_RA;
    this.vx += Math.cos(this.a) * ACC;
    this.vy += Math.sin(this.a) * ACC;
  }

  public waypoint(offset = 0): Segment {
    let targetIndex = this.normalizedIndex(this.targetIndex + offset);
    return this.path.segments[targetIndex];
  }

  public isDead() {
    return this.oxygen <= 0;
  }

  public reset() {
    this.vx = 0;
    this.vy = 0;
    this.va = 0;
    this.x = 0;
    this.y = 0;
    this.a = 0;
    this.fuel = 100;
    this.oxygen = 100;
    this.score = 0;
  }
}
