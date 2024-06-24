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
                console.log("test");
            }.bind(this)
        );

        // Day/night cycle

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

    // UPGRADES  ===========

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
