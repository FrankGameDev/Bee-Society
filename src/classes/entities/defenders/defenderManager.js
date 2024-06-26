import { Scene } from "three";
import DefenderBee from "./defenderBee";
import { GameManager } from "../../gameManager";
import { GUI } from "dat.gui";
import { World } from "cannon-es";
import * as THREE from "three";

export class DefenderManager {
    /**
     *
     * @param {number} defenderAmount
     * @param {THREE.Vector3} spawnPosition
     * @param {Scene} scene
     * @param {World} physicsWorld
     * @param {GameManager} gameManager
     * @param {GUI} gui
     */
    constructor(defenderAmount, scene, physicsWorld, gameManager, gui) {
        this.defenderAmount = defenderAmount;
        this.scene = scene;
        this.physicsWorld = physicsWorld;

        this.defenderReference = [];
        this.enemies = [];
        this.gameManager = gameManager;

        this.boidsAlgoProperties = {
            cohesionWeight: 0.3,
            separationWeight: 500,
            alignmentWeight: 0.1,
            wanderWeight: 5,
        };
        const defendersFolder = gui.addFolder("Defenders");
        defendersFolder.add(this.boidsAlgoProperties, "cohesionWeight", 0, 10);
        defendersFolder.add(
            this.boidsAlgoProperties,
            "separationWeight",
            0,
            1000,
            5
        );
        defendersFolder.add(this.boidsAlgoProperties, "alignmentWeight", 0, 2);
        defendersFolder.add(this.boidsAlgoProperties, "wanderWeight", 0, 10);
    }

    async instantiateDefenders(enemies) {
        this.enemies = enemies;
        for (let i = 0; i < this.defenderAmount; i++) {
            await this.addNewDefender(true);
        }
    }

    async addNewDefender() {
        let defender = new DefenderBee(
            {
                radius: 10,
                position: this.#getRandomSpawnPosition(),
                mass: 1,
                modelEnabled: true,
            },
            this.enemies,
            this.scene,
            this.physicsWorld,
            this.gameManager,
            {
                onDeathCallback: this.#removeReference.bind(this),
                onEnemyKillCallback: this.#removeEnemyReference.bind(this),
            }
        );
        await defender.instantiate();
        this.defenderReference.push(defender);
    }

    incrementDefenderAmount(amount = 1) {
        this.defenderAmount += amount;
    }

    setEnemyReference(enemies) {
        this.enemies = enemies;
        this.defenderReference.forEach((d) => (d.enemies = enemies));
    }
    updateDefenders() {
        this.defenderReference.forEach((d) =>
            d.update(this.boidsAlgoProperties, this.defenderReference)
        );
    }

    disableAll() {
        this.defenderReference.forEach((e) => e.die());
    }

    #removeEnemyReference(enemyToRemove) {
        if (!this.enemies) {
            return;
        }

        this.enemies = this.enemies.filter((enemy) => enemy !== enemyToRemove);
        this.setEnemyReference(this.enemies);
        this.defenderReference.forEach((d) =>
            d.onEnemyKilledReset(enemyToRemove)
        );
    }

    #removeReference(defender) {
        this.defenderReference = this.defenderReference.filter(
            (d) => d !== defender
        );
    }

    #getRandomSpawnPosition() {
        return new THREE.Vector3(
            (Math.random() - 0.5) * 150,
            150,
            (Math.random() - 0.5) * 150
        );
    }
}
