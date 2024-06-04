import * as THREE from "three";
import * as CANNON from "cannon-es";
import SceneInit from "./Tools/SceneInit";
import Obstacle from "./object/Obstacle";
import CannonDebugger from "cannon-es-debugger";
import BoxDrawer from "./BoxDrawer";

let physicsWorld = undefined;
let groundBody = undefined;
let test = undefined;
let groundGeo = undefined;
let groundMat = undefined;
let groundMesh = undefined;
let sphereMesh = undefined;
let sphereBody = undefined;

let box = undefined;
let target = new THREE.Vector3();

function definePhysics() {
    //Ground
    physicsWorld = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.81, 0),
    });
    groundBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    physicsWorld.addBody(groundBody);
}

function defineRender() {
    test = new SceneInit("myThreeJsCanvas");
    test.initialize();
    test.animate();

    // const axesHelper = new THREE.AxesHelper(8);
    // test.scene.add(axesHelper);

    groundGeo = new THREE.PlaneGeometry(1000, 1000);
    groundMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color("#F5A66C"),
    });
    groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    test.scene.add(groundMesh);
}

function onMouseClick(event) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Normalizzare le coordinate del mouse
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, test.camera);

    // Ottieni le intersezioni
    const intersects = raycaster.intersectObjects(
        box.particles.map((p) => p.sphereMesh)
    );

    if (intersects.length > 0) {
        const intersectedParticle = intersects[0].object;
        target.copy(intersectedParticle.position);
        console.log("Target set to:", target);
    }
}

function main() {
    defineRender();
    definePhysics();

    groundMesh.position.copy(groundBody.position);
    groundMesh.quaternion.copy(groundBody.quaternion);

    const cannonDebugger = new CannonDebugger(test.scene, physicsWorld);

    const boxInfo = {
        boxSize: { width: 50, height: 50, depth: 50 },
        boxPosition: { x: 0, y: 50 / 2, z: 0 },
    };
    const particleInfo = {
        particleRadius: 1,
        particleMass: 0,
        particleColor: new THREE.Color("#B21DBC"),
    };
    const boidInfo = {
        boidRadius: 0.25,
        boidMass: 1,
        boidColor: new THREE.Color("#8deeee"),
    };

    box = new BoxDrawer(boxInfo, particleInfo, boidInfo);
    box.createBoxRenderer(test.scene);
    box.createBoids(1000);
    box.instantiateBoids(test.scene, physicsWorld);
    box.createParticles(10);
    box.instantiateParticles(test.scene, physicsWorld);

    window.addEventListener("click", onMouseClick, false);

    const animate = () => {
        physicsWorld.fixedStep();
        // cannonDebugger.update();

        box.updateBoids(target);
        box.updateParticles();

        window.requestAnimationFrame(animate);
    };

    animate();
}

main();
