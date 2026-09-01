import type { BattleCharacter } from "./BattleCharacter.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import { DamageType } from "../enum/DamageType.js";
import { Equipment, type EquipmentDef } from "./Equipment.js";
import weaponDataList from "../data/weapons.json" with { type: "json" };
import { StatusName } from "./Status.js";
import type { Curse } from "./Curse.js";

interface WeaponDef extends EquipmentDef {
    damage?: number,
    staminaCost?: number,
    triggerInterval?: number,
    damageType?: DamageType,
}

export class Weapon extends Equipment {
    constructor(owner: BattleCharacter, id: string, index: number) {
        if (!weaponDataLoaded) {
            const gradeTable: Record<string, number> = { "low": 0, "mid": 1, "high": 2 };
            for (const weaponData of weaponDataList) {
                const wid = weaponData.id;
                if (weaponDefs[wid]) {
                    weaponDefs[wid].damage = weaponData.damage ?? 0
                    weaponDefs[wid].staminaCost = weaponData.stamina_cost ?? 0
                    weaponDefs[wid].triggerInterval = weaponData.attack_interval ?? Infinity
                    weaponDefs[wid].grade = gradeTable[weaponData.grade] ?? 0;
                    // if (weaponDefs[wid] && weapon.tags) {
                    //     weaponDefs[wid].tags = [...weapon.tags];
                    // }
                    // weaponDefs[wid]!.damageType = weapon.damageType ?? DamageType.Physical
                }
            }
            weaponDataLoaded = true;
        }
        super(owner, id, index, weaponDefs);
    }

}

