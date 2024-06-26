import * as THREE from "three";
import { Enemy } from "./enemy";

export class EnemyManager {
    /**
     *
     * @param {number} enemyAmount
     * @param {{dimension: THREE.Vector2}} levelInfo
     * @param {GameManager} gameManager
     */
    constructor(enemyAmount, scene, physicsWorld, levelInfo, gameManager) {
        this.startEnemyAmount = enemyAmount;
        this.currentEnemyAmount = this.startEnemyAmount;
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.levelInfo = levelInfo;
        this.gameManager = gameManager;

        this.gameManager.dayNightCycle.cycleCount.registerListener(
            function (k) {
                this.currentEnemyAmount += Math.floor(k * 0.5);

                console.log("enemy amount: " + this.currentEnemyAmount);
            }.bind(this)
        );
        this.enemiesReference = [];
    }

    /**
     *
     * @param {[]} farmingSpots
     * @param {[]} defenderBeesReference
     * @param {number} cycleCount current cycle
     */
    async instantiateEnemies(farmingSpots, defenderBeesReference, cycleCount) {
        this.farmingSpots = farmingSpots;
        this.defenderBeesReference = defenderBeesReference;
        for (let i = 0; i < this.currentEnemyAmount; i++) {
            let enemy = new Enemy(
                {
                    position: this.#getRandomSpawnPosition(),
                    damageMultiplier: 1 + cycleCount * 0.2,
                },
                this.scene,
                this.physicsWorld,
                {
                    onDeathCallback: this.#removeReference.bind(this),
                    onDefenderKill: this.#removeDefender.bind(this),
                },
                this.farmingSpots,
                this.defenderBeesReference
            );
            await enemy.instantiate();
            enemy.isEnabled = true;
            this.enemiesReference.push(enemy);
        }
    }

    setDefendersReference(defenderBeesReference) {
        this.defenderBeesReference = defenderBeesReference;
        this.enemiesReference.forEach(
            (enemy) => (enemy.defendingBees = defenderBeesReference)
        );
    }

    updateEnemies() {
        this.enemiesReference.forEach((e) => e.update());
    }

    disableAll() {
        let enemiesReferenceCopy = [];
        Object.assign(enemiesReferenceCopy, this.enemiesReference);
        enemiesReferenceCopy.forEach((e) => e.die());
    }

    #removeReference(enemy) {
        this.enemiesReference = this.enemiesReference.filter(
            (e) => e !== enemy
        );
    }

    #removeDefender(defenderToRemove) {
        if (!this.defenderBeesReference) {
            console.log("Defenders reference is empty");
            return;
        }

        this.defenderBeesReference = this.defenderBeesReference.filter(
            (defender) => defender !== defenderToRemove
        );
        this.setDefendersReference(this.defenderBeesReference);
    }

    #getRandomSpawnPosition() {
        const boundaryWidth = 10; // The distance from the edges of the plane within which points can be generated
        const xDimension = this.levelInfo.dimension.x;
        const yDimension = this.levelInfo.dimension.y;

        let x, z;

        // Decide if the point will be along the top/bottom edge or right/left edge
        if (Math.random() < 0.5) {
            // Generate a point along the top or bottom edges
            x = (Math.random() - 0.5) * xDimension;
            z =
                (Math.random() < 0.5 ? -0.5 : 0.5) * yDimension +
                (Math.random() < 0.5 ? -1 : 1) * boundaryWidth;
        } else {
            // Generate a point along the right or left edges
            x =
                (Math.random() < 0.5 ? -0.5 : 0.5) * xDimension +
                (Math.random() < 0.5 ? -1 : 1) * boundaryWidth;
            z = (Math.random() - 0.5) * yDimension;
        }

        return new THREE.Vector3(x, 150, z);
    }
}
