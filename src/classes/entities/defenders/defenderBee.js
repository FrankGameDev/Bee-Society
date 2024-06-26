import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../../../utils/gltfCustomLoader";

const startingMinSpeed = 100;
const startingMaxSpeed = 250;

const beeModelPath = "/bee_low_poly/scene.gltf";

export default class DefenderBee {
    /**
     *
     * @param {{radius: number, position: THREE.Vector3, mass: number, detectionRadius: number, color: THREE.Color, modelEnabled: boolean}} options
     * @param {Array} enemies
     * @param {{onDeathCallback: event, onEnemyKillCallback: event}} callbacks
     * @param {event} onDeathCallback
     */
    constructor(options, enemies, scene, physicsWorld, gameManager, callbacks) {
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
        this.gameManager = gameManager;

        this.hp = 10;
        this.isAttacking = false;

        this.minSpeed = () =>
            startingMinSpeed *
            this.gameManager.getDefenderMovementSpeedMultiplier();
        this.maxSpeed = () =>
            startingMaxSpeed *
            this.gameManager.getDefenderMovementSpeedMultiplier();
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
            this.beeModel.scale.multiplyScalar(20);
            this.beeModel.rotation.z = Math.PI / 2;
        }

        const geometry = new THREE.SphereGeometry(this.radius);
        const material = new THREE.MeshBasicMaterial({
            wireframe: true,
            color: new THREE.Color("green"),
            // opacity: 0,
        });
        this.beeMesh = new THREE.Mesh(geometry, material);
        if (this.beeModel) this.beeMesh.add(this.beeModel);

        this.beeMesh.castShadow = shadowOptions.castShadow || false;
        this.beeMesh.receiveShadow = shadowOptions.receiveShadow || false;
    }

    async instantiate() {
        await this.#createRenderer();
        await this.#createBody();

        this.scene.add(this.beeMesh);
        this.physicsWorld.addBody(this.beeBody);
        this.#bindMeshBody();
    }

    // UPDATE LOGIC =================================================

    #bindMeshBody() {
        this.beeMesh.position.copy(this.beeBody.position);
        this.beeMesh.quaternion.copy(this.beeBody.quaternion);
    }

    //TODO: Add turn velocity and wander logic
    update() {
        //Locomotion
        this.nearestEnemy = this.#reachNearestEnemy();

        if (
            !this.isAttacking &&
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
        this.#resetState();
        this.scene.remove(this.beeMesh);
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
            .multiplyScalar(this.minSpeed());

        acceleration.add(targetVelocity);
        if (acceleration.length() > this.maxSpeed()) {
            acceleration.normalize().multiplyScalar(this.maxSpeed());
        }
        this.beeBody.velocity.copy(acceleration);

        return this.nearestEnemy;
    }

    #attackEnemy() {
        if (!this.nearestEnemy) {
            console.log("No enemy near");
            return;
        }
        if (this.isAttacking) return;

        this.isAttacking = true;
        this.attackingRoutine = setInterval(
            function () {
                this.nearestEnemy.takeDamage(1);
                if (this.nearestEnemy.hp <= 0) {
                    this.onEnemyKillCallback(this.nearestEnemy);
                    this.nearestEnemy = null;
                    this.isAttacking = false;
                    clearInterval(this.attackingRoutine);
                    this.attackingRoutine = null;
                }
            }.bind(this),
            1000
        );
    }

    onEnemyKilledReset(killedEnemy) {
        if (
            this.isAttacking &&
            this.nearestEnemy &&
            this.nearestEnemy === killedEnemy
        )
            this.#resetState();
    }

    #resetState() {
        if (this.attackingRoutine) clearInterval(this.attackingRoutine);
        this.attackingRoutine = undefined;
        this.isAttacking = false;
    }
}
