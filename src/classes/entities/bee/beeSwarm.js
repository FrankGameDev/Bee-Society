import { GameManager } from "../../gameManager";
import Bee from "./bee";
import * as THREE from "three";
import { GUI } from "dat.gui";

/**
 * Handles a bee's swarm
 */
export default class BeeSwarm {
    /**
     *
     * @param {number} beeCount
     * @param {{radius: number, mass: number, color: THREE.Color, beeDetectionRadius: number, startPosition: THREE.Vector3, modelEnabled: boolean}} beeInfo
     * @param {Array} farmingSpots
     * @param {THREE.Scene} scene
     * @param {CANNON.World} physicsWorld
     * @param {GameManager} gameManager
     * @param {GUI} gui
     */
    constructor(
        startingBeeAmount,
        beeInfo,
        farmingSpots,
        scene,
        physicsWorld,
        sceneInitializer,
        gameManager,
        gui
    ) {
        this.startingBeeAmount = startingBeeAmount;
        if (beeInfo == null) beeInfo = {};

        this.beeRadius = beeInfo.radius || 1;
        this.beeMass = beeInfo.mass || 0;
        this.beeColor = beeInfo.color || new THREE.Color("green");
        this.beeDetectionRadius = beeInfo.beeDetectionRadius || 50;
        this.beeStartPosition =
            beeInfo.startPosition || new THREE.Vector3(0, 10, 0);
        this.beeModelEnabled = beeInfo.modelEnabled;
        this.bees = [];
        this.getBeeCount = () => this.bees.length;

        this.farmingSpots = farmingSpots;

        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.sceneInitializer = sceneInitializer;
        this.gameManager = gameManager;

        this.boidsAlgoProperties = {
            cohesionWeight: 0.3,
            separationWeight: 500,
            alignmentWeight: 0.1,
            wanderWeight: 5,
        };
        const boidFolder = gui.addFolder("Bee");
        boidFolder.add(this.boidsAlgoProperties, "cohesionWeight", 0, 10);
        boidFolder.add(
            this.boidsAlgoProperties,
            "separationWeight",
            0,
            1000,
            5
        );
        boidFolder.add(this.boidsAlgoProperties, "alignmentWeight", 0, 2);
        boidFolder.add(this.boidsAlgoProperties, "wanderWeight", 0, 10);
        boidFolder.open();
    }

    async instantiateFlock() {
        for (let i = 0; i < this.startingBeeAmount; i++) {
            this.addNewBee();
        }
        this.bees.forEach(async (bee) => await bee.instantiate());
    }

    update(target = new THREE.Vector3()) {
        this.bees.forEach((bee) => {
            bee.update(this.boidsAlgoProperties, this.bees, target);
        });
    }

    async addNewBee(instantiate = false) {
        const bee = new Bee(
            {
                radius: this.beeRadius,
                position: this.beeStartPosition,
                color: this.beeColor,
                mass: this.beeMass,
                modelEnabled: this.beeModelEnabled,
                detectionRadius: this.beeDetectionRadius,
            },
            this.farmingSpots,
            this.scene,
            this.physicsWorld,
            this.sceneInitializer,
            this.gameManager
        );
        this.bees.push(bee);
        if (instantiate) await bee.instantiate();
    }

    enableAll() {
        this.bees.forEach((bee) => bee.enable());
    }

    disableAll() {
        this.bees.forEach((bee) => bee.disable());
    }
}
