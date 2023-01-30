import { Scene, PerspectiveCamera, WebGLRenderer, Clock } from 'three';
import { lerp } from '../../utilities/math';
import { Mob } from './classes/Mob';
import { NeuralInput } from './classes/NeuralInput';
import { Path } from './classes/Path';
import { Segment } from './classes/Segment';
import map from './maps/default';

const TOTAL_MOBS = 8000;

export default () => {
  let bestScore = 0;
  const scene = new Scene();
  const paths = map.paths.map((pathConfig) => {
    const path = new Path(
      pathConfig.segments.map(([x, y]) => new Segment(x, y)),
    );
    path.segments.forEach((wp) => scene.add(wp.mesh));
    return path;
  });

  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );

  camera.position.z = 25;
  camera.position.y = -8;
  camera.rotation.x = Math.PI * 0.2;

  const renderer = new WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const canvas = renderer.domElement;
  document.body.appendChild(canvas);

  const mobs: Mob[] = [];
  const neuralCtrls: NeuralInput[] = [];

  paths.forEach((path) => {
    for (var i = 0; i < TOTAL_MOBS; i++) {
      const mob = new Mob(path, onCheckpoint);
      scene.add(mob.mesh);
      mobs.push(mob);
      const nc = new NeuralInput(mob);
      mob.ctrl = nc;
      const mutationLevel = lerp(0, 1, i / TOTAL_MOBS);
      nc.brain.randomize(mutationLevel);
      neuralCtrls.push(nc);
      scene.add(nc.mesh);
    }
  });

  const [player] = mobs;
  const clock = new Clock();

  function animate() {
    requestAnimationFrame(animate);
    if (
      canvas.width !== canvas.clientWidth ||
      canvas.height !== canvas.clientHeight
    ) {
      // This stuff in here is just for auto-resizing.
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    // Apply matrix like this to rotate the camera.
    const es = clock.getElapsedTime() * 0.1 * Math.PI;
    camera.position.set(0, 0, 30);

    // Make camera look at the box.
    camera.lookAt(player.mesh.position);

    renderer.render(scene, camera);
    paths.forEach((path) => path.update());
    mobs.forEach((mob) => mob.update());
    neuralCtrls.forEach((viz) => viz.update());
  }
  animate();

  function onCheckpoint(mob: Mob) {
    const score = mob.score * 1000 + mob.fuel;
    if (bestScore < score) {
      mob.ctrl.brain.score = score;
      console.log(`score change ${bestScore} > ${score}'\n
Fuel: ${mob.fuel.toFixed(2)}\n
Oxygen: ${mob.oxygen.toFixed(2)}\n
Waypoints: ${mob.score}`);
      bestScore = score;
      const nc = mob.ctrl;
      nc.setWinner();
    }
  }
};
