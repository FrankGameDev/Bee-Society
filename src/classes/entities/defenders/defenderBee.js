import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../../../utils/gltfCustomLoader";

const startingMinSpeed = 200;
const startingMaxSpeed = 400;

const separationRange = 50;
const cohesionRange = 50;
const alignmentRange = 50;

const beeModelPath = "/ps1_bee/scene.gltf";

export default class DefenderBee {
    /**
     *
     * @param {{radius: number, position: THREE.Vector3, mass: number, color: THREE.Color, modelEnabled: boolean}} options
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

    async #createRenderer() {
        if (this.modelEnabled && !this.beeModel) {
            const model = await this.modelLoader.loadGLTFModel(
                this.modelsToLoad.bee
            );
            this.beeModel = model.scene.children[0].clone();
            this.beeModel.scale.multiplyScalar(25);
            this.beeModel.rotation.z = Math.PI / 2;
            this.beeModel.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                    });
                }
            });
        }

        const geometry = new THREE.SphereGeometry(this.radius);
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
        });
        this.beeMesh = new THREE.Mesh(geometry, material);
        if (this.beeModel) this.beeMesh.add(this.beeModel);
    }

    async instantiate() {
        await this.#createRenderer();
        await this.#createBody();

        this.scene.add(this.beeMesh);
        this.physicsWorld.addBody(this.beeBody);
        this.#bindMeshBody(this.startPosition);
    }

    // UPDATE LOGIC =================================================

    #bindMeshBody(lookAtTarget) {
        this.beeMesh.position.copy(this.beeBody.position);
        this.beeMesh.lookAt(lookAtTarget);
    }

    update(boidAlgoProperties, neighbors) {
        this.nearestEnemy = this.#getNearestEnemy();
        this.boidAlgoProperties = boidAlgoProperties;
        //Locomotion
        this.nextTarget = this.#goToTheNextTarget(this.nearestEnemy, neighbors);

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
        this.#bindMeshBody(this.nextTarget);
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

    #goToTheNextTarget(nearestEnemy, neighbors) {
        let nextTarget = new THREE.Vector3();
        if (!nearestEnemy) nextTarget.copy(this.startPosition);
        else nextTarget.copy(nearestEnemy.enemyMesh.position);

        let acceleration = this.#applyBoidAlghoritm(nextTarget, neighbors);
        this.beeBody.velocity.copy(acceleration);
        return nextTarget;
    }

    #attackEnemy() {
        if (!this.nearestEnemy) {
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

    // BOID LOGIC =================================================

    /**
     *
     * @param {THREE.Vector3} target Desired target position
     * @param {*} neighbors All the bee neighbors
     * @returns calculated acceleration
     */
    #applyBoidAlghoritm(target, neighbors) {
        let acceleration = new THREE.Vector3(
            this.beeBody.velocity.x,
            this.beeBody.velocity.y,
            this.beeBody.velocity.z
        );

        const targetVelocity = new THREE.Vector3()
            .subVectors(target, this.beeBody.position)
            .normalize()
            .multiplyScalar(this.minSpeed());

        const separationVelocity = this.#separation(neighbors).multiplyScalar(
            this.boidAlgoProperties.separationWeight
        );
        const alignmentVelocity = this.#alignment(neighbors).multiplyScalar(
            this.boidAlgoProperties.alignmentWeight
        );
        const cohesionVelocity = this.#cohesion(neighbors).multiplyScalar(
            this.boidAlgoProperties.cohesionWeight
        );
        const wanderVelocity = this.#wander().multiplyScalar(
            this.boidAlgoProperties.wanderWeight
        );

        acceleration.add(separationVelocity);
        acceleration.add(alignmentVelocity);
        acceleration.add(cohesionVelocity);
        acceleration.add(targetVelocity);
        acceleration.add(wanderVelocity);

        // limit velocity
        if (acceleration.length() > this.maxSpeed()) {
            acceleration.normalize().multiplyScalar(this.maxSpeed());
        }
        return acceleration;
    }
    /**
     * Separation logic
     * @param {Bee[]} neighbors
     * @returns {THREE.Vector3} velocity vector for separation
     */
    #separation(neighbors) {
        let separationForce = new THREE.Vector3();

        neighbors.forEach((neighbour) => {
            const distance = neighbour.beeMesh.position.distanceTo(
                this.beeMesh.position
            );
            // la forza di separazione aumenta inversamente alla distanza,
            // così i boids che si avvicinano troppo tra loro saranno respinti con una forza maggiore.
            if (distance < separationRange && distance > 0) {
                let repulsion = new THREE.Vector3()
                    .subVectors(
                        this.beeMesh.position,
                        neighbour.beeMesh.position
                    )
                    .divideScalar(distance)
                    .divideScalar(distance);
                separationForce.add(repulsion);
            }
        });

        return separationForce;
    }

    /**
     * Alignemnt logic
     * @param {Bee[]} neighbors
     * @returns {THREE.Vector3} velocity vector for alignment
     */
    #alignment(neighbors) {
        let avgVelocity = new THREE.Vector3();
        let neighbourInRange = 0;

        neighbors.forEach((neighbour) => {
            const distance = neighbour.beeMesh.position.distanceTo(
                this.beeMesh.position
            );

            if (distance < alignmentRange) {
                avgVelocity.add(neighbour.beeBody.velocity);
                neighbourInRange += 1;
            }
        });

        if (neighbourInRange > 0)
            avgVelocity
                .divideScalar(neighbourInRange)
                .sub(this.beeBody.velocity);

        return avgVelocity;
    }

    /**
     * Cohesion logic
     * @param {Bee[]} neighbors
     * @returns {THREE.Vector3} velocity vector for cohesion
     */
    #cohesion(neighbors) {
        let avgPosition = new THREE.Vector3();
        let neighbourInRange = 0;

        neighbors.forEach((neighbour) => {
            const distance = neighbour.beeMesh.position.distanceTo(
                this.beeMesh.position
            );

            if (distance < cohesionRange) {
                avgPosition.add(neighbour.beeMesh.position);
                neighbourInRange += 1;
            }
        });

        if (neighbourInRange > 0)
            avgPosition
                .divideScalar(neighbourInRange)
                .sub(this.beeMesh.position);

        return avgPosition;
    }
    /**
     * Wander logic
     * @returns {THREE.Vector3} velocity vector for wandering
     */
    #wander() {
        const wanderDistance = 500;
        const wanderJitter = 50;

        // Get a random vector within a cube, which extends from 2.5 to -2.5
        const randomVector = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        )
            .normalize()
            .multiplyScalar(wanderJitter);

        let normalizedVelocity = new THREE.Vector3();
        normalizedVelocity.set(
            this.beeBody.velocity.x,
            this.beeBody.velocity.y,
            this.beeBody.velocity.z
        );
        normalizedVelocity = normalizedVelocity.normalize();

        const circleCenter = normalizedVelocity.multiplyScalar(wanderDistance);

        // Combine the circle center and the random vector to get the wander force
        const wanderForce = circleCenter.add(randomVector);

        return wanderForce;
    }
}