let weaponDataLoaded = false;
export const weaponDefs: Record<string, WeaponDef> = {
    /**命在弦上
     * 每 1 秒射擊一次，跟俄羅斯輪盤一樣有機會空槍，一直到射中為止。
     * 空槍算正常攻擊，並被標註為 miss。
     * 實際開槍必定命中，不受 miss 率影響，並且需要固定 2 秒的重置期，重置後往復以上循環。
     */
    "loaded_fate": {
        beforeStart() {
            this.stack = 6;
        },
        onTrigger() {
            if (this.owner.attackProhibited) return;
            if (Math.random() > 1 / this.stack!) {
                // miss
                const result = this.attack(this.damage, -Infinity)
                if (result.used) {
                    this.stack! -= 1;
                }

            } else {
                // hit
                const result = this.attack(this.damage, Infinity)
                if (result.used) {
                    this.stack = 6;
                    this.mainTimer = -2;
                }
            }
        }
    },
    /**回彈警棍
     * 每受到 4 次武器傷害事件後，立即攻擊一次，消耗一半耐力。中毒、燃燒等持續傷害不計入受到攻擊次數。
     */
    "rebound_baton": {
        beforeStart() {
            this.stack = 0;
        },
        onTrigger() {
            if (this.owner.attackProhibited) return;
            this.attack();
        },
        afterDamageTaken(event) {
            if (event.damageSource instanceof Weapon) {
                this.stack += 1;
                if (this.stack >= 4) {
                    this.togglePassive();
                    this.stack -= 4;
                    this.attack(this.damage, this.hitRate, this.staminaCost / 2);
                }
            }
        }
    },
    /**生鏽匕首
     * 每次攻擊時有 50% 的機率造成對手 +1 中毒。
     */
    "rusty_dagger": {
        onTrigger() {
            if (this.owner.attackProhibited) return;
            const result = this.attack();
            if (result.hit && Math.random() > 0.5) {
                this.owner.opponent.addStatus(StatusName.poison, 1);
            }
        },
    },
    /**名字：長得像盾又像斧頭還是劍之類的不知道三小東西問翁世乘(你是說可以使出超高輸出屬性解放斬的充能斧嗎)
     * 效果：血量高於50%時，此武器提供+20%武器抗性，血量小於等於50%時，此武器攻速-50%，然而攻擊力+200%。
     */
    "cw4": {
        persistent: true,
        beforeStart() {
            this.owner.weaponDamageTakenMultiplier *= 0.8;
        },
        onStatChange(stat, value) {
            if (stat == "hp" || stat == "maxHp") {
                if (this.owner.hp <= this.owner.maxHp * 0.5 && !this.enabled) {
                    this.toggle(true);
                    this.owner.weaponDamageTakenMultiplier /= 0.8;
                    this.speed -= 0.5;
                    this.damage *= 3;
                }
                else if (this.owner.hp > this.owner.maxHp * 0.5 && this.enabled) {
                    this.toggle(false);
                    this.owner.weaponDamageTakenMultiplier *= 0.8;
                    this.speed += 0.5;
                    this.damage /= 3;
                }
            }
        },
        onTrigger() {
            if (this.owner.attackProhibited) return;
            this.attack();
        }
    },
    /**名字：決鬥長矛
     * 效果：每次攻擊，對手也同樣會使用決鬥長矛攻擊一次自己，然而自己的攻擊長矛會造成75%傷害量的回血。
     */
    "cw5": {
        onTrigger() {
            if (this.owner.attackProhibited) return;
            const result = this.attack();
            if (result.used) {
                if (result.hit) {
                    this.owner.hp += result.event!.amount * 0.75;
                }
                const opponentSpear = new Weapon(this.owner.opponent, "cw5", -1);
                opponentSpear.attack();
            }
        }
    },
    /**名字：必中神槍
     * 效果：此武器的攻擊命中率固定為95%，然而若此武器Miss了則對使用者造成終極羞辱，暫停所有攻擊3秒
     */
    "cw6": {
        // 「必中」效果寫在character.attack中
        onTrigger() {
            if (this.owner.attackProhibited) return;
            const result = this.attack();
            if (result.used && !result.hit) {
                this.owner.logger.recordCustomEvent(
                    this.owner.index,
                    this.id,
                    `[side:${this.owner.index}]受到了終極羞辱！暫停攻擊3秒`,
                    `[side:${this.owner.index}] has suffered the ultimate humiliation! Attack paused for 3 seconds.`
                );
                this.owner.attackProhibited = true;
                this.addTimer(3, () => this.owner.attackProhibited = false);
            }
        }
    },
    /**名字：爆炸重錘
     * 效果：每次攻擊後獲得1層蓄能，最多4層。擁有4層蓄能時發動攻擊，消耗全部蓄能並使該次攻擊的傷害倍率變為2.5倍且必中。然而，自己同樣會遭受此攻擊傷害的一半
     */
    "cw7": {
        beforeStart() {
            this.stack = 0;
        },
        onTrigger() {
            if (this.owner.attackProhibited) return;
            if (this.stack >= 4) {
                const result = this.attack(this.damage * 2.5, Infinity);
                if (result.used) {
                    this.stack = 0;
                    const event = result.event!
                    this.owner.calculateDamage(
                        this.owner,
                        this.damage * 1.25,
                        this.damageType,
                        this,
                        event.isCritHit
                    )
                }
            } else {
                const result = this.attack();
                if (result.used) {
                    this.stack++;
                }
            }
        },
    },
    /**名字：沉重大錨
     * 效果：攻擊命中時，減少對手的攻擊傷害25%三秒(可刷新，不疊加)，此外，一次傷害事件內受到超過25%maxHP的傷害時，腳色最多的負面stack-50%
     * (這效果...好樣的一個通用裝給我加了兩個新機制)
    */
    "cw8": {
        onTrigger() {
            if (this.owner.attackProhibited) return;
            const result = this.attack();
            if (result.hit) {
                if (!this.owner.opponent.hasBuff("cw8")) {
                    this.owner.opponent.attackPower -= 0.25;
                }
                this.owner.opponent.addBuff("cw8", 3, () => {
                    this.owner.opponent.attackPower += 0.25;
                })
            }
        },
        afterDamageTaken(event) {
            if (event.amount > this.owner.maxHp * 0.25) {
                this.togglePassive();
                let maxCurse: Curse | null = null
                for (const curse of this.owner.allEffects) {
                    if (curse.hasNegativeStack) {
                        if (!maxCurse || maxCurse.stack < curse.stack) {
                            maxCurse = curse;
                        }
                    }
                }
                if (maxCurse) {
                    maxCurse.onClearNegativeStack?.(0, 0.5);
                }
            }
        },
    },
    /**名字：復仇巨斧
     * 效果：每次受到攻擊有25%機會，此武器發動一次無耐耗攻擊，此次攻擊無視抗性
     */
    "cw9": {
        onTrigger() {
            if (this.owner.attackProhibited) return;
            this.attack();
        },
        afterDamageTaken(event) {
            if (event.amount > 0 && event.damageSource instanceof Weapon && Math.random() < 0.25) {
                this.togglePassive();
                this.attack(this.damage, this.hitRate, 0, true);
            }
        },
    },
    /**名字：加特林機槍
     * 效果：每次攻擊獲得1層轉速。每層轉速使此武器的攻擊間隔縮短10%，攻擊時耐力不足則清空所有層數。 
     */
    "cw10": {
        beforeStart() {
            this.stack = 0;
        },
        onTrigger() {
            if (this.owner.attackProhibited) return;
            const result = this.attack();
            if (result.used) {
                this.stack++;
                this.triggerInterval *= 0.9;
            }
        },
        onStaminaInsufficient() {
            this.stack = 0;
            this.triggerInterval = this.basicTriggerInterval;
        },
    }
};

