import * as THREE from "three";
import * as CANNON from "cannon-es";
import { SceneInit } from "./utils/SceneInit";
import Obstacle from "./classes/unused/Obstacle";
import CannonDebugger from "cannon-es-debugger";
import BoxDrawer from "./classes/unused/BoxDrawer";
import BeeSwarm from "./classes/entities/bee/beeSwarm";
import { Farm } from "./classes/World building/farm";
import { DayNightCycle } from "./classes/World building/dayNightCycle";
import { EnemyManager } from "./classes/entities/enemy/enemyManager";
import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { UiManager } from "./classes/ui/uiManager";
import { GameManager } from "./classes/gameManager";

let sceneInitializer = undefined;
let physicsWorld = undefined;
let scene = undefined;
let farm = undefined;
let dayNightCycle = undefined;
let swarm = undefined;
let enemiesManager = undefined;
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

async function loadAll() {
    defineRender();
    definePhysics();

    const cannonDebugger = new CannonDebugger(scene, physicsWorld);

    farm = new Farm(scene, physicsWorld);
    await farm.createFarm();
    console.log("farm loaded");

    dayNightCycle = new DayNightCycle(scene);
    console.log("day night cycle loaded");

    // enemiesManager = new EnemyManager(10, {}, farm.farmingSpots, [], {
    //     dimension: farm.getGroundDimension(),
    // });
    // await enemiesManager.instantiateEnemies(scene, physicsWorld);
    // console.log("Enemies loaded");

    gameManager = new GameManager(dayNightCycle, farm);
    console.log("Game manager loaded");
    uiManager = new UiManager(gameManager);
    console.log("UI manager loaded");
    swarm = new BeeSwarm(
        5,
        {
            radius: 20,
            mass: 1,
            startPosition: new THREE.Vector3(100, 0, 0),
            modelEnabled: true,
        },
        farm.farmingSpots,
        scene,
        physicsWorld,
        sceneInitializer,
        gameManager
    );
    await swarm.instantiateFlock();
    console.log("swarm loaded");
}

async function main() {
    await loadAll();

    const animate = () => {
        requestAnimationFrame(animate);
        physicsWorld.fixedStep();
        dayNightCycle.updateCycle();

        swarm.update(farm.hiveMesh.position);
    };

    animate();
    console.log("Step");
}

main();
