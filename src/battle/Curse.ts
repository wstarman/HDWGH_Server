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
            this.mainTimer = 3;
        },
        afterStatusChange(event) {
            if (event.status.id == StatusName.poison && event.delta < 0 && this.mainTimer > 3) {
                this.stack += -event.delta;
                if (this.stack >= this.temp1) {
                    this.mainTimer = 0;
                    this.temp1 += 10;
                    this.owner.addStatus(StatusName.stun, 1);
                }
            }
        },
    },
    /**
     * Dirty Blood
     * 每次觸發藥物效果時，額外獲得 1 層中毒。
     * 並且接下來 4 秒內，受到的治療效果降低 20%。(此效果會永久殘留1%) 
     */
    "dirty_blood": {
        persistent: true,
        triggerInterval: 4,
        onAnyEffectToggle(effect) {
            if (!effect.hasTag("drug")) return;
            this.mainTimer = 0;
            if (!this.enabled) {
                this.toggle(true);
                this.owner.healRate -= 0.2;
            }
            this.addTimer(4, () => { this.owner.healRate -= 0.01 });
        },
        onTrigger() {   // 效果結束
            this.toggle(false);
            this.owner.healRate += 0.2;
        },
    },
    /**
     * Glass Nerves 
     * 當角色以任何方式減少10層毒或者進入清醒狀態時，減傷-10%(如果是進入清醒狀態觸發，效力2x)
     */
    "glass_nerves": {
        afterStatusChange(event) {
            if (event.status.id == "poison" && event.delta < 0) {
                this.stack += -event.delta;
                if (this.stack >= 10) {
                    this.stack -= 10;
                    this.owner.allDamageTakenMultiplier *= 1.1;
                }
            }
        },
        onAnyEffectToggle(effect) {
            if (effect.id == "sobriety" && effect.enabled) {
                this.owner.allDamageTakenMultiplier *= 1.2;
            }
        },
    },
    /**
     * Organ Failure  器官衰竭
     * 每次觸發藥物效果時，獲得 1 層器官衰竭。
     * 每層器官負荷使最大生命值降低 4%，持續到本場戰鬥結束。
     * 最多疊加 20 層(-80%)。
     */
    "organ_failure": {
        onAnyEffectToggle(effect) {
            if (!effect.hasTag("drug")) return;
            if (this.stack < 20) {
                this.stack += 1;
                const beforeHpMultiplier = 1 - (this.stack - 1) * 0.04;
                const afterHpMultiplier = 1 - this.stack * 0.04;
                this.owner.maxHp = this.owner.maxHp / beforeHpMultiplier * afterHpMultiplier;
            }
        },
    },
};

