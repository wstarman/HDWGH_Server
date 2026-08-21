import type { CharacterInitData } from "../index.js";
import { BattleCharacter } from "./BattleCharacter.js"
import { BattleLogger } from "./BattleLogger.js"

export class BattleManager {
    player: BattleCharacter;
    enemy: BattleCharacter;
    logger: BattleLogger;
    tickTime: number = 0.01;
    currentTick: number = 0;
    remainderTime: number = 0.0;
    elapsedTime: number = 0.0;
    running: boolean = true;
    result: "win" | "lose" | "draw" = "win";

    constructor(player: CharacterInitData, enemy: CharacterInitData) {
        this.logger = new BattleLogger(this);
        this.player = new BattleCharacter(this, 0, player.character_id, player.curses.map(item => { return item.id }), player.equipmets.map(item => { return item.id }));
        this.enemy = new BattleCharacter(this, 1, enemy.character_id, enemy.curses.map(item => { return item.id }), enemy.equipmets.map(item => { return item.id }));
        this.player.opponent = this.enemy;
        this.enemy.opponent = this.player;
    }

    run(): void {
        console.log("Battle Start")
        this.player.beforeStart();
        this.enemy.beforeStart();
        this.player.onStart();
        this.enemy.onStart();
        while (true) {
            this.elapsedTime += this.tickTime;
            this.player.update();
            this.enemy.update();
            if (this.check_ending()) {
                break;
            }
        }
        if (this.player.hp < 0 && this.enemy.hp < 0 && this.player.undead != this.enemy.undead) {
            if (this.player.undead) this.result = "win";
            else this.result = "lose";
        }
        else if (this.player.hp < 0 && this.enemy.hp < 0 || this.player.hp == this.enemy.hp) {
            // this.result = "draw";
            this.result = "win"
        }
        else if (this.player.hp > this.enemy.hp) {
            this.result = "win";
        } else {
            this.result = "lose";
        }
    }

    get_battle_time(elapsedTime: number): number {
        return Number((elapsedTime * this.tickTime).toFixed(6));
    }

    check_ending(): boolean {
        return !this.player.alive || !this.enemy.alive || this.elapsedTime >= 30;
    }
}