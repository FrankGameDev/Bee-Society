import Bee from "./Bee";
import * as THREE from "three";

/**
 * Handles a bee's swarm
 */
export default class BeeSwarm {
    /**
     *
     * @param {number} beeCount
     * @param {{radius: number, mass: number, color: THREE.Color, beeDetectionRadius: number, startPosition: THREE.Vector3, modelEnabled: boolean}} beeInfo
     * @param {THREE.Scene} scene
     * @param {CANNON.World} physicsWorld
     */
    constructor(beeCount, beeInfo, scene, physicsWorld) {
        this.beeCount = beeCount;
        if (beeInfo == null) beeInfo = {};

        this.beeRadius = beeInfo.radius || 1;
        this.beeMass = beeInfo.mass || 0;
        this.beeColor = beeInfo.color || new THREE.Color("green");
        this.beeDetectionRadius = beeInfo.beeDetectionRadius || 50;
        this.beeStartPosition =
            beeInfo.startPosition || new THREE.Vector3(0, 10, 0);
        this.beeModelEnabled = beeInfo.modelEnabled;
        this.bees = Array(beeCount);

        this.scene = scene;
        this.physicsWorld = physicsWorld;
    }

    async instantiateFlock() {
        for (let i = 0; i < this.beeCount; i++) {
            const bee = new Bee({
                radius: this.beeRadius,
                position: this.beeStartPosition,
                color: this.beeColor,
                mass: this.beeMass,
                modelEnabled: this.beeModelEnabled,
                detectionRadius: this.beeDetectionRadius,
            });
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
