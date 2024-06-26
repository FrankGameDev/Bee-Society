import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFCustomLoader } from "../../../utils/gltfCustomLoader";

const startingMinSpeed = 100;
const startingMaxSpeed = 250;

const separationRange = 50;
const cohesionRange = 50;
const alignmentRange = 50;

const beeModelPath = "/ps1_bee/scene.gltf";

export default class Bee {
    /**
     *
     * @param {{radius: number, position: THREE.Vector3, mass: number, color: THREE.Color, modelEnabled: boolean}} options
     * @param {Array} farmingSpots
     * @param {GameManager} gameManager
     */
    constructor(
        options,
        farmingSpots,
        scene,
        physicsWorld,
        sceneInitializer,
        gameManager
    ) {
        if (!options) console.error("Bee options not available");
        if (!gameManager) console.error("Game manager not available");
        this.gameManager = gameManager;

        this.radius = options.radius;
        this.startPosition = options.position;
        this.color = options.color;
        this.mass = options.mass;

        this.minSpeed = () =>
            startingMinSpeed * this.gameManager.getBeeMovementSpeedMultiplier();
        this.maxSpeed = () =>
            startingMaxSpeed * this.gameManager.getBeeMovementSpeedMultiplier();

        this.modelEnabled = options.modelEnabled;
        this.modelLoader = new GLTFCustomLoader();
        this.modelsToLoad = {
            bee: beeModelPath,
        };
        this.beeModel = undefined;

        this.farmingSpots = farmingSpots;

        this.beeMesh = undefined;
        this.beeBody = undefined;

        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.sceneInitializer = sceneInitializer;
        this.nextHarvestingSpot = undefined;
        this.boidAlgoProperties = {};
    }

    // INITIALIZATION =================================================================

    async #createBody() {
        this.beeBody = new CANNON.Body({
            mass: this.mass,
            shape: new CANNON.Sphere(this.radius),
        });
        this.beeBody.position.set(
            this.startPosition.x,
            this.startPosition.y,
            this.startPosition.z
        );
    }

    async #createRenderer() {
        if (this.modelEnabled && !this.beeModel) {
            const model = await this.modelLoader.loadGLTFModel(
                this.modelsToLoad.bee
            );
            this.beeModel = model.scene.children[0].clone();
            this.beeModel.scale.multiplyScalar(15);
            this.beeModel.position.y -= 20;
            this.beeModel.rotation.z = Math.PI / 2; //Rotates the model in order to face the right target
            this.beeModel.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                    });
                }
            });
        }

        const geometry = new THREE.SphereGeometry(this.radius);
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: false,
        });
        this.beeMesh = new THREE.Mesh(geometry, material);
        if (this.beeModel) this.beeMesh.add(this.beeModel);
    }

    async instantiate() {
        await this.#createRenderer();
        await this.#createBody();

        this.scene.add(this.beeMesh);
        this.physicsWorld.addBody(this.beeBody);
        this.#bindMeshBody(this.startPosition);

        addEventListener("click", this.#onMouseClick.bind(this), false);
    }

    // UPDATE LOGIC =================================================

    #bindMeshBody(lookAtTarget) {
        this.beeMesh.position.copy(this.beeBody.position);
        this.beeMesh.lookAt(lookAtTarget);
    }

    update(boidAlgoProperties, neighbors, target) {
        this.boidAlgoProperties = boidAlgoProperties;

        let nextTarget = target.clone();
        if (this.nextHarvestingSpot) {
            nextTarget.copy(this.nextHarvestingSpot.spotMesh.position);
            nextTarget.y += 50;
        }
        //Locomotion
        let acceleration = this.#applyBoidAlghoritm(nextTarget, neighbors);
        this.beeBody.velocity.copy(acceleration);
        this.#bindMeshBody(nextTarget);

        // Harvesting logic
        if (this.nextHarvestingSpot) {
            this.#harvestPollen();
        }
    }

    enable(position = this.startPosition) {
        if (!this.beeMesh || !this.beeBody) return;

        this.scene.add(this.beeMesh);
        this.physicsWorld.addBody(this.beeBody);

        this.beeBody.position.copy(position);
    }

    disable() {
        this.resetHarvesting();
        this.scene.remove(this.beeMesh);
        this.physicsWorld.removeBody(this.beeBody);
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
     */
    #harvestPollen() {
        if (!this.nextHarvestingSpot || this.harvestHandler) return;

        if (
            this.beeMesh.position.distanceTo(
                this.nextHarvestingSpot.spotMesh.position
            ) > 200
        ) {
            return;
        }

        // if target reached
        this.harvestHandler = setInterval(
            function () {
                const harvestedPollen = this.nextHarvestingSpot.harvestPollen();
                this.gameManager.addPollen(harvestedPollen);
                if (this.nextHarvestingSpot.currentPollenLevel <= 0) {
                    this.readyToHarvest = false;
                    this.nextHarvestingSpot = null;
                    this.resetHarvesting();
                }
            }.bind(this),
            1000
        );
    }

    resetHarvesting() {
        clearInterval(this.harvestHandler);
        this.harvestHandler = null;
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
            .multiplyScalar(this.minSpeed());

        const separationVelocity = this.#separation(neighbors).multiplyScalar(
            this.boidAlgoProperties.separationWeight
        );
        const alignmentVelocity = this.#alignment(neighbors).multiplyScalar(
            this.boidAlgoProperties.alignmentWeight
        );
        const cohesionVelocity = this.#cohesion(neighbors).multiplyScalar(
            this.boidAlgoProperties.cohesionWeight
        );
        const wanderVelocity = this.#wander().multiplyScalar(
            this.boidAlgoProperties.wanderWeight
        );

        acceleration.add(separationVelocity);
        acceleration.add(alignmentVelocity);
        acceleration.add(cohesionVelocity);
        acceleration.add(targetVelocity);
        acceleration.add(wanderVelocity);

        // limit velocity
        if (acceleration.length() > this.maxSpeed()) {
            acceleration.normalize().multiplyScalar(this.maxSpeed());
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
     * Wander logic
     * @returns {THREE.Vector3} velocity vector for wandering
     */
    #wander() {
        const wanderDistance = 250;
        const wanderJitter = 50;

        // Get a random vector within a cube, which extends from 2.5 to -2.5
        const randomVector = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        )
            .normalize()
            .multiplyScalar(wanderJitter);

        let normalizedVelocity = new THREE.Vector3();
        normalizedVelocity.set(
            this.beeBody.velocity.x,
            this.beeBody.velocity.y,
            this.beeBody.velocity.z
        );
        normalizedVelocity = normalizedVelocity.normalize();

        const circleCenter = normalizedVelocity.multiplyScalar(wanderDistance);

        // Combine the circle center and the random vector to get the wander force
        const wanderForce = circleCenter.add(randomVector);

        return wanderForce;
    }
}
