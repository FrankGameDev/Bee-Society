import * as THREE from "three";
import * as CANNON from "cannon-es";

const minSpeed = 2;
const maxSpeed = 3;

const numSamplesForSmoothing = 20;

const wanderWeight = 0.2;
// Steer towards the average position of nearby boids
const cohesionWeight = 0.5;
// Steers away from nearby boids
const separationWeight = 0.05;
// Adopt the average velocity of bearby boids
const alignmentWeight = 0.05;

const visionRange = 20;
const separationRange = 2;

export default class Boid {
    //TODO: change this to handle custom mesh
    constructor(radius, position, color, mass) {
        this.radius = radius;
        this.position = position;
        this.color = color;
        this.mass = mass;

        this.boidMesh = undefined;
        this.boidBody = undefined;

        this.acceleration = undefined;
    }

    #createBody() {
        this.boidBody = new CANNON.Body({
            mass: this.mass,
            shape: new CANNON.Sphere(this.radius),
        });
        this.boidBody.position.set(
            this.position.x,
            this.position.y,
            this.position.z
        );
    }

    #createRenderer() {
        const geometry = new THREE.SphereGeometry(this.radius);
        const material = new THREE.MeshToonMaterial({ color: this.color });
        this.boidMesh = new THREE.Mesh(geometry, material);
        this.boidMesh.castShadow = true;
        this.boidMesh.receiveShadow = true;
    }

    instantiate(scene, physicsWorld) {
        this.#createRenderer();
        this.#createBody();

        scene.add(this.boidMesh);
        physicsWorld.addBody(this.boidBody);
        this.#bindMeshBody();
    }

    #bindMeshBody() {
        this.boidMesh.position.copy(this.boidBody.position);
        this.boidMesh.quaternion.copy(this.boidBody.quaternion);
    }

    //TODO: Add turn velocity and obstacle avoidance
    update(neighbors, target) {
        this.acceleration = new THREE.Vector3(
            this.boidBody.velocity.x,
            this.boidBody.velocity.y,
            this.boidBody.velocity.z
        );

        const targetVelocity = new THREE.Vector3()
            .subVectors(target, this.boidBody.position)
            .normalize()
            .multiplyScalar(minSpeed);

        const separationVelocity = this.#separation(
            neighbors,
            separationRange
        ).multiplyScalar(separationWeight);
        const alignmentVelocity = this.#alignment(neighbors)
            .sub(this.boidBody.velocity)
            .multiplyScalar(alignmentWeight);
        const cohesionVelocity = this.#cohesion(neighbors)
            .sub(this.boidBody.position)
            .multiplyScalar(cohesionWeight);

        this.acceleration.add(separationVelocity);
        this.acceleration.add(alignmentVelocity);
        this.acceleration.add(cohesionVelocity);
        this.acceleration.add(targetVelocity);

        this.boidBody.velocity.copy(this.acceleration);

        this.#bindMeshBody();
    }

    // Separation logic

    // la forza di separazione aumenta inversamente alla distanza,
    // così i boids che si avvicinano troppo tra loro saranno respinti con una forza maggiore.
    #separation(neighbors, range = separationRange) {
        let separationForce = new THREE.Vector3();

        neighbors.forEach((neighbour) => {
            const distance = neighbour.boidMesh.position.distanceTo(
                this.boidMesh.position
            );

            if (distance < range && distance > 0) {
                let repulsion = new THREE.Vector3()
                    .subVectors(
                        this.boidMesh.position,
                        neighbour.boidMesh.position
                    )
                    .normalize()
                    .divideScalar(distance);
                separationForce.add(repulsion);
            }
        });

        return separationForce;
    }

    // Alignment logic
    #alignment(neighbors) {
        let avgVelocity = new THREE.Vector3();
        let neighbourInRange = 0;

        neighbors.forEach((neighbour) => {
            const distance = neighbour.boidMesh.position.distanceTo(
                this.boidMesh.position
            );

            if (distance < visionRange) {
                avgVelocity.add(neighbour.boidBody.velocity);
                neighbourInRange += 1;
            }
        });

        if (neighbourInRange > 0) avgVelocity.divideScalar(neighbourInRange);

        return avgVelocity;
    }

    // Cohesion logic
    #cohesion(neighbors) {
        let avgPosition = new THREE.Vector3();
        let neighbourInRange = 0;

        neighbors.forEach((neighbour) => {
            const distance = neighbour.boidMesh.position.distanceTo(
                this.boidMesh.position
            );

            if (distance < visionRange) {
                avgPosition.add(neighbour.boidMesh.position);
                neighbourInRange += 1;
            }
        });

        if (neighbourInRange > 0) avgPosition.divideScalar(neighbourInRange);

        return avgPosition;
    }
}
