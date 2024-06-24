import * as THREE from "three";

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
 */
export class GameManager {
    constructor(dayNightCycle, farmManager) {
        this.dayNightCycle = dayNightCycle;
        this.farmManager = farmManager;

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

    addPollen(amount) {
        this.pollenInfo.pollenAmount += amount;
    }
    removePollen(amount) {
        this.pollenInfo.pollenAmount = Math.max(
            0,
            this.pollenInfo.pollenAmount - amount
        );
    }

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
