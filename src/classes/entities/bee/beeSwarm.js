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
     */
    constructor(
        beeCount,
        beeInfo,
        farmingSpots,
        scene,
        physicsWorld,
        sceneInitializer
    ) {
        this.beeCount = beeCount;
        if (beeInfo == null) beeInfo = {};

        this.beeRadius = beeInfo.radius || 1;
        this.beeMass = beeInfo.mass || 0;
        this.beeColor = beeInfo.color || new THREE.Color("green");
        this.beeDetectionRadius = beeInfo.beeDetectionRadius || 50;
        this.beeStartPosition =
            beeInfo.startPosition || new THREE.Vector3(0, 10, 0);
        this.beeModelEnabled = beeInfo.modelEnabled;
        this.bees = [];

        this.farmingSpots = farmingSpots;

        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.sceneInitializer = sceneInitializer;
    }

    async instantiateFlock() {
        for (let i = 0; i < this.beeCount; i++) {
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
                this.sceneInitializer
            );
            this.bees.push(bee);
        }

        this.bees.forEach(async (bee) => {
            await bee.instantiate(this.scene, this.physicsWorld);
        });
    }

    update(target = new THREE.Vector3()) {
        this.bees.forEach((bee) => {
            bee.update(this.bees, target);
        });
    }
}
