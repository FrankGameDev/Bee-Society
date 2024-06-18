import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const minSpeed = 5;
const maxSpeed = 10;

const cohesionWeight = 0.8;
const separationWeight = 0.5;
const alignmentWeight = 0.1;
const obstacleAvoidanceWeight = 0;

const separationRange = 50;
const cohesionRange = 50;
const alignmentRange = 50;
const obstacleRange = 50;

export default class Boid {
    //TODO: change this to handle custom mesh
    constructor(radius, position, color, mass, detectionRadius, mesh) {
        this.radius = radius;
        this.position = position;
        if (mesh) {
            loader.load(mesh, function (gltf) {
                scene.add(gltf.scene);
            });
        } else {
            this.color = color;
        }
        this.mass = mass;
        this.detectionRadius =
            detectionRadius > radius ? detectionRadius : radius * 2;

        this.boidMesh = undefined;
        this.boidBody = undefined;

        this.acceleration = undefined;
        this.scene = null;
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

    /**
     *
     * @param {*} shadowOptions -> Defines all the shadow options of the boid
     */
    #createRenderer(shadowOptions = {}) {
        const geometry = new THREE.SphereGeometry(this.radius);
        const material = new THREE.MeshToonMaterial({ color: this.color });
        this.boidMesh = new THREE.Mesh(geometry, material);
        this.boidMesh.castShadow = shadowOptions.castShadow || false;
        this.boidMesh.receiveShadow = shadowOptions.receiveShadow || false;
    }

    instantiate(scene, physicsWorld) {
        this.#createRenderer();
        this.#createBody();

        scene.add(this.boidMesh);
        physicsWorld.addBody(this.boidBody);
        this.#bindMeshBody();

        this.scene = scene;
    }

