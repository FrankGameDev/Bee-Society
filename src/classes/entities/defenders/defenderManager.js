import DefenderBee from "./defenderBee";

export class DefenderManager {
    constructor(defenderAmount, spawnPosition, scene, physicsWorld) {
        this.defenderAmount = defenderAmount;
        this.spawnPosition = spawnPosition;
        this.scene = scene;
        this.physicsWorld = physicsWorld;

        this.defenderReference = [];
        this.enemies = [];
    }

    async instantiateDefenders(enemies) {
        for (let i = 0; i < this.defenderAmount; i++) {
            let defender = new DefenderBee(
                {
                    radius: 10,
                    position: this.spawnPosition,
                    mass: 1,
                    modelEnabled: true,
                },
                enemies,
                this.scene,
                this.physicsWorld,
                {
                    onDeathCallback: this.#removeReference.bind(this),
                    onEnemyKillCallback: this.#removeEnemyReference.bind(this),
                }
            );
            await defender.instantiate();
            this.defenderReference.push(defender);
        }
    }
    setEnemyReference(enemies) {
        this.enemies = enemies;
        this.defenderReference.forEach((d) => (d.enemies = enemies));
    }
    updateDefenders() {
        this.defenderReference.forEach((d) => d.update());
    }

    disableAll() {
        this.defenderReference.forEach((e) => e.die());
    }

    #removeEnemyReference(enemyToRemove) {
        if (!this.enemies) {
            console.log("Enemies reference is empty");
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
}
