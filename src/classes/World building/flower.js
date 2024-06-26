import * as THREE from "three";
import { GLTFCustomLoader } from "../../utils/gltfCustomLoader";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

const flowerGLTF = "/flowers/scene.gltf";
const maxPollen = 10;

export class Flower {
    constructor() {
        this.modelLoader = new GLTFCustomLoader();
        this.modelsToLoad = {
            flower: flowerGLTF,
        };
        this.models = {};
        this.spotMesh = undefined;
        this.flowerLabel = undefined;
        this.currentPollenLevel = maxPollen;
        this.isEnabled = true;
        this.wasAttacked = false;
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
            flower.scale.multiplyScalar(50);
            flower.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                    });
                }
            });
            scene.add(flower);

            // Spawn a mesh to enable the onClick event intersection
            const spotClickableGeometry = new THREE.BoxGeometry(
                flower.scale.x / 25,
                flower.scale.y / 25,
                flower.scale.z / 25
            );
            const spotClickableMaterial = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0,
            });
            this.spotMesh = new THREE.Mesh(
                spotClickableGeometry,
                spotClickableMaterial
            );
            this.spotMesh.position.set(
                flower.position.x,
                flower.position.y + flower.scale.y,
                flower.position.z
            );
            this.spotMesh.scale.copy(flower.scale);
            flower.castShadow = true;
            flower.receiveShadow = true;
            scene.add(this.spotMesh);
            this.spotMesh.instance = this;

            //Pollen label
            this.flowerLabel = document.createElement("p");
            this.flowerLabel.className = "";
            this.flowerLabel.textContent = `${this.currentPollenLevel}`;

            this.flowerPollenProgressBar = document.createElement("div");
            this.flowerPollenProgressBar.className = "progress";
            this.flowerPollenProgressBar.style.width = "5vw";
            this.flowerPollenLvl = document.createElement("div");
            this.flowerPollenLvl.className = "progress-bar bg-warning";
            this.flowerPollenLvl.style.width = "100%";
            this.flowerPollenLvl.ariaValueNow = this.currentPollenLevel;
            this.flowerPollenLvl.ariaValueMax = this.currentPollenLevel;
            this.flowerPollenLvl.ariaValueMin = 0;
            this.flowerPollenLvl.role = "progressbar";
            // this.flowerPollenLvl.appendChild(this.flowerLabel);
            this.flowerPollenProgressBar.appendChild(this.flowerPollenLvl);

            const div = document.createElement("div");
            // div.appendChild(this.flowerLabel);
            div.appendChild(this.flowerPollenProgressBar);
            const divObj = new CSS2DObject(div);
            scene.add(divObj);
            divObj.position.copy(flower.position);
            divObj.position.z += 100;
        });
    }

    /**
     * Harvest pollen every second. If there are no more pollen, doesn't harvest anything and disable this farming spot
     * @returns
     */
    harvestPollen() {
        this.currentPollenLevel -= 0.25;

        this.flowerPollenLvl.ariaValueNow = this.currentPollenLevel;
        this.flowerPollenLvl.style.width = `${
            (this.currentPollenLevel * 100) / 10
        }%`;

        if (this.currentPollenLevel <= 0) {
            this.#disableFarmingSpot();
        }
        return this.currentPollenLevel >= 0 ? 0.25 : 0;
    }

    resetPollen() {
        if (this.wasAttacked) {
            this.currentPollenLevel = Math.floor(maxPollen / 3);
            this.wasAttacked = false;
        } else this.currentPollenLevel = maxPollen;
        this.isEnabled = true;

        this.flowerPollenLvl.ariaValueNow = this.currentPollenLevel;
        this.flowerPollenLvl.style.width = `${
            (this.currentPollenLevel * 100) / 10
        }%`;
        this.flowerPollenProgressBar.classList.toggle("hide", false);
    }

    #disableFarmingSpot() {
        this.isEnabled = false;
        this.flowerPollenProgressBar.classList.toggle("hide", true);
    }
}
