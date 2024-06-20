import * as THREE from "three";
import * as CANNON from "cannon-es";

export default class Obstacle {
    constructor(radius, position, color, mass) {
        this.radius = radius;
        this.position = position;
        this.color = color;
        this.mass = mass;

        this.sphereMesh = undefined;
        this.sphereBody = undefined;
        this.boxMesh = undefined;
    }

    #createBody() {
        this.sphereBody = new CANNON.Body({
            mass: this.mass,
            shape: new CANNON.Sphere(this.radius),
        });
        this.sphereBody.position.set(
            this.position.x,
            this.position.y,
            this.position.z
        );
    }

    #createRenderer(shadowOptions = {}) {
        const geometry = new THREE.SphereGeometry(this.radius);
        const material = new THREE.MeshToonMaterial({ color: this.color });
        this.sphereMesh = new THREE.Mesh(geometry, material);
        this.sphereMesh.castShadow = shadowOptions.castShadow || false;
        this.sphereMesh.receiveShadow = shadowOptions.receiveShadow || false;
    }

    #createBoxRenderer(shadowOptions = {}) {
        const geometry = new THREE.BoxGeometry(2, 2);
        const material = new THREE.MeshToonMaterial({ color: this.color });
        this.boxMesh = new THREE.Mesh(geometry, material);
    }

    instantiate(scene, physicsWorld, isBox = false) {
        if (isBox) this.#createBoxRenderer();
        else this.#createRenderer();
        this.#createBody();

        scene.add(this.sphereMesh);
        physicsWorld.addBody(this.sphereBody);
        this.bindMeshBody();
    }

    bindMeshBody() {
        this.sphereMesh.position.copy(this.sphereBody.position);
        this.sphereMesh.quaternion.copy(this.sphereBody.quaternion);
    }
}
