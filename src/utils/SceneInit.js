import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";

export class SceneInit {
    constructor() {
        this.scene = undefined;
        this.camera = undefined;
        this.renderer = undefined;

        //  Camera params
        this.fov = 45;
        this.nearPlane = 1;
        this.farPlane = 30000;

        this.stats = undefined;
        this.controls = undefined;

        this.labelRenderer = undefined;
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

        const canvas = document.getElementById("webGlRenderer");
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            stencil: true,
            antialias: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );
        this.controls.maxDistance = 7000;
        this.controls.minDistance = 500;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI / 2;
        const originalUpdate = this.controls.update;
        this.controls.update = function () {
            originalUpdate.call(this);

            if (this.camera.position.y < 10) {
                this.camera.position.y = 10;
            }
        }.bind(this);

        this.stats = Stats();
        this.stats.dom.classList.toggle("stats", true);
        document.body.appendChild(this.stats.dom);

        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = "absolute";
        this.labelRenderer.domElement.style.top = "0px";
        this.labelRenderer.domElement.style.pointerEvents = "none";
        document.body.appendChild(this.labelRenderer.domElement);

        // if window resizes
        window.addEventListener("resize", () => this.onWindowResize(), false);
    }

    animate() {
        window.requestAnimationFrame(this.animate.bind(this));
        this.render();
        this.stats.update();
        this.controls.update();
        this.labelRenderer.render(this.scene, this.camera);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }
}
