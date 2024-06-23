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
        //FIXME use a watch for this
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
    }

    // UPGRADES  ===========

    #openBeeUpgradeMenu() {
        console.log("Open bee upgrade menu");

        //if hidden
        if (this.beeUpgradeMenu.classList.contains("hidden")) {
            this.beeUpgradeMenu.classList.remove("hidden");
            this.beeUpgradeMenu.classList.add("visible");
            this.defenderUpgradeButton.classList.add("hidden");
            this.defenderUpgradeButton.classList.remove("visible");
        } else {
            //if visible
            this.beeUpgradeMenu.classList.remove("visible");
            this.beeUpgradeMenu.classList.add("hidden");
            this.defenderUpgradeButton.classList.add("visible");
            this.defenderUpgradeButton.classList.remove("hidden");
        }
    }

    #upgradeBeeMovement() {
        this.gameManager.upgradeBeeMovementSpeed();
    }

    #upgradeBeeHarvest() {
        this.gameManager.upgradeBeeHarvestingSpeed();
    }

    #openDefenderUpgradeMenu() {
        console.log("open defender upgrade menu");

        if (this.defenderUpgradeMenu.classList.contains("hidden")) {
            this.defenderUpgradeMenu.classList.remove("hidden");
            this.defenderUpgradeMenu.classList.add("visible");
            this.beeUpgradeButton.classList.add("hidden");
            this.beeUpgradeButton.classList.remove("visible");
        } else {
            //if visible
            this.defenderUpgradeMenu.classList.remove("visible");
            this.defenderUpgradeMenu.classList.add("hidden");
            this.beeUpgradeButton.classList.add("visible");
            this.beeUpgradeButton.classList.remove("hidden");
        }
    }
}
