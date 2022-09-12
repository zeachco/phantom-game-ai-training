import { THREE } from "../../../utilities/three";
const geometry = new THREE.RingGeometry();
const material = new THREE.MeshBasicMaterial({
    color: 0x0088ff,
    opacity: 0.5,
});
export class Segment {
    x;
    y;
    mesh;
    clock = new THREE.Clock();
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.scale.set(0.2, 0.2, 0.02);
        this.mesh.position.x = x;
        this.mesh.position.y = y;
    }
    isInRange(mesh, range = 0.1) {
        if (!mesh?.position)
            return false;
        return mesh.position.distanceTo(this.mesh.position) < range;
    }
    update() {
        this.mesh.rotateZ(2);
        this.mesh.scale.y = 0.2 + Math.sin(this.clock.getElapsedTime() * 10) * 0.02;
    }
}
