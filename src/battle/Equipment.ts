import type { BattleCharacter } from "./BattleCharacter.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import equipmentData from "../data/equipments.json" with { type: "json" };
import { StatusName } from "./Status.js";
import { Weapon } from "./Weapon.js";

export interface EquipmentDef extends BaseEffectDef {
}

export class Equipment extends BaseEffect {
    constructor(owner: BattleCharacter, id: string, index: number, defs?: Record<string, BaseEffectDef>) {
        if (defs) {
            super(owner, id, defs);
        }
        else {
            if (!equipmentDataLoaded) {
                for (const equipment of equipmentData) {
                    const eid = equipment.id;
                    if (equipmentDefs[eid] && equipment.tags) {
                        equipmentDefs[eid].tags = [...equipment.tags];
                    }
                }
                equipmentDataLoaded = true;
            }
            super(owner, id, equipmentDefs);
        }
        this.index = index;
    }
}

let equipmentDataLoaded = false;
export const equipmentDefs: Record<string, EquipmentDef> = {
    /**白色小藥片
     * 每 5 秒觸發一次。觸發時，獲得 1 層中毒，並隨機獲得以下一種效果，持續 4 秒：
     * 攻擊力 +15%
     * 攻擊速度 +10%
     * 受到武器傷害 -10% */
    "pills": {
        triggerInterval: 5,
        persistent: true,
        onTrigger() {
            this.toggle(true);
            this.owner.addStatus(StatusName.poison, 1);
            const r = Math.random();
            if (r < 0.333) {
                this.owner.attackPower += 0.15;
                this.addTimer(4, () => this.owner.attackPower -= 0.15)
            } else if (r < 0.667) {
                this.owner.attackSpeed += 0.1;
                this.addTimer(4, () => this.owner.attackSpeed -= 0.1)
            } else {
                this.owner.weaponDamageTakenMultiplier *= 0.9;
                this.addTimer(4, () => this.owner.weaponDamageTakenMultiplier /= 0.9)
            }
        },
    },
    /**苦味糖漿
     * 開始時生效，每 1 秒回復 3 HP，並使受到的中毒傷害降低 10%。
     * 開場時以及之後每 3 秒加 1 層毒。
     */
    "bitter_syrup": {
        triggerInterval: 3,
        beforeStart() {
            this.owner.poisonDamageTakenMultiplier *= 0.9;
        },
        onStart() {
            this.owner.addStatus(StatusName.poison, 1);
        },
        everyTick(deltaTime) {
            this.temp1 += deltaTime;
            if (this.temp1 >= 1) {
                this.toggle();
                this.temp1 -= 1;
                this.owner.heal(3);
            }
        },
        onTrigger() {
            this.toggle();
            this.owner.addStatus(StatusName.poison, 1);
        },
    },
    /**安眠藥
     * 全場被動。每 3 秒觸發一次。
     * 接下來 2 秒內，受到的武器傷害降低 50%，但是在效果結束時獲得一層中毒並且返還 40% 傷害。
     */
    "night_pill": {
        triggerInterval: 3,
        persistent: true,
        isUnique: true,
        onTrigger() {
            this.toggle(true);
            this.owner.weaponDamageTakenMultiplier *= 0.5;
            this.temp1 = 0;
            this.addTimer(2, () => {
                this.toggle(false);
                this.owner.weaponDamageTakenMultiplier /= 0.5;
                this.owner.addStatus(StatusName.poison, 1);
                this.owner.takeDamage(this.temp1 * 0.8);
            });
        },
        afterDamageTaken(event) {
            if (event.damageSource instanceof Weapon) {
                this.temp1 += event.amount;
            }
        },
    },
    /**過期維他命
     * 被動：最大生命值獲取量 +10%。
     * 每 4 秒觸發一次。觸發時，獲得 10 max HP、一層毒。接下來 5 秒內，攻擊速度 +20%。
     */
    "expired_vitamin": {
        triggerInterval: 4,
        beforeStart() {
            this.owner.maxHpGainRate += 0.1;
        },
        onTrigger() {
            this.toggle();
            this.owner.maxHp += 10;
            this.owner.hp += 10;
            this.owner.addStatus(StatusName.poison, 1);
            this.owner.attackSpeed += 0.2;
            this.addTimer(5, () => this.owner.attackSpeed -= 0.2);
        }
    },
    /**戒毒小紙條
     * 全場被動。角色每次以任何手段減少 2 層毒，獲得 5 護盾並且傷害 +5%。
     */
    "recovery_note": {
        isUnique: true,
        beforeStart() {
            this.stack = 2;
        },
        afterStatusChange(event) {
            if (event.status.id == StatusName.poison && event.delta < 0) {
                this.stack -= event.delta;
                if (this.stack >= 2) {
                    this.owner.shield += 5;
                    this.owner.attackPower += 0.05;
                }
            }
        },
    },
    /**戒斷貼片
     * 全場被動。如果角色因為中毒受傷，其中的 10% 轉化為護盾。
     * 增加角色的自然毒衰減速度20%，此效果在毒層數低於 5 時不生效。
     */
    "withdrawal_patch": {
        isUnique: true,
        afterStatusChange(event) {
            if (event.status.stack >= 5 && !this.enabled2) {
                this.enabled2 = true;
                this.owner.getEffect("drug_tolerance")!.speed += 0.2;
            } else if (event.status.stack < 5 && this.enabled2) {
                this.owner.getEffect("drug_tolerance")!.speed -= 0.2;
            }
        },
        afterDamageTaken(event) {
            if (event.damageSource.id == StatusName.poison) {
                this.owner.shield += event.amount * 0.1;
            }
        },
    }
};

