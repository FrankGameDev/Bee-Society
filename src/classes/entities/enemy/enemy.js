import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../../../utils/gltfCustomLoader";

const minSpeed = 250;
const maxSpeed = 300;
const damage = 1;

const enemyModelPath = "/bee_low_poly/scene.gltf";

export class Enemy {
    /**
     *
     * @param {{position: THREE.Vector3, damageMultiplier: number}} options
     * @param {{onDeathCallback: event, onDefenderKill: event}} callbacks
     * @param {[]} farmingSpots
     */
    constructor(
        options,
        scene,
        physicsWorld,
        callbacks,
        farmingSpots,
        defendingBees
    ) {
        if (!options) console.error("enemy options not available");
        // mesh and body settings
        this.radius = 10;
        this.position = options.position;
        this.color = new THREE.Color("red");
        this.mass = 1;

        this.modelLoader = new GLTFCustomLoader();
        this.modelsToLoad = {
            enemy: enemyModelPath,
        };
        this.enemyModel = undefined;

        this.enemyMesh = undefined;
        this.enemyBody = undefined;

        this.scene = scene;
        this.physicsWorld = physicsWorld;

        //logic fields
        if (!callbacks) throw new Error("Callbacks must be specified");
        this.onDeathCallback = callbacks.onDeathCallback;
        this.onDefenderKill = callbacks.onDefenderKill;

        if (!farmingSpots)
            throw new Error("Farming spots reference are required");
        this.farmingSpots = farmingSpots;

        if (!defendingBees)
            throw new Error("Defending boids reference are required");
        this.defendingBees = defendingBees;

        this.attackRange = this.radius * 2;
        this.nextDefender = undefined;
        this.isAttacking = false;
        this.attackingRoutine = null;

        this.nextFarm = undefined;
        this.isStealing = false;
        this.harvestingRoutine = null;

        this.nextTargetPosition = undefined;
        this.hp = 10;
        this.isEnabled = false;
        this.damageMultiplier = options.damageMultiplier; // Multiplier slightly increasing each cycle
    }

    // INIT =================================================

