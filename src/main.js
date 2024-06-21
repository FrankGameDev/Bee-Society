import * as THREE from "three";
import * as CANNON from "cannon-es";
import SceneInit from "./utils/SceneInit";
import Obstacle from "./classes/unused/Obstacle";
import CannonDebugger from "cannon-es-debugger";
import BoxDrawer from "./classes/unused/BoxDrawer";
import BeeSwarm from "./classes/BeeSwarm";
import { Farm } from "./classes/World building/farm";
import { DayNightCycle } from "./classes/World building/dayNightCycle";

let sceneInitializer = undefined;
let physicsWorld = undefined;
let scene = undefined;
let box = undefined;
let farm = undefined;
let dayNightCycle = undefined;
let swarm = undefined;
let target = new THREE.Vector3();

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

function onMouseClick(event) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Normalize mouse coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, sceneInitializer.camera);

    // Get  intersections
    const intersects = raycaster.intersectObjects(
        farm.farmingSpots.map((spot) => spot.spotMesh)
    );

    if (intersects.length > 0) {
        const object = intersects[0].object;
        object.instance.harvestPollen();
        console.log(`Farming spot touched`);
    }
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
        sceneInitializer
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
