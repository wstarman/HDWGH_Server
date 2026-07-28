import { BattleCharacter } from "./BattleCharacter.js"
import { BattleLogger } from "./BattleLogger.js"

export interface CharacterData {
    weaponid: string;
    statusid: string[];
    passiveid: string[];
}

export class BattleManager {
    player: BattleCharacter;
    enemy: BattleCharacter;
    logger: BattleLogger
    tickTime: number = 0.001
    currentTick: number = 0
    remainderTime: number = 0.0
    elapsedTime: number = 0.0
    running: boolean = true

    constructor(player: CharacterData) {
        this.logger = new BattleLogger(this);
        this.player = new BattleCharacter(this, 0, player.weaponid, player.statusid, player.passiveid);
        this.enemy = new BattleCharacter(this, 1);
        this.player.opponent = this.enemy;
        this.enemy.opponent = this.player;
    }

    run(): void {
        console.log("Battle Start")
        this.player.onStart();
        this.enemy.onStart();
        while (true) {
            this.elapsedTime += this.tickTime;
            this.player.update();
            if (this.check_ending()) {
                break;
            }
            if (this.elapsedTime >= 30) {
                break;
            }
        }
    }

    get_battle_time(elapsedTime: number): number {
        return Number((elapsedTime * this.tickTime).toFixed(6));
    }

    check_ending(): boolean {
        if (this.player.hp <= 0.0 || this.enemy.hp <= 0.0) {
            return true;
        }
        return false;
    }
}