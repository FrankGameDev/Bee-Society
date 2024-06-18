import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";

//TODO: add controls for:
// shadows, boids parameters, obstacles parameters

export default class SceneInit {
    constructor() {
        this.scene = undefined;
        this.camera = undefined;
        this.renderer = undefined;

        // NOTE: Camera params;
        this.fov = 60;
        this.nearPlane = 1;
        this.farPlane = 30000;

        this.clock = undefined;
        this.stats = undefined;
        this.controls = undefined;

        this.ambientLight = undefined;
        this.directionalLight = undefined;
    }

    initialize() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            this.fov,
            window.innerWidth / window.innerHeight,
            this.nearPlane,
            this.farPlane
        );
        this.camera.position.z = 1000;
        this.camera.position.y = 300;

        this.renderer = new THREE.WebGLRenderer({
            // antialias: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.stats = Stats();
        document.body.appendChild(this.stats.dom);

        // ambient light which is for the whole scene
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.ambientLight.castShadow = true;
        this.scene.add(this.ambientLight);

        // directional light
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(0, 100, 100);
        this.directionalLight.lookAt(new THREE.Vector3());
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -50;
        this.directionalLight.shadow.camera.right = 50;
        this.directionalLight.shadow.camera.top = 50;
        this.directionalLight.shadow.camera.bottom = -50;
        this.scene.add(this.directionalLight);

        // const helper = new THREE.CameraHelper(
        //     this.directionalLight.shadow.camera
        // );
        // this.scene.add(helper);

        // if window resizes
        window.addEventListener("resize", () => this.onWindowResize(), false);
    }

    animate() {
        window.requestAnimationFrame(this.animate.bind(this));
        this.render();
        this.stats.update();
        this.controls.update();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
