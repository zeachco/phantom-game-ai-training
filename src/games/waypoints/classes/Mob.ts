import { Segment } from './Segment';
import { Path } from './Path';
import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three';
import { rand } from '../../../utilities/math';

const geometry = new BoxGeometry();

const MINSPD = 0.05;
const MAXSPD = 0.1;
const SPD_RANGE = MAXSPD - MINSPD;

export class Mob {
  private speed = rand(MINSPD, MAXSPD);
  public target?: Segment;
  public targetIndex = 0;
  public mesh: Mesh;
  public vx = 0;
  public vy = 0;
  constructor(public path: Path, public x = 0, public y = 0) {
    const amountOfRed = Math.round(((this.speed - MINSPD) / SPD_RANGE) * 255);
    const amountOfGreen = Math.round(255 - amountOfRed);
    const material = new MeshBasicMaterial({
      color: `rgba(${amountOfRed}, ${amountOfGreen}, 0)`,
      opacity: 0.2,
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.scale.set(0.3, 0.3, 0.3);
    this.mesh.position.set(this.x, this.y, 0);
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    if (!this.target) {
      this.targetIndex = 0;
      this.changeTarget();
    }
    if (this.target) {
      const { x, y } = this.target;
      if (x < this.x) this.vx -= this.speed;
      if (x > this.x) this.vx += this.speed;
      if (y < this.y) this.vy -= this.speed;
      if (y > this.y) this.vy += this.speed;

      if (this.target.isInRange(this.mesh, this.speed * 1.5)) {
        this.changeTarget();
      }
    }
    this.mesh.position.set(this.x, this.y, 0);
    this.mesh.rotation.x += this.speed;
    this.mesh.rotation.y += this.speed;
  }

  private changeTarget() {
    this.target = this.path.getNext(this.targetIndex++);
    if (!this.target) {
      this.targetIndex = 0;
      this.target = this.path.getNext(this.targetIndex++);
    }
  }
}
