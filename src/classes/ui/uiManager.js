export class UiManager {
    constructor() {
        this.beeUpgradeButton = document.getElementById(
            "bee-upgrade-menu-button"
        );
        this.beeUpgradeButton.addEventListener(
            "click",
            this.#openBeeUpgradeMenu.bind(this)
        );

        this.beeUpgradeMenu = document.getElementById("bee-upgrade-menu");

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
