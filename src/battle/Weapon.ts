import type { BattleCharacter } from "./BattleCharacter.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import { DamageType } from "../enum/DamageType.js";
import { Equipment, type EquipmentDef } from "./Equipment.js";
import weaponData from "../data/weapons.json" with { type: "json" };
import { StatusName } from "./Status.js";

interface WeaponDef extends EquipmentDef {
    damage?: number,
    staminaCost?: number,
    triggerInterval?: number,
    damageType?: DamageType,
}

export class Weapon extends Equipment {
    constructor(owner: BattleCharacter, id: string, index: number) {
        if (!weaponDataLoaded) {
            for (const weapon of weaponData) {
                const wid = weapon.id;
                if (weaponDefs[wid]) {
                    weaponDefs[wid].damage = weapon.damage || 0
                    weaponDefs[wid].staminaCost = weapon.stamina_cost || 0
                    weaponDefs[wid].triggerInterval = weapon.attack_interval || Infinity
                    // if (weaponDefs[wid] && weapon.tags) {
                    //     weaponDefs[wid].tags = [...weapon.tags];
                    // }
                    // weaponDefs[wid]!.damageType = weapon.damageType || DamageType.Physical
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
            if (Math.random() > 1 / this.stack!) {
                // miss
                if (this.attack(this.damage, -Infinity)) {
                    this.stack! -= 1;
                }

            } else {
                // hit
                if (this.attack(this.damage, Infinity)) {
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
            this.attack();
        },
        afterDamageTaken(event) {
            if (event.damageSource instanceof Weapon) {
                this.stack += 1;
                if (this.stack >= 4) {
                    this.attack(this.damage, this.hitRate, this.staminaCost / 2);
                    this.stack -= 4;
                }
            }
        }
    },
    /**生鏽匕首
     * 每次攻擊時有 50% 的機率造成對手 +1 中毒。
     */
    "rusty_dagger": {
        onAttackHit(event) {
            if (Math.random() > 0.5) {
                this.owner.opponent.addStatus(StatusName.poison, 1);
            }
        },
        onTrigger() {
            this.attack();
        },
    },
};

