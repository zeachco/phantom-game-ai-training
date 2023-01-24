import { Scene, PerspectiveCamera, WebGLRenderer, Clock } from 'three';
import { Mob } from './classes/Mob';
import { Path } from './classes/Path';
import { Segment } from './classes/Segment';
import map from './maps/default';

export default () => {
  const scene = new Scene();
  const paths = map.paths.map((pathConfig) => {
    const path = new Path(
      pathConfig.segments.map((waypoints) =>
        waypoints.map(([x, y]) => new Segment(x, y)),
      ),
    );
    // scene.add(path.line);
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

  paths.forEach((path) => {
    for (var i = 0; i < 1000; i++) {
      const mob = new Mob(path);
      scene.add(mob.mesh);
      mobs.push(mob);
    }

    path.forEach((s) => scene.add(s.mesh));
  });

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
    camera.position.set(-8 + Math.cos(es) * 5, -8 + Math.sin(es) * 5, 25);

    // Make camera look at the box.
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    paths.forEach((path) => path.update());
    mobs.forEach((mob) => mob.update());
  }
  animate();
};
