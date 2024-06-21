import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../utils/gltfCustomLoader";

const minSpeed = 100;
const maxSpeed = 250;

const cohesionWeight = 0.3;
const separationWeight = 500;
const alignmentWeight = 0.1;
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
     * @param {Array} farmingSpots
     */
    constructor(options, farmingSpots, sceneInitializer) {
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

        this.farmingSpots = farmingSpots;

        this.beeMesh = undefined;
        this.beeBody = undefined;

        this.scene = null;
        this.sceneInitializer = sceneInitializer;
        this.nextHarvestingSpot = undefined;
    }

    // INITIALIZATION =================================================================

    async #createBody() {
        this.beeBody = new CANNON.Body({
            mass: this.mass,
            shape: new CANNON.Sphere(this.radius),
        });
        this.beeBody.position.set(
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
            this.beeMesh = new THREE.Mesh(geometry, material);
        } else {
            const geometry = new THREE.SphereGeometry(this.radius);
            const material = new THREE.MeshBasicMaterial({
                wireframe: true,
                opacity: 0,
            });
            this.beeMesh = new THREE.Mesh(geometry, material);

            this.beeModel.position.copy(this.beeMesh);
        }
        this.beeMesh.castShadow = shadowOptions.castShadow || false;
        this.beeMesh.receiveShadow = shadowOptions.receiveShadow || false;
    }

    async instantiate(scene, physicsWorld) {
        await this.#createRenderer();
        await this.#createBody();

        scene.add(this.beeMesh);
        scene.add(this.beeModel);
        physicsWorld.addBody(this.beeBody);
        this.#bindMeshBody();

        this.scene = scene;

        addEventListener("click", this.#onMouseClick.bind(this), false);
    }

    // UPDATE LOGIC =================================================

    #bindMeshBody() {
        this.beeMesh.position.copy(this.beeBody.position);
        this.beeMesh.quaternion.copy(this.beeBody.quaternion);

        if (this.beeModel) {
            this.beeModel.position.copy(this.beeBody.position);
            this.beeModel.quaternion.copy(this.beeBody.quaternion);
        }
    }

    //TODO: Add turn velocity and wander logic
    update(neighbors, target) {
        //Locomotion
        let acceleration = this.#applyBoidAlghoritm(
            this.nextHarvestingSpot
                ? this.nextHarvestingSpot.spotMesh.position
                : target,
            neighbors
        );
        this.beeBody.velocity.copy(acceleration);
        this.#bindMeshBody();

        // Harvesting logic
        if (this.nextHarvestingSpot) {
            this.#harvestPollen();
        }
    }

    // JS EVENTS =================================================
    #onMouseClick(event) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Normalize mouse coordinates
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, this.sceneInitializer.camera);

        // Get  intersections
        const intersects = raycaster.intersectObjects(
            this.farmingSpots
                .filter((spot) => spot.isEnabled)
                .map((spot) => spot.spotMesh)
        );

        if (intersects.length > 0) {
            const selectedFarmingSpot = intersects[0].object.instance;
            this.nextHarvestingSpot = selectedFarmingSpot;
            this.resetHarvesting();
        }
    }

    /**
     * Harvest pollen from the given farming spot
     * @param {A} farmingSpot
     */
    #harvestPollen() {
        if (!this.nextHarvestingSpot) return;
        if (this.harvestHandler) return;

        if (
            this.beeMesh.position.distanceTo(
                this.nextHarvestingSpot.spotMesh.position
            ) > 100
        ) {
            console.log("Reaching the target...");
            return;
        }

        // if target reached
        this.harvestHandler = setInterval(
            function () {
                const harvestedPollen = this.nextHarvestingSpot.harvestPollen();
                console.log("harvesting...");
                //TODO Update UI and currency
                if (this.nextHarvestingSpot.currentPollenLevel <= 0) {
                    this.readyToHarvest = false;
                    this.nextHarvestingSpot = null;
                    this.resetHarvesting();
                    console.log("Ending harvesting...");
                }
            }.bind(this),
            1000
        );
    }

    resetHarvesting() {
        clearInterval(this.harvestHandler);
        this.harvestHandler = null;
        console.log("Reset harvesting...");
    }

    // BOID LOGIC =================================================================

    /**
     *
     * @param {THREE.Vector3} target Desired target position
     * @param {*} neighbors All the bee neighbors
     * @returns calculated acceleration
     */
    #applyBoidAlghoritm(target, neighbors) {
        let acceleration = new THREE.Vector3(
            this.beeBody.velocity.x,
            this.beeBody.velocity.y,
            this.beeBody.velocity.z
        );

        const targetVelocity = new THREE.Vector3()
            .subVectors(target, this.beeBody.position)
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
        //     this.beeMesh.position,
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
            const distance = neighbour.beeMesh.position.distanceTo(
                this.beeMesh.position
            );
            // la forza di separazione aumenta inversamente alla distanza,
            // così i boids che si avvicinano troppo tra loro saranno respinti con una forza maggiore.
            if (distance < separationRange && distance > 0) {
                let repulsion = new THREE.Vector3()
                    .subVectors(
                        this.beeMesh.position,
                        neighbour.beeMesh.position
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
            const distance = neighbour.beeMesh.position.distanceTo(
                this.beeMesh.position
            );

            if (distance < alignmentRange) {
                avgVelocity.add(neighbour.beeBody.velocity);
                neighbourInRange += 1;
            }
        });

        if (neighbourInRange > 0)
            avgVelocity
                .divideScalar(neighbourInRange)
                .sub(this.beeBody.velocity);

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
            const distance = neighbour.beeMesh.position.distanceTo(
                this.beeMesh.position
            );

            if (distance < cohesionRange) {
                avgPosition.add(neighbour.beeMesh.position);
                neighbourInRange += 1;
            }
        });

        if (neighbourInRange > 0)
            avgPosition
                .divideScalar(neighbourInRange)
                .sub(this.beeMesh.position);

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
        const speed = this.beeBody.velocity.length();

        // Esegui il calcolo solo se il boid si sta muovendo
        if (speed <= minSpeed) return new THREE.Vector3();
        detectedObstacles.forEach((obstacle) => {
            const toObstacle = new THREE.Vector3().subVectors(
                obstacle.position,
                this.beeMesh.position
            );
            const distance = toObstacle.length();

            if (distance > 0 && distance < obstacleRange) {
                const toBoid = new THREE.Vector3().subVectors(
                    this.beeMesh.position,
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
            this.beeMesh.position,
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
