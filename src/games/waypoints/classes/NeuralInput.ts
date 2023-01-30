import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three';
import { GamePad } from '../../../utilities/inputs/Gamepad';
import { NeuralNetwork } from '../../number/neural-network/NeuralNetwork';
import { Mob } from './Mob';

const SHOW_WP_NB = 2;
const FILE_SAVE = 'waypoints_neural_8_2';

export class NeuralInput {
  private material: LineBasicMaterial;
  private geometry: BufferGeometry;
  public mesh: Line;
  public brain = new NeuralNetwork(8, 2);

  constructor(public mob: Mob, public pad?: GamePad) {
    this.material = new LineBasicMaterial({ color: pad ? 0xffdd22 : 0xffaa00 });
    const points = [];
    for (let index = 0; index < SHOW_WP_NB + 1; index++) {
      points.push(new Vector3(0, 0, 0));
    }
    this.geometry = new BufferGeometry().setFromPoints(points);
    this.mesh = new Line(this.geometry, this.material);
    this.brain.loadFromFile(FILE_SAVE);
    this.brain.score = 0;
  }

  public generateInputs() {
    const wp1 = this.mob.waypoint(0);
    const wp2 = this.mob.waypoint(1);
    const curWPdx = wp1.x;
    const curWPdy = wp1.y;
    const nextWPdx = wp2.x;
    const nextWPdy = wp2.y;
    return [
      curWPdx,
      curWPdy,
      nextWPdx,
      nextWPdy,
      this.mob.vx,
      this.mob.vy,
      this.mob.va,
      this.mob.a,
    ];
  }

  update() {
    const positions = this.mesh.geometry.attributes.position.array as number[];

    positions[0] = this.mob.mesh.position.x;
    positions[1] = this.mob.mesh.position.y;
    positions[2] = 0;

    for (let index = 0; index < SHOW_WP_NB; index++) {
      const nextTarget = this.mob.waypoint(index);
      positions[(index + 1) * 3] = nextTarget.x;
      positions[(index + 1) * 3 + 1] = nextTarget.y;
      positions[(index + 1) * 3 + 2] = 0;
    }

    this.mesh.geometry.attributes.position.needsUpdate = true;

    if (this.mob.fuel <= 0) {
      this.material.color.setRGB(128, 128, 128);
    }

    const inputs = this.generateInputs();
    const [left, right] = this.brain.feedForward(inputs);
    // if (this.pad) {
    //   const [hLeft, hRight] = [
    //     this.pad.get('ArrowLeft'),
    //     this.pad.get('ArrowRight'),
    //   ];
    //   // this.brain.backprop(inputs, [hLeft - left, hRight - right]);
    //   if (hLeft) this.mob.trustLeft();
    //   if (hRight) this.mob.trustRight();
    // } else {
    if (right >= 1) this.mob.trustRight();
    if (left >= 1) this.mob.trustLeft();
    // }
  }

  public setWinner() {
    this.brain.saveToFile(FILE_SAVE);
  }
}
