import * as THREE from "three";
import { DayNightCycle } from "./World building/dayNightCycle";
import { DefenderManager } from "./entities/defenders/defenderManager";
import { EnemyManager } from "./entities/enemy/enemyManager";
import { Farm } from "./World building/farm";
import { UiManager } from "./ui/uiManager";
import BeeSwarm from "./entities/bee/beeSwarm";

// Multipliers amount
const beeHarvestingSpeedThresholds = [1, 0.9, 0.8, 0.7, 0.5];
const beeMovementSpeedThresholds = [1, 1.25, 1.4, 1.5, 1.6, 1.75, 2];
const upgradeCosts = {
    bee: {
        movement: [10, 12, 15, 18, 20, 25],
        harvest: [10, 12, 15, 18, 20],
    },
    defender: {},
    farm: { newFlower: 15 },
};
/**
 * Defines game cycle logic and mantains information about currency and upgrades
 * @param {DayNightCycle} dayNightCycle
 * @param {Farm} farmManager
 * @param {EnemyManager} enemyManager
 * @param {DefenderManager} defenderManager
 */
export class GameManager {
    constructor(scene, physicsWorld, sceneInitializer) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.sceneInitializer = sceneInitializer;

        this.pollenInfo = {
            _value: 100,
            listener: function (amount) {},
            /**
             * @param {number} amount
             */
            set pollenAmount(amount) {
                this._value = amount;
                this.listener(amount);
            },
            get pollenAmount() {
                return this._value;
            },
            registerListener: function (listener) {
                this.listener = listener;
            },
        };
        this.beeHarvestSpeedLevel = 1;
        this.beeMovementSpeedLevel = 1;
        this.getBeeMovementSpeedMultiplier = () =>
            beeMovementSpeedThresholds[this.beeMovementSpeedLevel - 1];
        this.getBeeHarvestSpeedMultiplier = () =>
            beeHarvestingSpeedThresholds[this.beeHarvestSpeedLevel - 1];
    }

    // INIT
    async init() {
        this.farm = new Farm(this.scene, this.physicsWorld);
        await this.farm.createFarm();
        console.log("farm loaded");

        this.dayNightCycle = new DayNightCycle(
            this.scene,
            this.onDayState.bind(this),
            this.onNightState.bind(this)
        );
        console.log("day night cycle loaded");
        this.defenderManager = new DefenderManager();

        this.enemyManager = new EnemyManager(
            10,
            {},
            this.farm.farmingSpots,
            [],
            {
                dimension: this.farm.getGroundDimension(),
            }
        );
        await this.enemyManager.instantiateEnemies(
            this.scene,
            this.physicsWorld
        );
        console.log("Enemies loaded");

        this.uiManager = new UiManager(this);
        console.log("UI manager loaded");
        this.swarm = new BeeSwarm(
            5,
            {
                radius: 20,
                mass: 1,
                startPosition: new THREE.Vector3(100, 0, 0),
                modelEnabled: true,
            },
            this.farm.farmingSpots,
            this.scene,
            this.physicsWorld,
            this.sceneInitializer,
            this
        );
        await this.swarm.instantiateFlock();
        console.log("swarm loaded");
    }

    update() {
        this.dayNightCycle.updateCycle();

        this.swarm.update(this.farm.hiveMesh.position);
    }
    // Pollen handler

    addPollen(amount) {
        this.pollenInfo.pollenAmount += amount;
    }
    removePollen(amount) {
        this.pollenInfo.pollenAmount = Math.max(
            0,
            this.pollenInfo.pollenAmount - amount
        );
    }

    // Game Cycle =================================================================

    /**
     * Set the day logic for the game
     * - Despawn enemies and defenders
     * - Enable bee for harvesting
     */
    onDayState() {
        this.#despawnEnemies();
        this.#despawnDefenders();
        this.#enableDayUI();
        this.#enableHarvesting();
    }

    /**
     * Set the night logic for the game
     * - Spawn enemies and defenders
     * - Disable harvesting bees and upgrade ui
     */
    onNightState() {
        this.#spawnDefenders();
        this.#spawnEnemies();
        this.#enableNightUI();
        this.#disableHarvesting();
    }

    async #spawnEnemies() {
        await this.enemyManager.instantiateEnemies(
            this.scene,
            this.physicsWorld
        );
    }

    async #spawnDefenders() {
        await this.defenderManager.instantiateDefenders(
            this.scene,
            this.physicsWorld
        );
    }

    async #despawnEnemies() {
        this.enemyManager.disableAll();
    }

    async #despawnDefenders() {
        this.defenderManager.disableAll();
    }

    #enableDayUI() {
        this.uiManager.showDayTimer();
        this.uiManager.showUpgradeMenus();
    }

    #enableNightUI() {
        this.uiManager.showNightTimer();
        this.uiManager.hideUpgradeMenus();
    }

    #enableHarvesting() {}

    #disableHarvesting() {}

    // UPGRADES =================================================

    upgradeBeeMovementSpeed() {
        const upgradeCost = this.#getUpgradeCostBasedOnLevel("bee.movement");
        if (upgradeCost == -1 || this.pollenInfo.pollenAmount < upgradeCost) {
            console.error("Not enough pollen to upgrade");
            return;
        }
        if (
            this.beeMovementSpeedLevel ==
            beeMovementSpeedThresholds.length - 1
        ) {
            console.log("Bee movement speed reached max level");
            return;
        }

        this.removePollen(upgradeCost);
        this.beeMovementSpeedLevel += 1;
    }

    upgradeBeeHarvestingSpeed() {
        const upgradeCost = this.#getUpgradeCostBasedOnLevel("bee.harvest");
        if (upgradeCost == -1 || this.pollenInfo.pollenAmount < upgradeCost) {
            console.error("Not enough pollen to upgrade");
            return;
        }

        if (
            this.beeHarvestSpeedLevel ==
            beeHarvestingSpeedThresholds.length - 1
        ) {
            console.log("Bee harvesting speed reached max level");
            return;
        }
        this.removePollen(upgradeCost);
        this.beeHarvestSpeedLevel += 1;
    }

    generateNewFarmingSpot() {
        const upgradeCost = this.#getUpgradeCostBasedOnLevel("farm.newFlower");
        if (upgradeCost == -1 || this.pollenInfo.pollenAmount < upgradeCost) {
            console.error("Not enough pollen to upgrade");
            return;
        }

        this.removePollen(upgradeCost);
        this.farmManager.generateNewFarmingSpot();
    }

    // UTILITY
    #getUpgradeCostBasedOnLevel(upgradeName) {
        switch (upgradeName) {
            case "bee.movement":
                if (
                    upgradeCosts.bee.movement.length <
                    this.beeMovementSpeedLevel
                )
                    return -1;

                return upgradeCosts.bee.movement[this.beeMovementSpeedLevel];
            case "bee.harvest":
                if (upgradeCosts.bee.harvest.length < this.beeHarvestSpeedLevel)
                    return -1;
                return upgradeCosts.bee.harvest[this.beeHarvestSpeedLevel];
            case "farm.newFlower":
                return upgradeCosts.farm.newFlower;
        }
    }
}
