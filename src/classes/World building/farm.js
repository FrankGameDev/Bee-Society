import * as THREE from "three";
import * as CANNON from "cannon-es";
import { FarmingSpot } from "./farmingSpot";

const planeDimension = { x: 10000, y: 10000 };

export class Farm {
    constructor(scene, physicsWorld) {
        // Input save
        this.scene = scene;
        this.physicsWorld = physicsWorld;

        // Field definition
        this.groundMesh = undefined;
        this.farmingSpotPositions = [];
        this.farmingSpots = [];

        //Texture loader
        this.textureLoader = new THREE.TextureLoader();
        this.grassTexture = this.textureLoader.load(
            "resources/textures/grass/Grass001_1K-JPG_Color.jpg"
        );
        this.grassTexture.wrapS = THREE.RepeatWrapping;
        this.grassTexture.wrapT = THREE.RepeatWrapping;
        this.grassTexture.repeat.set(5, 5);

        this.grassNormalMap = this.textureLoader.load(
            "resources/textures/grass/Grass001_1K-JPG_NormalGL.jpg"
        );
        this.grassDisplacement = this.textureLoader.load(
            "resources/textures/grass/Grass001_1K-JPG_Displacement.jpg"
        );

        this.sky = this.textureLoader.load("resources/jpg/blueSky.jpg");

        // this.scene.background = this.sky;
    }

    createFarm(farmingSpotCount = 10) {
        this.#defineGround();
        this.#generateHive();
        this.#generateFarmingSpot(farmingSpotCount);
    }

    #defineGround() {
        //Renderer
        let groundGeo = new THREE.PlaneGeometry(
            planeDimension.x,
            planeDimension.y
        );
        let groundMat = new THREE.MeshPhongMaterial({
            map: this.grassTexture,
            normalMap: this.grassNormalMap,
            displacementMap: this.grassDisplacement,
        });
        this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
        this.groundMesh.receiveShadow = true;
        // Physics
        let groundBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
        });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.physicsWorld.addBody(groundBody);
        this.scene.add(this.groundMesh);

        this.groundMesh.position.copy(groundBody.position);
        this.groundMesh.quaternion.copy(groundBody.quaternion);
    }

    #generateHive() {
        let hive = new THREE.SphereGeometry(200);
        let hiveMat = new THREE.MeshPhongMaterial({
            color: new THREE.Color("yellow"),
        });
        let hiveMesh = new THREE.Mesh(hive, hiveMat);
        this.scene.add(hiveMesh);

        hiveMesh.position.set(0, 350, 0);
        hiveMesh.castShadow = true;
        hiveMesh.receiveShadow = true;
    }

    /**
     * First, generate all the farming spot positions, in order to don't have to worry about colliding spots
     * Then, instantiate it
     * @param {Amount of farming spot} farmingSpotCount
     */
    #generateFarmingSpot(farmingSpotCount) {
        let count = 0;
        while (count < farmingSpotCount) {
            const randomPos = this.#getRandomPositionOnGround();
            if (
                !this.farmingSpotPositions.find(
                    (pos) =>
                        pos === randomPos || randomPos.distanceTo(pos) < 250 //TODO: Handle this
                )
            ) {
                this.farmingSpotPositions.push(randomPos);
                count += 1;
            }
        }

        this.farmingSpotPositions.forEach((pos) => {
            let newFarmingSpot = new FarmingSpot();
            newFarmingSpot.spawnFlower(pos, this.scene);
            this.farmingSpots.push(newFarmingSpot);
            // let tmpCube = new THREE.BoxGeometry(200, 200, 200);
            // let tmpCubeMat = new THREE.MeshBasicMaterial({
            //     color: new THREE.Color("red"),
            // });
            // let tmpCubeMesh = new THREE.Mesh(tmpCube, tmpCubeMat);
            // tmpCubeMesh.position.set(pos.x, 100, pos.y);
            // this.scene.add(tmpCubeMesh);
        });
    }

    #getRandomPositionOnGround() {
        return new THREE.Vector3(
            (Math.random() - 0.5) * planeDimension.x,
            0,
            (Math.random() - 0.5) * planeDimension.y
        );
    }
}
