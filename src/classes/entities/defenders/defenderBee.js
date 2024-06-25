import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../../../utils/gltfCustomLoader";

const minSpeed = 1500;
const maxSpeed = 2000;

const beeModelPath = "/bee_2/scene.gltf";

export default class DefenderBee {
    /**
     *
     * @param {{radius: number, position: THREE.Vector3, mass: number, detectionRadius: number, color: THREE.Color, modelEnabled: boolean}} options
     * @param {Array} enemies
     * @param {{onDeathCallback: event, onEnemyKillCallback: event}} callbacks
     * @param {event} onDeathCallback
     */
    constructor(options, enemies, scene, physicsWorld, callbacks) {
        if (!options) console.error("Bee options not available");
        this.radius = options.radius;
        this.startPosition = options.position;
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

        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.enemies = enemies;
        this.nearestEnemy = undefined;

        this.onDeathCallback = callbacks.onDeathCallback;
        this.onEnemyKillCallback = callbacks.onEnemyKillCallback;

        this.hp = 10;
    }

    // INITIALIZATION =================================================================

    async #createBody() {
        this.beeBody = new CANNON.Body({
            mass: this.mass,
            shape: new CANNON.Sphere(this.radius),
        });
        this.beeBody.position.set(
            this.startPosition.x,
            this.startPosition.y,
            this.startPosition.z
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

    async instantiate() {
        await this.#createRenderer();
        await this.#createBody();

        this.scene.add(this.beeMesh);
        this.scene.add(this.beeModel);
        this.physicsWorld.addBody(this.beeBody);
        this.#bindMeshBody();
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
        this.nearestEnemy = this.#reachNearestEnemy();

        if (
            this.nearestEnemy &&
            this.nearestEnemy.enemyMesh.position.distanceTo(
                this.beeMesh.position
            ) < 100
        ) {
            // Can attack
            this.#attackEnemy();
        }
        this.#bindMeshBody();
    }

    takeDamage(amount = 1) {
        this.hp -= amount;
        if (this.hp <= 0) this.die();
    }

    die() {
        this.scene.remove(this.beeMesh);
        this.scene.remove(this.beeModel);
        if (this.beeMesh.geometry) {
            this.beeMesh.geometry.dispose();
        }

        if (this.beeMesh.material) {
            this.beeMesh.material.dispose();
        }
        this.beeMesh = undefined;

        this.beeBody.world.removeBody(this.beeBody);
        this.beeBody = undefined;

        this.onDeathCallback(this);
    }

    #getNearestEnemy() {
        if (this.enemies.length === 0) return null;

        let nearest = this.enemies[0];
        let minDistance = this.enemies[0].enemyMesh.position.distanceTo(
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
    #reachNearestEnemy() {
        this.nextTarget = new THREE.Vector3();
        this.nearestEnemy = this.#getNearestEnemy();
        if (!this.nearestEnemy) this.nextTarget.copy(this.startPosition);
        else this.nextTarget.copy(this.nearestEnemy.enemyMesh.position);

        let acceleration = new THREE.Vector3(
            this.beeBody.velocity.x,
            this.beeBody.velocity.y,
            this.beeBody.velocity.z
        );
        const targetVelocity = new THREE.Vector3()
            .subVectors(this.nextTarget, this.beeBody.position)
            .normalize()
            .multiplyScalar(minSpeed);

        acceleration.add(targetVelocity);
        if (acceleration.length() > maxSpeed) {
            acceleration.normalize().multiplyScalar(maxSpeed);
        }
        this.beeBody.velocity.copy(acceleration);

        return this.nearestEnemy;
    }

    #attackEnemy() {
        if (!this.nearestEnemy) {
            console.log("No enemy near me");
        }
        //TODO implement attack logic
        this.nearestEnemy.takeDamage(1);
        if (this.nearestEnemy.hp <= 0) {
            this.onEnemyKillCallback(this.nearestEnemy);
            this.nearestEnemy = null;
        }
    }
}
