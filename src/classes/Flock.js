import Boid from "./Boid";
import * as THREE from "three";

/**
 * Handles a boid's flock
 */
export default class Flock {
    /**
     *
     * @param {number} boidCount
     * @param {{radius: number, mass: number, color: THREE.Color, boidDetectionRadius: number}} boidInfo
     */
    constructor(boidCount, boidInfo, scene, physicsWorld) {
        this.boidCount = boidCount;
        if (boidInfo == null) boidInfo = {};

        this.boidRadius = boidInfo.boidRadius || 1;
        this.boidMass = boidInfo.boidMass || 0;
        this.boidColor = boidInfo.boidColor || new THREE.Color("green");
        this.boidDetectionRadius = boidInfo.boidDetectionRadius || 50;
        this.boids = Array(boidCount);

        this.scene = scene;
        this.physicsWorld = physicsWorld;
    }

    instantiateFlock() {
        for (let i = 0; i < this.boidCount; i++) {
            const position = new THREE.Vector3();
            const boid = new Boid(
                this.boidRadius,
                position,
                this.boidColor,
                this.boidMass
            );
            this.boids.push(boid);
        }

        this.boids.forEach((boid) => {
            boid.instantiate(this.scene, this.physicsWorld);
        });
    }

    updateBoids(obstacles, target = new THREE.Vector3()) {
        this.boids.forEach((boid) => {
            boid.update(this.boids, obstacles, target);
        });
    }
}
