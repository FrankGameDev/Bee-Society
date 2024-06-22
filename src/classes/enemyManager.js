import * as THREE from "three";

import { Enemy } from "./Enemy";

export class EnemyManager {
    /**
     *
     * @param {number} enemyAmount
     * @param {{position: THREE.Vector3}} enemyOptions
     * @param {[]} farmingSpots
     * @param {[]} defenderBees
     * @param {{dimension: THREE.Vector2}} levelInfo
     */
    constructor(
        enemyAmount,
        enemyOptions,
        farmingSpots,
        defendingBees,
        levelInfo
    ) {
        this.enemyAmount = enemyAmount;
        this.enemyOptions = enemyOptions;
        this.farmingSpots = farmingSpots;
        this.defendingBees = defendingBees;
        this.levelInfo = levelInfo;

        this.enemiesReference = [];
    }

    async instantiateEnemies(scene, physicsWorld) {
        for (let i = 0; i < this.enemyAmount; i++) {
            let enemy = new Enemy(
                { position: this.#getRandomSpawnPosition() },
                this.#removeReference,
                this.farmingSpots,
                this.defendingBees
            );
            enemy.instantiate(scene, physicsWorld);
            this.enemiesReference.push(enemy);
        }
    }

    updateEnemies() {
        this.enemiesReference.forEach((e) => e.update());
    }

    #removeReference(enemy) {
        this.enemiesReference = this.enemiesReference.filter(
            (e) => e !== enemy
        );
        console.log(`Enemy ${enemy.id} removed from manager.`);
    }

    #getRandomSpawnPosition() {
        return new THREE.Vector3(
            (Math.random() - 0.5) * this.levelInfo.dimension.x,
            50,
            (Math.random() - 0.5) * this.levelInfo.dimension.y
        );
    }
}
