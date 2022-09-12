import { THREE } from "../../../utilities/three";
const geometry = new THREE.BoxGeometry();
const V = THREE.Vector3;
export class Mob {
    x;
    z;
    targetIndex = 0;
    mesh;
    speed = 0.01;
    target = null;
    material;
    v = new V(0, 0, 0);
    hp = 100;
    constructor(x = 0, z = 0) {
        this.x = x;
        this.z = z;
        this.material = new THREE.MeshBasicMaterial();
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.scale.set(0.3, 0.3, 0.3);
        this.mesh.position.set(this.x, 0, this.z);
    }
    update(es) {
        if (this.target) {
            const distance = this.mesh.position.distanceTo(this.target.mesh.position);
            if (distance > 1) {
                this.mesh.lookAt(this.target.mesh.position);
                this.mesh.translateZ(Math.min((distance / 10000) * es, this.speed * es));
            }
            else {
                this.hp -= 1;
            }
        }
    }
}
