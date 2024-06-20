import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../utils/gltfCustomLoader";

const minSpeed = 5;
const maxSpeed = 500;

const cohesionWeight = 0.8;
const separationWeight = 0.5;
const alignmentWeight = 0.9;
const obstacleAvoidanceWeight = 0;

const separationRange = 50;
const cohesionRange = 50;
const alignmentRange = 50;
const obstacleRange = 50;

const beeModelPath = "/bee_low_poly/scene.gltf";

export default class Bee {
    //TODO: change this to handle custom mesh
    /**
     *
     * @param {{radius: number, position: THREE.Vector3, mass: number, detectionRadius: number, color: THREE.Color, modelEnabled: boolean}} options
     */
    constructor(options) {
        if (!options) console.error("Bee options not available");
        this.radius = options.radius;
        this.position = options.position;
        this.color = options.color;
        this.mass = options.mass;
        this.detectionRadius =
            options.detectionRadius > this.radius
                ? options.detectionRadius
                : this.radius * 2;

        this.modelEnabled = options.modelEnabled;
        this.modelLoader = new GLTFCustomLoader();
        this.modelsToLoad = {
            bee: beeModelPath,
        };
        this.beeModel = undefined;

        this.boidMesh = undefined;
        this.boidBody = undefined;

        this.scene = null;
    }

    // INITIALIZATION =================================================================

    async #createBody() {
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
    async #createRenderer(shadowOptions = {}) {
        if (this.modelEnabled && !this.beeModel) {
            const model = await this.modelLoader.loadGLTFModel(
                this.modelsToLoad.bee
            );
            this.beeModel = model.scene.children[0].clone();
        }

        if (!this.beeModel) {
            const geometry = new THREE.SphereGeometry(this.radius);
            const material = new THREE.MeshToonMaterial({ color: this.color });
            this.boidMesh = new THREE.Mesh(geometry, material);
        } else {
            const geometry = new THREE.SphereGeometry(this.radius);
            const material = new THREE.MeshBasicMaterial({ wireframe: true });
            this.boidMesh = new THREE.Mesh(geometry, material);

            this.beeModel.position.copy(this.boidMesh);
        }
        this.boidMesh.castShadow = shadowOptions.castShadow || false;
        this.boidMesh.receiveShadow = shadowOptions.receiveShadow || false;
    }

    async instantiate(scene, physicsWorld) {
        await this.#createRenderer();
        await this.#createBody();

        scene.add(this.boidMesh);
        scene.add(this.beeModel);
        physicsWorld.addBody(this.boidBody);
        this.#bindMeshBody();

        this.scene = scene;
    }

    // UPDATE LOGIC =================================================

    #bindMeshBody() {
        this.boidMesh.position.copy(this.boidBody.position);
        this.boidMesh.quaternion.copy(this.boidBody.quaternion);

        if (this.beeModel) {
            this.beeModel.position.copy(this.boidBody.position);
            this.beeModel.quaternion.copy(this.boidBody.quaternion);
        }
    }

    //TODO: Add turn velocity and wander logic
    update(neighbors, target) {
        let acceleration = this.#applyBoidAlghoritm(target, neighbors);

        this.boidBody.velocity.copy(acceleration);

        this.#bindMeshBody();
    }

    // JS EVENTS =================================================
    onMouseClick(event) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Normalize mouse coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, sceneInitializer.camera);

        // Get  intersections
        const intersects = raycaster.intersectObjects(
            //TODO give the bee all the farming spots
            this.farmingSpots.map((spot) => spot.spotMesh)
        );

        if (intersects.length > 0) {
            this.#harvestPollen(intersects[0].object.instance);
        }
    }

    // BOID LOGIC =================================================================

    /**
     * Harvest pollen from the given farming spot
     * @param {A} farmingSpot
     */
    #harvestPollen(farmingSpot) {}

    /**
     *
     * @param {THREE.Vector3} target Desired target position
     * @param {*} neighbors All the bee neighbors
     * @returns calculated acceleration
     */
    #applyBoidAlghoritm(target, neighbors) {
        let acceleration = new THREE.Vector3(
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
        // let obstacleAvoidanceVelocity = this.#obstacleAvoidance(
        //     obstacles
        // ).multiplyScalar(obstacleAvoidanceWeight);

        // // Esempio di visualizzazione delle forze di evitamento degli ostacoli
        // let obstacleAvoidanceArrow = new THREE.ArrowHelper(
        //     obstacleAvoidanceVelocity.clone().normalize(),
        //     this.boidMesh.position,
        //     obstacleAvoidanceVelocity.length(),
        //     0xffff00
        // );
        // this.scene.add(obstacleAvoidanceArrow);
        // this.acceleration.add(obstacleAvoidanceVelocity);

        acceleration.add(separationVelocity);
        acceleration.add(alignmentVelocity);
        acceleration.add(cohesionVelocity);
        acceleration.add(targetVelocity);

        // limit velocity
        if (acceleration.length() > maxSpeed) {
            acceleration.normalize().multiplyScalar(maxSpeed);
        }

        return acceleration;
    }
    /**
     * Separation logic
     * @param {Bee[]} neighbors
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
     * @param {Bee[]} neighbors
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
     * @param {Bee[]} neighbors
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
