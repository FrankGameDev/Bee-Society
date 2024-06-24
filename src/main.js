import * as THREE from "three";
import * as CANNON from "cannon-es";
import { SceneInit } from "./utils/SceneInit";
import CannonDebugger from "cannon-es-debugger";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { GameManager } from "./classes/gameManager";

let sceneInitializer = undefined;
let physicsWorld = undefined;
let scene = undefined;
let farm = undefined;
let dayNightCycle = undefined;
let swarm = undefined;
let enemyManager = undefined;
let gameManager = undefined;
let uiManager = undefined;

function definePhysics() {
    physicsWorld = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.81, 0),
    });
}

function defineRender() {
    sceneInitializer = new SceneInit();
    sceneInitializer.initialize();
    sceneInitializer.animate();

    const axesHelper = new THREE.AxesHelper(8);
    sceneInitializer.scene.add(axesHelper);
    scene = sceneInitializer.scene;
}

async function main() {
    defineRender();
    definePhysics();

    const cannonDebugger = new CannonDebugger(scene, physicsWorld);
    gameManager = new GameManager(scene, physicsWorld, sceneInitializer);
    await gameManager.init();

    const animate = () => {
        requestAnimationFrame(animate);
        physicsWorld.fixedStep();
        gameManager.update();
    };

    animate();
    console.log("Step");
}

main();
