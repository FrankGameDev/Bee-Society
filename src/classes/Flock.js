import Boid from "./Boid";
import * as THREE from "three";

/**
 * Handles a boid's flock
 */
export default class Flock {
    /**
     *
     * @param {number} boidCount
     * @param {{radius: number, mass: number, color: THREE.Color, boidDetectionRadius: number, startPosition: THREE.Vector3}} boidInfo
     * @param {THREE.Scene} scene
     * @param {CANNON.World} physicsWorld
     */
    constructor(boidCount, boidInfo, scene, physicsWorld) {
        this.boidCount = boidCount;
        if (boidInfo == null) boidInfo = {};

        this.boidRadius = boidInfo.radius || 1;
        this.boidMass = boidInfo.mass || 0;
        this.boidColor = boidInfo.color || new THREE.Color("green");
        this.boidDetectionRadius = boidInfo.boidDetectionRadius || 50;
        this.boidStartPosition =
            boidInfo.startPosition || new THREE.Vector3(0, 10, 0);
        this.boids = Array(boidCount);

        this.scene = scene;
        this.physicsWorld = physicsWorld;
    }

    instantiateFlock() {
        for (let i = 0; i < this.boidCount; i++) {
            const boid = new Boid(
                this.boidRadius,
                this.boidStartPosition,
                this.boidColor,
                this.boidMass
            );
            this.boids.push(boid);
        }

        this.boids.forEach((boid) => {
            boid.instantiate(this.scene, this.physicsWorld);
        });
    }

    updateFlock(target = new THREE.Vector3()) {
        this.boids.forEach((boid) => {
            boid.update(this.boids, target);
        });
    }
}
