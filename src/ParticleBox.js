import Particle from "./Particle";
import * as THREE from "three";

export default class ParticleBox {
    constructor(
        boxInfo, // {boxSize, boxPosition}
        particleInfo // {particleRadius, particleMass, particleColor}
    ) {
        this.boxSize = boxInfo.boxSize; // {width, height, depth}
        this.boxPosition = boxInfo.boxPosition; // {x, y, z}
        this.particleRadius = particleInfo.particleRadius;
        this.particleMass = particleInfo.particleMass;
        this.particleColor = particleInfo.particleColor;
        this.particles = [];

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
        const material = new THREE.MeshNormalMaterial({ wireframe: true });
        this.boxMesh = new THREE.Mesh(geometry, material);
        scene.add(this.boxMesh);
        this.boxMesh.position.set(
            this.boxPosition.x,
            this.boxPosition.y,
            this.boxPosition.z
        );
    }

    createParticles(numParticles) {
        for (let i = 0; i < numParticles; i++) {
            const position = this.#getRandomPosition();
            const particle = new Particle(
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

    updateParticles() {
        this.particles.forEach((particle) => {
            particle.bindMeshBody();
        });
    }
}
