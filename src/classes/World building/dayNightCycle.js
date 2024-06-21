import * as THREE from "three";
import { Timer } from "three/addons/misc/Timer.js";

const orbitDuration = 60 * 2; //day + night duration
const speed = () => (2 * Math.PI) / orbitDuration; // Angular velocity
const radius = 5000; //TODO: handle this to make it equivalent to ground width

const cycleState = { day: "DAY", night: "NIGHT" };

var dayColor = new THREE.Color(0x87ceeb); // Giorno: azzurro
var nightColor = new THREE.Color(0x000022); // Notte: blu scuro

export class DayNightCycle {
    constructor(scene) {
        this.scene = scene;
        this.timer = new Timer();

        this.sunLight = new THREE.DirectionalLight(0xfff000, 1);
        this.sunLight.position.set(45, 45, 45);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -50;
        this.sunLight.shadow.camera.right = 50;
        this.sunLight.shadow.camera.top = 50;
        this.sunLight.shadow.camera.bottom = -50;
        this.scene.add(this.sunLight);
        this.sunLightHelper = new THREE.DirectionalLightHelper(
            this.sunLight,
            100
        );
        this.scene.add(this.sunLightHelper);

        const sunSphere = new THREE.SphereGeometry(500);
        const sunSphereMat = new THREE.MeshBasicMaterial({ wireframe: true });
        this.sunMesh = new THREE.Mesh(sunSphere, sunSphereMat);
        this.sunMesh.position.copy(this.sunLight.position);
        this.scene.add(this.sunMesh);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.ambientLight.castShadow = true;
        this.scene.add(this.ambientLight);

        //Cycle parameters
        this.#setDay();
    }

    updateCycle() {
        this.timer.update();
        let time = this.timer.getElapsed();
        // Aggiornare il tempo
        if (time >= this.orbitDuration) {
            time = 0;
        }
        // Calcolare la posizione del sole
        var angle = time * speed();
        var sunPositionX = radius * Math.cos(angle);
        var sunPositionY = radius * Math.sin(angle);
        this.sunLight.position.set(sunPositionX, sunPositionY, 0);
        this.sunLightHelper.update();
        this.sunMesh.position.copy(this.sunLight.position);

        // Calcolare la percentuale di giorno/notte
        var alpha = (sunPositionY + radius) / (2 * radius); // Normalizza Y da 0 a 1
        var currentColor = this.lerpColor(nightColor, dayColor, alpha);
        this.scene.background = currentColor;

        // Cambiare il colore del cielo
        if (sunPositionY > 0) {
            this.#setDay();
        } else {
            this.#setNight();
        }
    }
    // Interpolate colors
    lerpColor(color1, color2, alpha) {
        return color1.clone().lerp(color2, alpha);
    }
    #setDay() {
        //TODO: handle
        // this.scene.scene = new THREE.CubeTextureLoader()
        //     .setPath("resources/textures/cubeMaps/DaySky")
        //     .load(["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"]);
        this.cycleState = cycleState.day;
        //TODO add logic for day game loop
        // enableBees();
        // stopSpawningEnemies();
    }

    #setNight() {
        this.cycleState = cycleState.night;
        //TODO add logic for night game loop
        // disableBees();
        // startSpawningEnemy();
    }
}
