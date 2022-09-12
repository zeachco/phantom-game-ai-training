import { THREE } from ".";
export class Cameraman {
    scene;
    camera;
    renderer;
    canvas;
    constructor(scene, x = 0, y = 10, z = 0) {
        this.scene = scene;
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.canvas = this.renderer.domElement;
        document.body.appendChild(this.canvas);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.x = x;
        this.camera.position.y = y;
        this.camera.rotation.z = z;
        this.camera.lookAt(0, 0, 0);
        document.addEventListener("resize", () => {
            console.log("resize");
        });
    }
    update(es) {
        if (this.canvas.width !== this.canvas.clientWidth ||
            this.canvas.height !== this.canvas.clientHeight) {
            // This stuff in here is just for auto-resizing.
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
            this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
            this.camera.updateProjectionMatrix();
        }
        this.renderer.render(this.scene, this.camera);
    }
}
