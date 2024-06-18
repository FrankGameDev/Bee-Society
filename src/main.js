import * as THREE from "three";
import * as CANNON from "cannon-es";
import SceneInit from "./utils/SceneInit";
import Obstacle from "./classes/Obstacle";
import CannonDebugger from "cannon-es-debugger";
import BoxDrawer from "./classes/BoxDrawer";
import Flock from "./classes/Flock";
import { Farm } from "./classes/World building/farm";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer";

let sceneInitializer = undefined;
let physicsWorld = undefined;
let scene = undefined;
let box = undefined;
let farm = undefined;
let target = new THREE.Vector3();
let labelRenderer = undefined;

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

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    document.body.appendChild(labelRenderer.domElement);

    const cannonDebugger = new CannonDebugger(scene, physicsWorld);

    window.addEventListener("click", onMouseClick, false);

    farm = new Farm(scene, physicsWorld);
    farm.createFarm();

    const animate = () => {
        //Debuggers
        cannonDebugger.update();

        labelRenderer.render(scene, sceneInitializer.camera);
        requestAnimationFrame(animate);
        physicsWorld.fixedStep();
    };

    animate();
}

main();
