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
        this.dayProgress = document.getElementById("day-progress");
        this.dayProgressBar = document.getElementById("day-progress-bar");
        this.dayProgressBar.style.width = `${Math.floor(
            this.gameManager.dayNightCycle.dayAndNightDuration
        )}%`;
        this.dayProgressBar.ariaValueMax = Math.floor(
            this.gameManager.dayNightCycle.dayAndNightDuration
        );
        this.dayProgressBar.ariaValueMin = 0;
        this.dayProgressBar.ariaValueNow = Math.floor(
            this.gameManager.dayNightCycle.dayAndNightDuration
        );

        this.dayTimer = document.getElementById("day-time");
        this.gameManager.dayNightCycle.timerInfo.registerListener(
            function (amount) {
                this.dayTimer.textContent = Math.floor(amount).toString();
                this.dayProgressBar.style.width = `${Math.floor(amount)}%`;
                this.dayProgressBar.ariaValueNow = Math.floor(amount);
            }.bind(this)
        );

        this.nightProgress = document.getElementById("night-progress");
        this.nightProgressBar = document.getElementById("night-progress-bar");
        this.nightProgressBar.style.width = `${Math.floor(
            this.gameManager.dayNightCycle.dayAndNightDuration
        )}%`;
        this.nightProgressBar.ariaValueMax = Math.floor(
            this.gameManager.dayNightCycle.dayAndNightDuration
        );
        this.nightProgressBar.ariaValueMin = 0;
        this.nightProgressBar.ariaValueNow = Math.floor(
            this.gameManager.dayNightCycle.dayAndNightDuration
        );
        this.nightTimer = document.getElementById("night-time");
        this.gameManager.dayNightCycle.timerInfo.registerListener(
            function (amount) {
                this.nightTimer.textContent = Math.floor(amount).toString();
                this.nightProgressBar.style.width = `${Math.floor(amount)}%`;
                this.nightProgressBar.ariaValueNow = Math.floor(amount);
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
        this.beeMovementUpgradeBtn = document.getElementById(
            "bee-movement-upgrade"
        );
        this.beeMovementUpgradeBtn.addEventListener(
            "click",
            this.#upgradeBeeMovement.bind(this)
        );
        this.beeMovementUpgradeLabel =
            document.getElementById("bee-movement-level");

        this.beeHarvestUpgradeBtn = document.getElementById(
            "bee-harvest-upgrade"
        );
        this.beeHarvestUpgradeBtn.addEventListener(
            "click",
            this.#upgradeBeeHarvest.bind(this)
        );
        this.beeMovementUpgradeLabel =
            document.getElementById("bee-harvest-level");

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
        this.dayProgressBar.classList.toggle("hide", false);
        this.dayProgressBar.classList.toggle("show", true);

        this.nightProgressBar.classList.toggle("show", false);
        this.nightProgressBar.classList.toggle("hide", true);
    }

    showNightTimer() {
        this.nightProgressBar.classList.toggle("show", true);
        this.nightProgressBar.classList.toggle("hide", false);

        this.dayProgressBar.classList.toggle("hide", true);
        this.dayProgressBar.classList.toggle("show", false);
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
    }

    #upgradeBeeHarvest() {
        this.gameManager.upgradeBeeHarvestingSpeed();
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