    async #createBody() {
        this.enemyBody = new CANNON.Body({
            mass: this.mass,
            shape: new CANNON.Sphere(this.radius),
        });
        this.enemyBody.position.set(
            this.position.x,
            this.position.y,
            this.position.z
        );
    }

    async #createRenderer() {
        if (!this.enemyModel) {
            const model = await this.modelLoader.loadGLTFModel(
                this.modelsToLoad.enemy
            );
            this.enemyModel = model.scene.children[0].clone();
            this.enemyModel.scale.multiplyScalar(10);
            this.enemyModel.rotation.z = Math.PI / 2; //Rotates the model in order to face the right target
            this.enemyModel.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                    });
                }
            });
        }

        //If there is an error during loading the model
        const geometry = new THREE.SphereGeometry(this.radius);
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
        });
        this.enemyMesh = new THREE.Mesh(geometry, material);
        if (this.enemyModel) this.enemyMesh.add(this.enemyModel);
    }

    async instantiate() {
        await this.#createRenderer();
        await this.#createBody();

        this.scene.add(this.enemyMesh);
        this.physicsWorld.addBody(this.enemyBody);
        this.#bindMeshBody(this.position);
    }

    // DAMAGING
    takeDamage(amount = 1) {
        this.hp -= amount;
        if (this.hp <= 0) this.die();
    }

    die() {
        this.#resetState();
        this.scene.remove(this.enemyMesh);
        if (this.enemyMesh.geometry) {
            this.enemyMesh.geometry.dispose();
        }

        if (this.enemyMesh.material) {
            this.enemyMesh.material.dispose();
        }
        this.enemyMesh = undefined;

        this.enemyBody.world.removeBody(this.enemyBody);
        this.enemyBody = undefined;

        this.onDeathCallback(this);
    }

    // UPDATE LOGIC =================================================================

    #bindMeshBody(lookAtTarget) {
        this.enemyMesh.position.copy(this.enemyBody.position);
        this.enemyMesh.lookAt(lookAtTarget);
    }

    update() {
        /*
            1. choose which object attack
            3. If defending bot, attack and apply 1 damage per second.
            2. If farming spot, drain the pollen and disable it for 1 cycle
        */

        if (!this.isEnabled) return;

        let nextDefender = undefined;
        let nextFarm = undefined;
        [nextDefender, nextFarm] = this.#getNearestObjectives();
        let defenderDistance = undefined;
        let farmDistance = undefined;
        if (nextDefender)
            defenderDistance = nextDefender.beeMesh.position.distanceTo(
                this.enemyMesh.position
            );
        if (farmDistance)
            farmDistance = nextFarm.spotMesh.position.distanceTo(
                this.enemyMesh.position
            );

        if (!this.isAttacking && defenderDistance <= farmDistance) {
            this.#resetState();
            this.nextTargetPosition = nextDefender.enemyMesh.position;
            this.#attackDefender(nextDefender);
        } else if (!this.isAttacking && !this.isStealing && nextFarm) {
            this.#resetState();
            this.nextTargetPosition = nextFarm.spotMesh.position;
            this.#stealPollen(nextFarm);
        } else console.warn("No defender and farm found");

        this.#moveTowardsTarget(this.nextTargetPosition);
        this.#bindMeshBody(this.nextTargetPosition);
    }

    /**
     *
     * @param {THREE.Vector3} target
     */
    #moveTowardsTarget(target) {
        // if (this.enemyMesh.position.distanceTo(target) <= 50) {
        //     this.enemyBody.velocity.set(0, 0, 0);
        //     this.enemyBody.sleep();
        //     return;
        // }
        let acceleration = new THREE.Vector3(
            this.enemyBody.velocity.x,
            this.enemyBody.velocity.y,
            this.enemyBody.velocity.z
        );
        const targetVelocity = new THREE.Vector3()
            .subVectors(target, this.enemyBody.position)
            .normalize()
            .multiplyScalar(minSpeed);

        acceleration.add(targetVelocity);
        if (acceleration.length() > maxSpeed) {
            acceleration.normalize().multiplyScalar(maxSpeed);
        }
        this.enemyBody.velocity.copy(acceleration);
    }

    /**
     * Get the nearest objectives
     * @returns Tuple containing the nearest defender and farm
     */
    #getNearestObjectives() {
        let nextDefender = this.#getNearestDefender();
        let nextFarm = this.#getNearestFarm();

        return [nextDefender, nextFarm];
    }

    #getNearestFarm() {
        if (this.farmingSpots.length === 0) return null;
        let filteredFarmingSpots = this.farmingSpots.filter(
            (f) => f.currentPollenLevel > 0
        );
        if (filteredFarmingSpots.length === 0) return null;

        let nearest = filteredFarmingSpots[0];
        let minDistance = filteredFarmingSpots[0].spotMesh.position.distanceTo(
            this.enemyMesh.position
        );
        filteredFarmingSpots.forEach((spot) => {
            const distance = spot.spotMesh.position.distanceTo(
                this.enemyMesh.position
            );
            if (distance < minDistance) {
                nearest = spot;
                minDistance = distance;
            }
        });

        return nearest;
    }

    #getNearestDefender() {
        if (this.defendingBees.length === 0) return null;
        let nearest = this.defendingBees[0];
        let minDistance = this.defendingBees[0].beeMesh.position.distanceTo(
            this.enemyMesh.position
        );
        this.defendingBees.forEach((bee) => {
            const distance = bee.beeMesh.position.distanceTo(
                this.enemyMesh.position
            );
            if (distance < minDistance) {
                nearest = bee;
                minDistance = distance;
            }
        });

        return nearest;
    }

    /**
     * Attack defender logic
     * @param {*} nextDefender
     */
    #attackDefender(nextDefender) {
        if (this.isAttacking || this.attackingRoutine) return;

        if (
            this.enemyMesh.position.distanceTo(nextDefender.beeMesh.position) >
            100
        ) {
            return;
        }

        this.isAttacking = true;
        this.nextDefender = nextDefender;
        this.attackingRoutine = setInterval(
            function () {
                this.nextDefender.takeDamage(damage * this.damageMultiplier);
                if (this.nextDefender.health <= 0) {
                    this.onDefenderKill(this.nextDefender);
                    this.nextDefender = null;
                    this.isAttacking = false;
                    clearInterval(this.attackingRoutine);
                    this.attackingRoutine = null;
                }
            }.bind(this),
            1000
        );
    }

    #stealPollen(nextFarm) {
        if (this.isStealing || this.harvestingRoutine) return;
        if (
            this.enemyMesh.position.distanceTo(nextFarm.spotMesh.position) > 100
        ) {
            return;
        }
        this.isStealing = true;
        this.nextFarm = nextFarm;
        this.harvestingRoutine = setInterval(
            function () {
                this.nextFarm.harvestPollen();
                if (this.nextFarm.currentPollenLevel <= 0) {
                    this.nextFarm.wasAttacked = true;
                    this.nextFarm = null;
                    this.isStealing = false;
                    clearInterval(this.harvestingRoutine);
                    this.harvestingRoutine = null;
                }
            }.bind(this),
            500
        );
    }

    #resetState() {
        this.isStealing = false;
        this.isAttacking = false;
        if (this.harvestingRoutine) clearInterval(this.harvestingRoutine);
        if (this.attackingRoutine) clearInterval(this.attackingRoutine);
        this.harvestingRoutine = undefined;
        this.attackingRoutine = undefined;
    }
}
