import * as THREE from "three";
import { DayNightCycle } from "./World building/dayNightCycle";
import { DefenderManager } from "./entities/defenders/defenderManager";
import { EnemyManager } from "./entities/enemy/enemyManager";
import { Farm } from "./World building/farm";
import { UiManager } from "./ui/uiManager";
import BeeSwarm from "./entities/bee/beeSwarm";
import { GUI } from "dat.gui";

// Multipliers amount
const movementSpeedThresholds = [
    1, 1.25, 1.4, 1.5, 1.6, 1.75, 2, 2.1, 2.2, 2.4, 2.5, 2.7, 3,
]; // Used for bees and defenders
const upgradeCosts = {
    bee: {
        movement: [10, 12, 15, 18, 20, 25, 27, 30, 35, 40, 45, 48, 50],
        amount: 15,
    },
    defender: {
        movement: [10, 12, 15, 18, 20, 25, 27, 30, 35, 40, 45, 48, 50],
        amount: 15,
    },
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
            _value: 0,
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
            movementSpeedThresholds[this.beeMovementSpeedLevel - 1];

        this.defenderAmount = undefined;
        this.defenderMovementSpeedLevel = 1;
        this.getDefenderMovementSpeedMultiplier = () =>
            movementSpeedThresholds[this.defenderMovementSpeedLevel - 1];
    }

    // INIT
    async init() {
        const gui = new GUI();
        this.shadowParameters = {
            enabled: false,
        };
        const shadowFolder = gui.addFolder("Shadow");
        shadowFolder
            .add(this.shadowParameters, "enabled")
            .onChange(this.setShadowState.bind(this));
        shadowFolder.open();

        this.farm = new Farm(this.scene, this.physicsWorld);
        await this.farm.createFarm(10);
        console.log("farm loaded");

        this.dayNightCycle = new DayNightCycle(
            this.scene,
            this.onDayState.bind(this),
            this.onNightState.bind(this)
        );
        console.log("day night cycle loaded");

        this.setShadowState();

        this.defenderManager = new DefenderManager(
            5,
            this.scene,
            this.physicsWorld,
            this,
            gui
        );
        this.defenderAmount = this.defenderManager.defenderAmount;
        console.log("defender manager loaded");

        this.enemyManager = new EnemyManager(
            10,
            this.scene,
            this.physicsWorld,
            {
                dimension: this.farm.getGroundDimension(),
            },
            this
        );
        console.log("Enemies loaded");

        this.swarm = new BeeSwarm(
            20,
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
            this,
            gui
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
                this.#checkLoseCondition();
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
    #checkLoseCondition() {
        const loseCondition =
            this.farm.farmingSpots.filter(
                (flower) => flower.currentPollenLevel <= 0 && flower.wasAttacked
            ).length === this.farm.farmingSpots.length;

        if (loseCondition) {
            this.#despawnEnemies();
            this.#despawnDefenders();
            this.#disableBeeSwarm();
            this.#disableGameUI();
            this.dayNightCycle.disable();
            this.uiManager.showLoseUI();
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
        this.#resetFlowers();
    }

    async #spawnEnemies() {
        await this.enemyManager.instantiateEnemies(
            this.farm.farmingSpots,
            this.defenderManager.defenderReference,
            this.dayNightCycle.cycleCount._value
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

    #disableGameUI() {
        this.uiManager.hideAll();
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

    // BEES UPGRADES =================================================

    upgradeBeeMovementSpeed() {
        const upgradeCost = this.getUpgradeCostBasedOnLevel("bee.movement");
        if (upgradeCost == -1 || this.pollenInfo.pollenAmount < upgradeCost) {
            console.error("Not enough pollen to upgrade");
            return;
        }
        if (this.beeMovementSpeedLevel == movementSpeedThresholds.length) {
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

    // DEFENDER UPGRADES =================================================

    upgradeDefenderMovementSpeed() {
        const upgradeCost =
            this.getUpgradeCostBasedOnLevel("defender.movement");
        if (upgradeCost == -1 || this.pollenInfo.pollenAmount < upgradeCost) {
            console.error("Not enough pollen to upgrade");
            return;
        }
        if (this.defenderMovementSpeedLevel == movementSpeedThresholds.length) {
            return;
        }

        this.removePollen(upgradeCost);
        this.defenderMovementSpeedLevel += 1;
    }

    async upgradeDefenderAmount() {
        const upgradeCost = this.getUpgradeCostBasedOnLevel("defender.amount");
        if (upgradeCost == -1 || this.pollenInfo.pollenAmount < upgradeCost) {
            console.error("Not enough pollen to upgrade");
            return;
        }

        this.removePollen(upgradeCost);
        this.defenderManager.incrementDefenderAmount();
        this.defenderAmount = this.defenderManager.defenderAmount;
    }

    // FARM UPGRADES =================================================

    generateNewFarmingSpot() {
        const upgradeCost = this.getUpgradeCostBasedOnLevel("farm.newFlower");
        if (upgradeCost == -1 || this.pollenInfo.pollenAmount <= upgradeCost) {
            console.error("Not enough pollen to upgrade");
            return;
        }

        this.removePollen(upgradeCost);
        this.farm.generateNewFarmingSpot();
    }

    //Graphics =================================================

    /**
     *
     * @param {boolean} state
     */
    setShadowState() {
        this.dayNightCycle.sunLight.castShadow = this.shadowParameters.enabled;
        this.dayNightCycle.moonLight.castShadow = this.shadowParameters.enabled;
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
                    upgradeCosts.bee.amount * (this.beeAmount * 0.1)
                );
            case "defender.movement":
                if (
                    upgradeCosts.defender.movement.length <
                    this.defenderMovementSpeedLevel
                )
                    return -1;

                return upgradeCosts.defender.movement[
                    this.defenderMovementSpeedLevel - 1
                ];
            case "defender.amount":
                return Math.floor(
                    upgradeCosts.defender.amount * (this.defenderAmount * 0.2)
                );
            case "farm.newFlower":
                return Math.floor(
                    upgradeCosts.farm.newFlower *
                        (this.farm.farmingSpots.length * 0.1)
                );
            default:
                return -1;
        }
    }
}
