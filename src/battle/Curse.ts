import type { BattleCharacter } from "./BattleCharacter.js";
import { Status, StatusName as StatusName } from "./Status.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";

interface CurseDef extends BaseEffectDef {
}

export class Curse extends BaseEffect {
    constructor(owner: BattleCharacter, id: string) {
        super(owner, id, curseDefs);
    }
}

const curseDefs: Record<string, CurseDef> = {
    /**
     * Overbright Eyes
        每次使用藥物時，獲得 1 層感官過載。
        每層感官過載使下一次攻擊增加miss機率(10%)。
        攻擊miss後清除所有感官過載 
     */
    "overbright_eyes": {
        beforeStart() {
            this.stack = 0;
        },
        onAnyEffectToggle(effect) {
            if (!effect.hasTag("drug")) return;
            this.stack += 1;
        },
        beforeAttack(event) {
            event.hitRate -= this.stack * 0.1;
        },
        onAttackMiss() {
            this.stack = 0;
        },
    },
    /**
     * Hollow vessel
        毒層數每減少超過5，進入一秒昏厥期，
        此效果觸發後有3秒的冷卻並且每次觸發下次需要的數值+10
     */
    "hollow_vessel": {
        beforeStart() {
            this.stack = 0;
            this.temp1 = 5;
            this.timer = 3;
        },
        afterStatusChange(event) {
            if (event.status.id == StatusName.poison && event.delta < 0 && this.timer > 3) {
                this.stack -= event.delta;
                if (this.stack >= this.temp1) {
                    this.timer = 0;
                    this.temp1 += 10;
                    this.owner.addStatus(StatusName.dizzy, 1);
                }
            }
        },
    }
};

