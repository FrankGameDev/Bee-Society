import * as THREE from "three";
import { Timer } from "three/addons/misc/Timer.js";

const dayAndNightDuration = 60; //day and night duration
const orbitDuration = dayAndNightDuration * 2;
const speed = () => (2 * Math.PI) / orbitDuration; // Angular velocity
const radius = 5000;

const cycleState = { day: "DAY", night: "NIGHT" };

var dayColor = new THREE.Color(0x87ceeb);
var nightColor = new THREE.Color(0x000022);

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

        this.sunLight = new THREE.DirectionalLight(0xffd500, 3);
        this.sunLight.position.set(45, 45, 45);
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = -0.00001;
        this.sunLight.shadow.camera.far = 30000;
        this.sunLight.shadow.camera.left = -5000;
        this.sunLight.shadow.camera.right = 5000;
        this.sunLight.shadow.camera.top = 5000;
        this.sunLight.shadow.camera.bottom = -5000;
        this.sunLight.shadow.bias = -0.001;
        this.sunLight.castShadow = true;
        this.scene.add(this.sunLight);

        this.moonLight = new THREE.DirectionalLight(0xb1b5b2, 3);
        this.moonLight.position.set(45, 45, 45);
        this.moonLight.shadow.mapSize.width = 2048;
        this.moonLight.shadow.mapSize.height = 2048;
        this.moonLight.shadow.camera.near = -0.00001;
        this.moonLight.shadow.camera.far = 30000;
        this.moonLight.shadow.camera.left = -5000;
        this.moonLight.shadow.camera.right = 5000;
        this.moonLight.shadow.camera.top = 5000;
        this.moonLight.shadow.camera.bottom = -5000;
        this.moonLight.shadow.bias = -0.001;
        this.moonLight.castShadow = true;
        this.scene.add(this.moonLight);

        const hemiLight = new THREE.HemisphereLight(0xdbb18c, 0xa3a29b, 0.5);
        hemiLight.position.set(0, 1000, 0);
        this.scene.add(hemiLight);

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

        var angle = time * speed();
        var moonPositionX = -radius * Math.cos(angle);
        var moonPositionY = -radius * Math.sin(angle);
        this.moonLight.position.set(moonPositionX, moonPositionY, 0);

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

        this.scene.add(this.sunLight);
        this.sunLight.position.set(45, 45, 45);

        let startTime = null;
        const duration = 500;

        const animateDay = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            this.sunLight.intensity = this.#lerp(0, 1, progress);
            this.moonLight.intensity = this.#lerp(1, 0, progress);

            if (progress < 1) {
                requestAnimationFrame(animateDay);
            } else {
                this.scene.remove(this.moonLight);
            }
        };
    }

    async #setNight() {
        if (this.cycleState === cycleState.night) return;
        this.cycleState = cycleState.night;
        await this.onNightCallback();

        this.scene.add(this.moonLight);
        this.moonLight.position.set(45, 45, 45);

        let startTime = null;
        const duration = 500;

        const animateNight = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            this.sunLight.intensity = this.#lerp(1, 0, progress);
            this.moonLight.intensity = this.#lerp(0, 1, progress);

            if (progress < 1) {
                requestAnimationFrame(animateNight);
            } else {
                this.scene.remove(this.sunLight);
            }
        };
    }

    disable() {
        this.isEnabled = false;
    }

    #lerp(a, b, alpha) {
        return a + alpha * (b - a);
    }
}
