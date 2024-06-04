import * as THREE from "three";
import * as CANNON from "cannon-es";

export default class Particle {
    constructor(radius, position, color, mass) {
        this.radius = radius;
        this.position = position;
        this.color = color;
        this.mass = mass;

        this.sphereMesh = undefined;
        this.sphereBody = undefined;
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

    #createRenderer() {
        const geometry = new THREE.SphereGeometry(this.radius);
        const material = new THREE.MeshBasicMaterial({ color: this.color });
        this.sphereMesh = new THREE.Mesh(geometry, material);
    }

    instantiate(scene, physicsWorld) {
        this.#createRenderer();
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
