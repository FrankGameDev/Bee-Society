import * as THREE from "three";
import { GLTFCustomLoader } from "../../utils/gltfCustomLoader";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

const flowerGLTF = "/low_poly_flower/scene.gltf";
const maxPollen = 10;

export class FarmingSpot {
    constructor() {
        this.modelLoader = new GLTFCustomLoader();
        this.modelsToLoad = {
            flower: flowerGLTF,
        };
        this.models = {};
        this.spotMesh = undefined;
        this.flowerLabel = undefined;
        this.currentPollenLevel = maxPollen;
    }

    async #loadModels() {
        if (Object.keys(this.models).length === 0) {
            this.models = await this.modelLoader.loadAllModels(
                this.modelsToLoad
            );
        }
    }

    async spawnFlower(position, scene) {
        await this.#loadModels().then(() => {
            let flower = this.models.flower.scene.children[0].clone();
            flower.position.copy(position);
            flower.scale.set(25, 25, 25);
            scene.add(flower);

            // Spawn a mesh to enable the onClick event intersection
            const spotClickableGeometry = new THREE.BoxGeometry(15, 0, 15);
            const spotClickableMaterial = new THREE.MeshBasicMaterial({
                wireframe: true,
            });
            this.spotMesh = new THREE.Mesh(
                spotClickableGeometry,
                spotClickableMaterial
            );
            this.spotMesh.position.set(flower.position.x, 0, flower.position.z);
            this.spotMesh.scale.copy(flower.scale);
            scene.add(this.spotMesh);
            this.spotMesh.instance = this;

            //Pollen label
            this.flowerLabel = document.createElement("p");
            this.flowerLabel.textContent = `${this.currentPollenLevel}`;

            const div = document.createElement("div");
            div.appendChild(this.flowerLabel);
            const divObj = new CSS2DObject(div);
            scene.add(divObj);
            divObj.position.copy(flower.position);
            // divObj.position.y += 200;
        });
    }

    /**
     * Harvest pollen every second. If there are no more pollen, doesn't harvest anything and disable this farming spot
     * @returns
     */
    harvestPollen() {
        this.currentPollenLevel -= 1;
        this.flowerLabel.textContent = `${Math.max(
            0,
            this.currentPollenLevel
        )}`;
        if (this.currentPollenLevel <= 0) {
            //TODO implement
            // DisableFarmingSpot();
        }
        return this.currentPollenLevel >= 0 ? 1 : 0;
    }

    resetPollen() {
        this.currentPollenLevel = maxPollen;
    }
}
