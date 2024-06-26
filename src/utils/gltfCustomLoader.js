import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class GLTFCustomLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader().setPath("resources/gltf");
        this.models = {};
    }

    /**
     * Load a single model from a gltf file
     * @param {*} path
     * @returns promise with the loaded model in the result
     */
    loadGLTFModel(path) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => resolve(gltf),
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Async function to load all the gltf models defined inside the input object
     * Funzione asincrona per caricare tutti i modelli GLTF
     * @param {modelName: string, path: string} objects
     * @returns
     */
    async loadAllModels(objects) {
        const models = [];
        for (let [modelName, path] of Object.entries(objects)) {
            try {
                const gltf = await this.loadGLTFModel(path);
                this.models[modelName] = gltf;
            } catch (error) {
                console.error(
                    `Errore nel caricamento del modello ${path}:`,
                    error
                );
            }
        }
        return this.models;
    }
}
