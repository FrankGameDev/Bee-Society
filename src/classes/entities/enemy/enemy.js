import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../../../utils/gltfCustomLoader";

const minSpeed = 100;
const maxSpeed = 250;
const damage = 1;
let damageMultiplier = 1; // Multiplier slightly increasing each cycle // TODO bind with cycle logic

const enemyModelPath = "/bee_low_poly/scene.gltf";

export class Enemy {
    /**
     *
     * @param {{position: THREE.Vector3}} options
     * @param {event} onDeathCallback
     * @param {[]} farmingSpots
     */
    constructor(
        options,
        scene,
        physicsWorld,
        onDeathCallback,
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
        if (!onDeathCallback) throw new Error("Callback must be specified");
        this.onDeathCallback = onDeathCallback;

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

    /**
     *
     * @param {*} shadowOptions -> Defines all the shadow options of the enemy object
     */
    async #createRenderer(shadowOptions = {}) {
        if (!this.enemyModel) {
            const model = await this.modelLoader.loadGLTFModel(
                this.modelsToLoad.enemy
            );
            this.enemyModel = model.scene.children[0].clone();
            this.enemyModel.scale.multiplyScalar(10);
        }

        //If there is an error during loading the model
        if (!this.enemyModel) {
            const geometry = new THREE.SphereGeometry(this.radius);
            const material = new THREE.MeshToonMaterial({ color: this.color });
            this.enemyMesh = new THREE.Mesh(geometry, material);
        } else {
            const geometry = new THREE.SphereGeometry(this.radius);
            const material = new THREE.MeshBasicMaterial({
                wireframe: true,
                opacity: 1,
            });
            this.enemyMesh = new THREE.Mesh(geometry, material);

            this.enemyModel.position.copy(this.enemyMesh.position);
        }
        this.enemyMesh.castShadow = shadowOptions.castShadow || false;
        this.enemyMesh.receiveShadow = shadowOptions.receiveShadow || false;
    }

    async instantiate() {
        await this.#createRenderer();
        await this.#createBody();

        this.scene.add(this.enemyMesh);
        this.scene.add(this.enemyModel);
        this.physicsWorld.addBody(this.enemyBody);
        this.#bindMeshBody();
    }

    // DAMAGING
    takeDamage(amount = 1) {
        this.hp -= amount;
        if (this.hp <= 0) this.die();
    }

    die() {
        //TODO: remove this enemy from the active enemies vector
        this.scene.remove(this.enemyMesh);
        this.scene.remove(this.enemyModel);
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

    #bindMeshBody() {
        this.enemyMesh.position.copy(this.enemyBody.position);
        this.enemyMesh.quaternion.copy(this.enemyBody.quaternion);

        if (this.enemyModel) {
            this.enemyModel.position.copy(this.enemyBody.position);
            this.enemyModel.quaternion.copy(this.enemyBody.quaternion);
        }
    }

    update() {
        /*
            1. choose which object attack
            3. If defending bot, attack and apply 1 damage per second.
            2. If farming spot, drain the pollen and disable it for 1 cycle
        */
        this.#bindMeshBody();

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
                nearest = spot;
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
            console.log("Reaching the target...");
            return;
        }

        this.isAttacking = true;
        this.nextDefender = nextDefender;
        this.attackingRoutine = setInterval(
            function () {
                this.nextDefender.takeDamage();
                console.log("Enemy attacking...");
                //TODO Update UI
                if (this.nextDefender.health <= 0) {
                    this.nextDefender = null;
                    this.isAttacking = false;
                    console.log("Ending attacking...");
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
            console.log("Reaching the target...");
            return;
        }
        this.isStealing = true;
        this.nextFarm = nextFarm;
        const harvestingRoutine = setInterval(
            function () {
                this.nextFarm.harvestPollen();
                console.log("Enemy stealing pollen...");
                //TODO Update UI
                if (this.nextFarm.currentPollenLevel <= 0) {
                    this.nextFarm = null;
                    this.isStealing = false;
                    console.log("Ending stealing pollen...");
                    clearInterval(this.harvestingRoutine);
                    this.harvestingRoutine = null;
                }
            }.bind(this),
            1000
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
