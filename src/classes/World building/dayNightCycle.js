import * as THREE from "three";
import { Timer } from "three/addons/misc/Timer.js";

const dayAndNightDuration = 10; //day and night duration
const orbitDuration = dayAndNightDuration * 2;
const speed = () => (2 * Math.PI) / orbitDuration; // Angular velocity
const radius = 10000;

const cycleState = { day: "DAY", night: "NIGHT" };

var dayColor = new THREE.Color(0x87ceeb); // Giorno: azzurro
var nightColor = new THREE.Color(0x000022); // Notte: blu scuro

export class DayNightCycle {
    /**
     *
     * @param {*} scene
     * @param {event} onDayCallback
     * @param {event} onNightCallback
     */
    constructor(scene, onDayCallback, onNightCallback) {
        this.scene = scene;
        this.onDayCallback = onDayCallback;
        this.onNightCallback = onNightCallback;
        this.dayAndNightDuration = dayAndNightDuration;
        this.cycleCount = {
            _value: 0,
            listeners: [],
            get value() {
                return this._value;
            },
            set value(k) {
                this._value = k;
                this.listeners.forEach((listener) => listener(k));
            },
            registerListener: function (listener) {
                this.listeners.push(listener);
            },
        };

        this.timer = new Timer();
        this.timerInfo = {
            _value: this.timer.getElapsed(),
            listeners: [],
            get time() {
                return this.timer.getElapsed();
            },
            set time(amount) {
                this._value = amount;
                this.listeners.forEach((listener) =>
                    listener(dayAndNightDuration - amount)
                );
            },
            registerListener: function (listener) {
                this.listeners.push(listener);
            },
        };

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

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.ambientLight.castShadow = true;
        this.scene.add(this.ambientLight);

        this.isEnabled = true;
    }

    async updateCycle() {
        if (!this.isEnabled) return;

        if (!this.cycleState) this.#setDay();

        this.timer.update();
        let time = this.timer.getElapsed();
        this.timerInfo.time = time;
        if (time >= dayAndNightDuration) {
            this.timerInfo.time = time - dayAndNightDuration;
        }
        if (time >= orbitDuration) {
            this.timer = new Timer();
        }
        // Calculate sun position
        var angle = time * speed();
        var sunPositionX = radius * Math.cos(angle);
        var sunPositionY = radius * Math.sin(angle);
        this.sunLight.position.set(sunPositionX, sunPositionY, 0);

        var alpha = (sunPositionY + radius) / (2 * radius); // Normalizza Y da 0 a 1
        var currentColor = this.lerpColor(nightColor, dayColor, alpha);
        this.scene.background = currentColor;

        if (sunPositionY > 0) {
            this.#setDay();
        } else {
            await this.#setNight();
        }
    }
    // Interpolate colors
    lerpColor(color1, color2, alpha) {
        return color1.clone().lerp(color2, alpha);
    }

    #setDay() {
        if (this.cycleState === cycleState.day) return;
        this.cycleState = cycleState.day;
        this.cycleCount.value += 1;
        this.onDayCallback();
    }

    async #setNight() {
        if (this.cycleState === cycleState.night) return;
        this.cycleState = cycleState.night;
        await this.onNightCallback();
    }

    disable() {
        this.isEnabled = false;
    }
}
