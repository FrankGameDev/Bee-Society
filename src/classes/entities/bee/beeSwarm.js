import { GameManager } from "../../gameManager";
import Bee from "./bee";
import * as THREE from "three";

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
     */
    constructor(
        startingBeeAmount,
        beeInfo,
        farmingSpots,
        scene,
        physicsWorld,
        sceneInitializer,
        gameManager
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
    }

    async instantiateFlock() {
        for (let i = 0; i < this.startingBeeAmount; i++) {
            this.addNewBee();
        }
        this.bees.forEach(async (bee) => await bee.instantiate());

        // this.boidSimulation = new BoidSimulation(
        //     this.bees,
        //     500,
        //     0.1,
        //     0.3,
        //     5,
        //     50,
        //     50,
        //     50
        // );
    }

    update(target = new THREE.Vector3()) {
        this.bees.forEach((bee) => {
            bee.update(this.bees, target);
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
