import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../utils/gltfCustomLoader";

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
     */
    constructor(options, onDeathCallback, farmingSpots, defendingBees) {
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

        this.scene = null;

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

        this.hp = 10;
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

    async instantiate(scene, physicsWorld) {
        await this.#createRenderer();
        await this.#createBody();

        scene.add(this.enemyMesh);
        scene.add(this.enemyModel);
        physicsWorld.addBody(this.enemyBody);
        this.#bindMeshBody();

        this.scene = scene;
    }

    // DAMAGING
    takeDamage(amount = 1) {
        this.hp -= amount;
        if (this.hp <= 0) this.#die();
    }

    #die() {
        //TODO: remove this enemy from the active enemies vector
        this.enemyMesh = undefined;
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

        let nextDefender = undefined;
        let nextFarm = undefined;
        [nextDefender, nextFarm] = this.#getNearestObjectives();
        const defenderDistance = nextDefender.beeMesh.position.distanceTo(
            this.enemyMesh.position
        );
        const farmDistance = nextFarm.spotMesh.position.distanceTo(
            this.enemyMesh.position
        );

        if (!this.isAttacking && defenderDistance <= farmDistance) {
            this.#resetState();
            this.#attackDefender(nextDefender);
        } else if (!this.isAttacking && !this.isStealing && nextFarm) {
            this.#resetState();
            this.#stealPollen(nextFarm);
        } else throw new Error("No defender and farm found");

        this.#bindMeshBody();
    }

    /**
     * Get the nearest objectives
     * @returns Tuple containing the nearest defender and farm
     */
    #getNearestObjectives() {
        let nextDefender = this.#getNearestDefender();
        let nextFarm = this.#getNearestFarm();

        return nextDefender, nextFarm;
    }

    #getNearestFarm() {
        let nearest = farmingSpots[0];
        let minDistance = farmingSpots[0].spotMesh.position.distanceTo(
            this.enemyMesh.position
        );
        this.farmingSpots.forEach((spot) => {
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
        let nearest = defendingBees[0];
        let minDistance = defendingBees[0].beeMesh.position.distanceTo(
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