    #bindMeshBody() {
        this.boidMesh.position.copy(this.boidBody.position);
        this.boidMesh.quaternion.copy(this.boidBody.quaternion);
    }

    //TODO: Add turn velocity and obstacle avoidance
    update(neighbors, obstacles, target) {
        this.acceleration = new THREE.Vector3(
            this.boidBody.velocity.x,
            this.boidBody.velocity.y,
            this.boidBody.velocity.z
        );

        const targetVelocity = new THREE.Vector3()
            .subVectors(target, this.boidBody.position)
            .normalize()
            .multiplyScalar(minSpeed);

        const separationVelocity =
            this.#separation(neighbors).multiplyScalar(separationWeight);
        const alignmentVelocity =
            this.#alignment(neighbors).multiplyScalar(alignmentWeight);
        const cohesionVelocity =
            this.#cohesion(neighbors).multiplyScalar(cohesionWeight);
        let obstacleAvoidanceVelocity = this.#obstacleAvoidance(
            obstacles
        ).multiplyScalar(obstacleAvoidanceWeight);

        // Esempio di visualizzazione delle forze di evitamento degli ostacoli
        let obstacleAvoidanceArrow = new THREE.ArrowHelper(
            obstacleAvoidanceVelocity.clone().normalize(),
            this.boidMesh.position,
            obstacleAvoidanceVelocity.length(),
            0xffff00
        );
        // this.scene.add(obstacleAvoidanceArrow);

        this.acceleration.add(separationVelocity);
        this.acceleration.add(alignmentVelocity);
        this.acceleration.add(cohesionVelocity);
        this.acceleration.add(obstacleAvoidanceVelocity);
        this.acceleration.add(targetVelocity);

        // Limita la velocità massima
        if (this.acceleration.length() > maxSpeed) {
            this.acceleration.normalize().multiplyScalar(maxSpeed);
        }

        this.boidBody.velocity.copy(this.acceleration);

        this.#bindMeshBody();
    }

    /**
     * Separation logic
     * @param {Boid[]} neighbors
     * @param {number} range
     * @default range --> separationRange
     * @returns {THREE.Vector3} velocity vector for separation
     */
    #separation(neighbors) {
        let separationForce = new THREE.Vector3();

        neighbors.forEach((neighbour) => {
            const distance = neighbour.boidMesh.position.distanceTo(
                this.boidMesh.position
            );
            // la forza di separazione aumenta inversamente alla distanza,
            // così i boids che si avvicinano troppo tra loro saranno respinti con una forza maggiore.
            if (distance < separationRange && distance > 0) {
                let repulsion = new THREE.Vector3()
                    .subVectors(
                        this.boidMesh.position,
                        neighbour.boidMesh.position
                    )
                    .divideScalar(distance)
                    .divideScalar(distance);
                separationForce.add(repulsion);
            }
        });

        return separationForce;
    }

    /**
     * Alignemnt logic
     * @param {Boid[]} neighbors
     * @returns {THREE.Vector3} velocity vector for alignment
     */
    #alignment(neighbors) {
        let avgVelocity = new THREE.Vector3();
        let neighbourInRange = 0;

        neighbors.forEach((neighbour) => {
            const distance = neighbour.boidMesh.position.distanceTo(
                this.boidMesh.position
            );

            if (distance < alignmentRange) {
                avgVelocity.add(neighbour.boidBody.velocity);
                neighbourInRange += 1;
            }
        });

        if (neighbourInRange > 0)
            avgVelocity
                .divideScalar(neighbourInRange)
                .sub(this.boidBody.velocity);

        return avgVelocity;
    }

    /**
     * Cohesion logic
     * @param {Boid[]} neighbors
     * @returns {THREE.Vector3} velocity vector for cohesion
     */
    #cohesion(neighbors) {
        let avgPosition = new THREE.Vector3();
        let neighbourInRange = 0;

        neighbors.forEach((neighbour) => {
            const distance = neighbour.boidMesh.position.distanceTo(
                this.boidMesh.position
            );

            if (distance < cohesionRange) {
                avgPosition.add(neighbour.boidMesh.position);
                neighbourInRange += 1;
            }
        });

        if (neighbourInRange > 0)
            avgPosition
                .divideScalar(neighbourInRange)
                .sub(this.boidMesh.position);

        return avgPosition;
    }

    /**
     * Obstacle avoidance logic using raycasting
     * @param {THREE.Mesh[]} obstacles
     * @returns {THREE.Vector3} velocity vector for obstacle avoidance
     */
    #obstacleAvoidance(obstacles) {
        const avoidanceForce = new THREE.Vector3();
        let detectedObstacles = this.#detectObstacles(obstacles);
        const speed = this.boidBody.velocity.length();

        // Esegui il calcolo solo se il boid si sta muovendo
        if (speed <= minSpeed) return new THREE.Vector3();
        detectedObstacles.forEach((obstacle) => {
            const toObstacle = new THREE.Vector3().subVectors(
                obstacle.position,
                this.boidMesh.position
            );
            const distance = toObstacle.length();

            if (distance > 0 && distance < obstacleRange) {
                const toBoid = new THREE.Vector3().subVectors(
                    this.boidMesh.position,
                    obstacle.position
                );
                avoidanceForce.add(
                    toBoid.divideScalar(distance).divideScalar(distance)
                );
            }
        });

        return avoidanceForce;
    }

    /**
     *
     * @param {THREE.Mesh[]} obstacles
     * @returns {THREE.Mesh[]}
     */
    #detectObstacles(obstacles) {
        let detectedObstacles = [];

        // Define the boid's bounding sphere
        const boidBoundingSphere = new THREE.Sphere(
            this.boidMesh.position,
            this.detectionRadius
        );

        obstacles.forEach((obstacle) => {
            const obstacleBoundingSphere = new THREE.Sphere();
            obstacle.geometry.computeBoundingSphere();
            obstacleBoundingSphere.copy(obstacle.geometry.boundingSphere);
            obstacleBoundingSphere.applyMatrix4(obstacle.matrixWorld);

            if (boidBoundingSphere.intersectsSphere(obstacleBoundingSphere)) {
                detectedObstacles.push(obstacle);
            }
        });

        return detectedObstacles;
    }
}
