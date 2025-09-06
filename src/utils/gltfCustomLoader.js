import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class GLTFCustomLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.models = {};
    }

    /**
     * Load a single model from a gltf file
     * @param {*} path
     * @returns promise with the loaded model in the result
     */
    loadGLTFModel(path) {
        return new Promise((resolve, reject) => {
            console.log(`Attempting to load GLTF from: ${path}`);
            this.gltfLoader.load(
                path,
                (gltf) => {
                    console.log(`Successfully loaded: ${path}`);
                    resolve(gltf);
                },
                (progress) => {
                    console.log(`Loading progress for ${path}:`, progress);
                },
                (error) => {
                    console.error(`Failed to load GLTF from ${path}:`, error);
                    reject(error);
                }
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
                    `Error loading model ${modelName} from ${path}:`,
                    error
                );
                // Continue loading other models even if one fails
            }
        }
        return this.models;
    }
}
