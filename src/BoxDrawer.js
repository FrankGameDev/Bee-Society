import Boid from "./object/Boid";
import Obstacle from "./object/Obstacle";
import * as THREE from "three";

export default class BoxDrawer {
    constructor(
        boxInfo, // {boxSize, boxPosition}
        particleInfo, // {particleRadius, particleMass, particleColor}
        boidInfo // {radius, mass, color}
    ) {
        this.boxSize = boxInfo.boxSize; // {width, height, depth}
        this.boxPosition = boxInfo.boxPosition; // {x, y, z}
        if (particleInfo != null) {
            this.particleRadius = particleInfo.particleRadius;
            this.particleMass = particleInfo.particleMass;
            this.particleColor = particleInfo.particleColor;
            this.particles = [];
        }
        if (boidInfo != null) {
            this.boidRadius = boidInfo.boidRadius;
            this.boidMass = boidInfo.boidMass;
            this.boidColor = boidInfo.boidColor;
            this.boids = [];
        }

        this.boxMesh = undefined;
    }

    #getRandomPosition() {
        return {
            x: (Math.random() - 0.5) * this.boxSize.width + this.boxPosition.x,
            y: (Math.random() - 0.5) * this.boxSize.height + this.boxPosition.y,
            z: (Math.random() - 0.5) * this.boxSize.depth + this.boxPosition.z,
        };
    }

    createBoxRenderer(scene) {
        const geometry = new THREE.BoxGeometry(
            this.boxSize.width,
            this.boxSize.height,
            this.boxSize.depth
        );
        const material = new THREE.MeshNormalMaterial({
            wireframe: true,
        });
        this.boxMesh = new THREE.Mesh(geometry, material);
        scene.add(this.boxMesh);
        this.boxMesh.position.set(
            this.boxPosition.x,
            this.boxPosition.y,
            this.boxPosition.z
        );
    }

    createBoids(numBoids) {
        for (let i = 0; i < numBoids; i++) {
            const position = this.#getRandomPosition();
            const boid = new Boid(
                this.boidRadius,
                position,
                this.boidColor,
                this.boidMass
            );
            this.boids.push(boid);
        }
    }

    createParticles(numParticles) {
        for (let i = 0; i < numParticles; i++) {
            const position = this.#getRandomPosition();
            const particle = new Obstacle(
                this.particleRadius,
                position,
                this.particleColor,
                this.particleMass
            );
            this.particles.push(particle);
        }
    }

    instantiateParticles(scene, physicsWorld) {
        this.particles.forEach((particle) => {
            particle.instantiate(scene, physicsWorld);
        });
    }

    instantiateBoids(scene, physicsWorld) {
        this.boids.forEach((boid) => {
            boid.instantiate(scene, physicsWorld);
        });
    }

    updateParticles() {
        this.particles.forEach((particle) => {
            particle.bindMeshBody();
        });
    }

    updateBoids(target = new THREE.Vector3()) {
        this.boids.forEach((boid) => {
            boid.update(this.boids, target);
        });
    }
}
