import { GameManager } from "../gameManager";

export class UiManager {
    /**
     *
     * @param {GameManager} gameManager
     */
    constructor(gameManager) {
        this.gameManager = gameManager;

        // Pollen level
        this.pollenLevel = document.getElementById("pollen-currency");
        this.pollenLevel.textContent = this.gameManager.pollenInfo.pollenAmount;
        this.gameManager.pollenInfo.registerListener(
            function (amount) {
                this.pollenLevel.textContent = amount;
            }.bind(this)
        );

        // Day/night cycle
        this.cycleTimer = document.getElementById("cycle-timer");
        this.cycleTimerBar = document.getElementById("cycle-timer-bar");
        this.cycleTimerBar.style.width = `${Math.floor(
            this.gameManager.dayNightCycle.dayAndNightDuration
        )}%`;
        this.cycleTimerBar.ariaValueMax = Math.floor(
            this.gameManager.dayNightCycle.dayAndNightDuration
        );
        this.cycleTimerBar.ariaValueMin = 0;
        this.cycleTimerBar.ariaValueNow = Math.floor(
            this.gameManager.dayNightCycle.dayAndNightDuration
        );

        this.cycleTimer = document.getElementById("cycle-time");
        this.gameManager.dayNightCycle.timerInfo.registerListener(
            function (amount) {
                this.cycleTimer.textContent = Math.floor(amount).toString();
                this.cycleTimerBar.style.width = `${Math.floor(amount)}%`;
                this.cycleTimerBar.ariaValueNow = Math.floor(amount);
            }.bind(this)
        );

        this.cycleCountLabel = document.getElementById("cycle-count-label");
        this.gameManager.dayNightCycle.cycleCount.registerListener(
            function (k) {
                this.cycleCountLabel.textContent = `Cycle: ${k}`;
            }.bind(this)
        );
        // Buttons for upgrades =================

        // Bee upgrades
        this.beeUpgradeButton = document.getElementById(
            "bee-upgrade-menu-button"
        );
        this.beeUpgradeButton.addEventListener(
            "click",
            this.#openBeeUpgradeMenu.bind(this)
        );

        this.beeUpgradeMenu = document.getElementById("bee-upgrade-menu");

        //Bee movement

        this.beeMovementUpgradeBtn = document.getElementById(
            "bee-movement-upgrade"
        );
        this.beeMovementUpgradeBtn.addEventListener(
            "click",
            this.#upgradeBeeMovement.bind(this)
        );
        this.beeMovementLevelLabel =
            document.getElementById("bee-movement-level");
        this.beeMovementCostLabel =
            document.getElementById("bee-movement-cost");
        this.beeMovementLevelLabel.textContent = `Level: ${this.gameManager.beeMovementSpeedLevel}`;
        this.beeMovementCostLabel.textContent = `Cost: ${this.gameManager.getUpgradeCostBasedOnLevel(
            "bee.movement"
        )}`;

        // Bee amount

        this.beeAmountUpgradeBtn =
            document.getElementById("bee-amount-upgrade");
        this.beeAmountUpgradeBtn.addEventListener(
            "click",
            this.#upgradeBeeAmount.bind(this)
        );

        this.beeAmountLevelLabel = document.getElementById("bee-amount-level");
        this.beeAmountCostLabel = document.getElementById("bee-amount-cost");
        this.beeAmountLevelLabel.textContent = `Bees amount: ${this.gameManager.beeAmount}`;
        this.beeAmountCostLabel.textContent = `Cost: ${this.gameManager.getUpgradeCostBasedOnLevel(
            "bee.amount"
        )}`;

        // Defender upgrades

        this.defenderUpgradeButton = document.getElementById(
            "defender-upgrade-menu-button"
        );
        this.defenderUpgradeButton.addEventListener(
            "click",
            this.#openDefenderUpgradeMenu.bind(this)
        );
        this.defenderUpgradeMenu = document.getElementById(
            "defender-upgrade-menu"
        );

        // Farm upgrade
        this.farmUpgradeButton = document.getElementById(
            "farm-upgrade-menu-button"
        );
        this.farmUpgradeButton.addEventListener(
            "click",
            this.#openFarmUpgradeMenu.bind(this)
        );
        this.farmUpgradeMenu = document.getElementById("farm-upgrade-menu");
        this.newFlowerUpgradeButton =
            document.getElementById("farm-spot-upgrade");
        this.newFlowerUpgradeButton.addEventListener(
            "click",
            this.#newFlowerSpot.bind(this)
        );
    }

    // Day Night cycle
    showDayTimer() {
        this.cycleTimerBar.classList.toggle("bg-warning", true);
        this.cycleTimerBar.classList.toggle("bg-black", false);
    }

    showNightTimer() {
        this.cycleTimerBar.classList.toggle("bg-warning", false);
        this.cycleTimerBar.classList.toggle("bg-black", true);
    }

    // UPGRADES  ===========

    showUpgradeMenus() {
        this.#toggleButtonVisibility(this.beeUpgradeButton, true);
        this.#toggleButtonVisibility(this.defenderUpgradeButton, true);
        this.#toggleButtonVisibility(this.farmUpgradeButton, true);
    }

    hideUpgradeMenus() {
        this.#toggleButtonVisibility(this.beeUpgradeButton, false);
        this.#toggleButtonVisibility(this.defenderUpgradeButton, false);
        this.#toggleButtonVisibility(this.farmUpgradeButton, false);
    }

    #toggleMenu(menu, buttonsToHide) {
        console.log(`Toggle menu: ${menu.id}`);

        const isHidden = menu.classList.contains("hidden");
        menu.classList.toggle("hidden", !isHidden);
        menu.classList.toggle("visible", isHidden);

        buttonsToHide.forEach((button) => {
            this.#toggleButtonVisibility(button, !isHidden);
        });
    }

    #toggleButtonVisibility(button, isVisible) {
        button.classList.toggle("visible", isVisible);
        button.classList.toggle("hidden", !isVisible);
    }

    #openBeeUpgradeMenu() {
        this.#toggleMenu(this.beeUpgradeMenu, [
            this.defenderUpgradeButton,
            this.farmUpgradeButton,
        ]);
    }
    #upgradeBeeMovement() {
        this.gameManager.upgradeBeeMovementSpeed();
        this.beeMovementLevelLabel.textContent = `Level: ${this.gameManager.beeMovementSpeedLevel}`;
        this.beeMovementCostLabel.textContent = `Cost: ${this.gameManager.getUpgradeCostBasedOnLevel(
            "bee.movement"
        )}`;
    }

    async #upgradeBeeAmount() {
        await this.gameManager.upgradeBeeAmount();
        this.beeAmountLevelLabel.textContent = `Bees amount: ${this.gameManager.beeAmount}`;
        this.beeAmountCostLabel.textContent = `Cost: ${this.gameManager.getUpgradeCostBasedOnLevel(
            "bee.amount"
        )}`;
    }

    #openDefenderUpgradeMenu() {
        this.#toggleMenu(this.defenderUpgradeMenu, [
            this.beeUpgradeButton,
            this.farmUpgradeButton,
        ]);
    }

    #openFarmUpgradeMenu() {
        this.#toggleMenu(this.farmUpgradeMenu, [
            this.beeUpgradeButton,
            this.defenderUpgradeButton,
        ]);
    }

    #newFlowerSpot() {
        this.gameManager.generateNewFarmingSpot();
    }
}
