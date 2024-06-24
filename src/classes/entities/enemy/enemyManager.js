import * as THREE from "three";

import { Enemy } from "./enemy";

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
                scene,
                physicsWorld,
                this.#removeReference.bind(this),
                this.farmingSpots,
                this.defendingBees
            );
            await enemy.instantiate();
            enemy.isEnabled = true;
            this.enemiesReference.push(enemy);
        }
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
        console.log(`Enemy ${enemy.id} removed from manager.`);
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
