import * as THREE from "three";
import * as CANNON from "cannon-es";
import SceneInit from "./SceneInit";
import Particle from "./Particle";
import CannonDebugger from "cannon-es-debugger";
import ParticleBox from "./ParticleBox";

let physicsWorld = undefined;
let groundBody = undefined;
let test = undefined;
let groundGeo = undefined;
let groundMat = undefined;
let groundMesh = undefined;
let sphereMesh = undefined;
let sphereBody = undefined;

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

    const axesHelper = new THREE.AxesHelper(8);
    test.scene.add(axesHelper);

    groundGeo = new THREE.PlaneGeometry(1000, 1000);
    groundMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color("grey"),
        wireframe: false,
    });
    groundMesh = new THREE.Mesh(groundGeo, groundMat);
    test.scene.add(groundMesh);
}

function main() {
    defineRender();
    definePhysics();

    groundMesh.position.copy(groundBody.position);
    groundMesh.quaternion.copy(groundBody.quaternion);

    const cannonDebugger = new CannonDebugger(test.scene, physicsWorld);

    const boxInfo = {
        boxSize: { width: 10, height: 10, depth: 10 },
        boxPosition: { x: 0, y: 5, z: 0 },
    };
    const particleInfo = {
        particleRadius: 0.25,
        particleMass: 5,
        particleColor: new THREE.Color("red"),
    };

    const particleBox = new ParticleBox(boxInfo, particleInfo);
    particleBox.createParticles(1000);
    particleBox.createBoxRenderer(test.scene);
    particleBox.instantiateParticles(test.scene, physicsWorld);

    const animate = () => {
        physicsWorld.fixedStep();
        cannonDebugger.update();

        particleBox.updateParticles();

        window.requestAnimationFrame(animate);
    };

    animate();
}

main();
