import type { BattleCharacter } from "./BattleCharacter.js";
import { Status, StatusName as StatusName } from "./Status.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";

interface PassiveDef extends BaseEffectDef {
}

export class Passive extends BaseEffect {
    constructor(owner: BattleCharacter, id: string) {
        super(owner, id, passiveDefs);
    }
}

export const characterPassive: Record<string, Array<string>> = {
    "DrugGuy": ["drug_residue", "drug_tolerance", "sobriety"],
}

const passiveDefs: Record<string, PassiveDef> = {
    /**藥物殘留
     * 開場自帶5層毒在身上*/
    "drug_residue": {
        onStart() {
            this.toggle();
            this.owner.addStatus("poison", 5);
        }
    },
    /**抗藥性
     * 自然獲得20%毒傷害抗性，每秒減少兩層毒
     */
    "drug_tolerance": { // 
        triggerInterval: 1,
        beforeStart() {
            this.owner.toxicDamageTakenMultiplier *= 0.8;
        },
        onTrigger() {
            this.toggle();
            const poisonStatus = this.owner.getStatus("poison");
            if (poisonStatus !== undefined) {
                this.owner.addStatus(StatusName.poison, -2);
            }
        }
    },
    /**清醒
     * 戰鬥途中每次身上中毒層數歸零立刻進入清醒模式，有任何毒層數後滯留一秒消失
     * 清醒效果:
        攻擊速度+30%
        爆擊率+20%
        每秒獲得5護盾
     */
    "sobriety": {
        persistent: true,
        triggerInterval: 1,
        afterStatusChange(event) {
            if (event.status.id == StatusName.poison && event.status.stack == 0) {
                this.toggle(true);
                this.temp1 = 0;
                this.owner.attackSpeed += 0.3;
                this.owner.critRate += 0.2;
                this.mainTimer = 0;
            }
        },
        everyTick(deltaTime) {
            if (!this.enabled) return;
            if (this.owner.hasStatus(StatusName.poison)) {
                this.temp1! += deltaTime
            } else {
                this.temp1 = 0;
            }
            if (this.temp1! >= 1) {
                this.toggle(false);
                this.owner.attackSpeed -= 0.3;
                this.owner.critRate -= 0.2;
            }
        },
        onTrigger() {
            if (!this.enabled) return;
            this.toggle();
            this.owner.shield += 5;
        }
    }
};

