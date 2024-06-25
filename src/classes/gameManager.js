import * as THREE from "three";
import { DayNightCycle } from "./World building/dayNightCycle";
import { DefenderManager } from "./entities/defenders/defenderManager";
import { EnemyManager } from "./entities/enemy/enemyManager";
import { Farm } from "./World building/farm";
import { UiManager } from "./ui/uiManager";
import BeeSwarm from "./entities/bee/beeSwarm";

// Multipliers amount
const beeMovementSpeedThresholds = [1, 1.25, 1.4, 1.5, 1.6, 1.75, 2];
const upgradeCosts = {
    bee: {
        movement: [10, 12, 15, 18, 20, 25],
        amount: 15,
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
            _value: 1000,
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
        this.beeAmount = undefined;
        this.beeMovementSpeedLevel = 1;
        this.getBeeMovementSpeedMultiplier = () =>
            beeMovementSpeedThresholds[this.beeMovementSpeedLevel - 1];
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

        this.defenderManager = new DefenderManager(
            10,
            new THREE.Vector3(100, 0, 0),
            this.scene,
            this.physicsWorld
        );

        console.log("defender manager loaded");

        this.enemyManager = new EnemyManager(2, this.scene, this.physicsWorld, {
            dimension: this.farm.getGroundDimension(),
        });
        console.log("Enemies loaded");

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
        this.beeAmount = this.swarm.getBeeCount();
        console.log("swarm loaded");

        this.uiManager = new UiManager(this);
        console.log("UI manager loaded");
    }

    update() {
        this.dayNightCycle.updateCycle();

        switch (this.dayNightCycle.cycleState) {
            case "DAY":
                this.swarm.update(this.farm.hiveMesh.position);
                break;
            case "NIGHT":
                this.enemyManager.updateEnemies();
                this.defenderManager.updateDefenders();
                break;
        }
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

    // Win/Lose condition =================================================================
    loseCondition() {
        const loseCondition =
            this.farm.farmingSpots.filter(
                (flower) =>
                    flower.currentPollenAmount === 0 && flower.wasAttacked
            ).length === this.farm.farmingSpots.length;

        if (loseCondition) {
            console.log("Game lost");
        }
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
        this.#enableBeeSwarm();
        this.#resetFlowers();
    }

    /**
     * Set the night logic for the game
     * - Spawn enemies and defenders
     * - Disable harvesting bees and upgrade ui
     */
    async onNightState() {
        await this.#spawnEnemies();
        await this.#spawnDefenders();
        this.enemyManager.setDefendersReference(
            this.defenderManager.defenderReference
        );
        this.defenderManager.setEnemyReference(
            this.enemyManager.enemiesReference
        );
        this.#enableNightUI();
        this.#disableBeeSwarm();
    }

    async #spawnEnemies() {
        await this.enemyManager.instantiateEnemies(
            this.farm.farmingSpots,
            this.defenderManager.defenderReference,
            this.dayNightCycle.cycleCount
        );
    }

    async #spawnDefenders() {
        await this.defenderManager.instantiateDefenders(
            this.enemyManager.enemiesReference
        );
    }

    #despawnEnemies() {
        this.enemyManager.disableAll();
    }

    #despawnDefenders() {
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

    #enableBeeSwarm() {
        this.swarm.enableAll();
    }

    #disableBeeSwarm() {
        this.swarm.disableAll();
    }

    #resetFlowers() {
        this.farm.farmingSpots.forEach((flower) => flower.resetPollen());
    }

    // UPGRADES =================================================

    upgradeBeeMovementSpeed() {
        const upgradeCost = this.getUpgradeCostBasedOnLevel("bee.movement");
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

    async upgradeBeeAmount() {
        const upgradeCost = this.getUpgradeCostBasedOnLevel("bee.amount");
        if (upgradeCost == -1 || this.pollenInfo.pollenAmount < upgradeCost) {
            console.error("Not enough pollen to upgrade");
            return;
        }

        this.removePollen(upgradeCost);
        await this.swarm.addNewBee(true);
        this.beeAmount = this.swarm.getBeeCount();
    }

    generateNewFarmingSpot() {
        const upgradeCost = this.getUpgradeCostBasedOnLevel("farm.newFlower");
        if (upgradeCost == -1 || this.pollenInfo.pollenAmount <= upgradeCost) {
            console.error("Not enough pollen to upgrade");
            return;
        }

        this.removePollen(upgradeCost);
        this.farm.generateNewFarmingSpot();
    }

    // UTILITY
    getUpgradeCostBasedOnLevel(upgradeName) {
        switch (upgradeName) {
            case "bee.movement":
                if (
                    upgradeCosts.bee.movement.length <
                    this.beeMovementSpeedLevel
                )
                    return -1;

                return upgradeCosts.bee.movement[
                    this.beeMovementSpeedLevel - 1
                ];
            case "bee.amount":
                return Math.floor(
                    upgradeCosts.bee.amount * (this.beeAmount * 0.2)
                );
            case "farm.newFlower":
                return upgradeCosts.farm.newFlower;
        }
    }
}
