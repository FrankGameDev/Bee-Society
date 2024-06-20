import * as THREE from "three";
import * as CANNON from "cannon-es";
import SceneInit from "./utils/SceneInit";
import Obstacle from "./classes/Obstacle";
import CannonDebugger from "cannon-es-debugger";
import BoxDrawer from "./classes/BoxDrawer";
import Flock from "./classes/Flock";
import { Farm } from "./classes/World building/farm";
import { DayNightCycle } from "./classes/World building/dayNightCycle";

let sceneInitializer = undefined;
let physicsWorld = undefined;
let scene = undefined;
let box = undefined;
let farm = undefined;
let dayNightCycle = undefined;
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

function main() {
    defineRender();
    definePhysics();

    const cannonDebugger = new CannonDebugger(scene, physicsWorld);

    window.addEventListener("click", onMouseClick, false);

    farm = new Farm(scene, physicsWorld);
    farm.createFarm();

    dayNightCycle = new DayNightCycle(scene);

    // let flock = new Flock(
    //     50,
    //     { radius: 20, mass: 1, startPosition: new THREE.Vector3() },
    //     scene,
    //     physicsWorld
    // );
    // flock.instantiateFlock();

    const animate = () => {
        requestAnimationFrame(animate);
        physicsWorld.fixedStep();
        dayNightCycle.updateCycle();
    };

    animate();
}

main();
