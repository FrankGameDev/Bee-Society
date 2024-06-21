import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../utils/gltfCustomLoader";

const minSpeed = 100;
const maxSpeed = 250;

const beeModelPath = "/bee_2/scene.gltf";

export default class DefenderBee {
    //TODO: change this to handle custom mesh
    /**
     *
     * @param {{radius: number, position: THREE.Vector3, mass: number, detectionRadius: number, color: THREE.Color, modelEnabled: boolean}} options
     * @param {Array} enemies
     */
    constructor(options, enemies) {
        if (!options) console.error("Bee options not available");
        this.radius = options.radius;
        this.position = options.position;
        this.color = options.color;
        this.mass = options.mass;
        this.detectionRadius =
            options.detectionRadius > this.radius
                ? options.detectionRadius
                : this.radius * 2;

        this.modelEnabled = options.modelEnabled;
        this.modelLoader = new GLTFCustomLoader();
        this.modelsToLoad = {
            bee: beeModelPath,
        };
        this.beeModel = undefined;

        this.beeMesh = undefined;
        this.beeBody = undefined;

        this.scene = null;
        this.sceneInitializer = sceneInitializer;
        this.enemies = enemies;
        this.nearestEnemy = undefined;
    }

    // INITIALIZATION =================================================================

    async #createBody() {
        this.beeBody = new CANNON.Body({
            mass: this.mass,
            shape: new CANNON.Sphere(this.radius),
        });
        this.beeBody.position.set(
            this.position.x,
            this.position.y,
            this.position.z
        );
    }

    /**
     *
     * @param {*} shadowOptions -> Defines all the shadow options of the boid
     */
    async #createRenderer(shadowOptions = {}) {
        if (this.modelEnabled && !this.beeModel) {
            const model = await this.modelLoader.loadGLTFModel(
                this.modelsToLoad.bee
            );
            this.beeModel = model.scene.children[0].clone();
        }

        if (!this.beeModel) {
            const geometry = new THREE.SphereGeometry(this.radius);
            const material = new THREE.MeshToonMaterial({ color: this.color });
            this.beeMesh = new THREE.Mesh(geometry, material);
        } else {
            const geometry = new THREE.SphereGeometry(this.radius);
            const material = new THREE.MeshBasicMaterial({
                wireframe: true,
                opacity: 0,
            });
            this.beeMesh = new THREE.Mesh(geometry, material);

            this.beeModel.position.copy(this.beeMesh);
        }
        this.beeMesh.castShadow = shadowOptions.castShadow || false;
        this.beeMesh.receiveShadow = shadowOptions.receiveShadow || false;
    }

    async instantiate(scene, physicsWorld) {
        await this.#createRenderer();
        await this.#createBody();

        scene.add(this.beeMesh);
        scene.add(this.beeModel);
        physicsWorld.addBody(this.beeBody);
        this.#bindMeshBody();

        this.scene = scene;
    }

    // UPDATE LOGIC =================================================

    #bindMeshBody() {
        this.beeMesh.position.copy(this.beeBody.position);
        this.beeMesh.quaternion.copy(this.beeBody.quaternion);

        if (this.beeModel) {
            this.beeModel.position.copy(this.beeBody.position);
            this.beeModel.quaternion.copy(this.beeBody.quaternion);
        }
    }

    //TODO: Add turn velocity and wander logic
    update() {
        //Locomotion
        const nearestEnemy = this.#reachNearestEnemy();

        if (nearestEnemy.enemyMesh.distanceTo(this.beeMesh.position) < 10) {
            // Can attack
            this.#attackEnemy();
        }
        this.#bindMeshBody();
    }

    #reachNearestEnemy() {
        function getNearestEnemy() {
            let nearest = enemies[0];
            let minDistance = enemies[0].enemyMesh.position.distanceTo(
                this.beeMesh.position
            );
            this.enemies.forEach((enemy) => {
                const distance = enemy.enemyMesh.position.distanceTo(
                    this.beeMesh.position
                );
                if (distance < minDistance) {
                    nearest = enemy;
                    minDistance = distance;
                }
            });

            return nearest;
        }

        this.nearestEnemy = getNearestEnemy();

        let acceleration = new THREE.Vector3(
            this.beeBody.velocity.x,
            this.beeBody.velocity.y,
            this.beeBody.velocity.z
        );
        const targetVelocity = new THREE.Vector3()
            .subVectors(nearestEnemy.enemyMesh.position, this.beeBody.position)
            .normalize()
            .multiplyScalar(minSpeed);

        acceleration.add(targetVelocity);
        if (acceleration.length() > maxSpeed) {
            acceleration.normalize().multiplyScalar(maxSpeed);
        }
        this.beeBody.velocity.copy(acceleration);

        return nearestEnemy;
    }

    #attackEnemy() {
        if (!this.nearestEnemy) {
            console.log("No enemy near me");
        }

        //TODO implement attack logic
    }
}
