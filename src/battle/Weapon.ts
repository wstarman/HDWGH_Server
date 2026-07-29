import type { BattleCharacter } from "./BattleCharacter.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import { DamageType } from "../enum/DamageType.js";
import { Equipment, type EquipmentDef } from "./Equipment.js";

interface WeaponDef extends EquipmentDef {
    damage?: number,
    staminaCost?: number,
    attackInterval?: number
    damageType?: DamageType,
}

export class Weapon extends Equipment {
    damage: number = 0;
    staminaCost: number = 0;
    attackInterval: number = Infinity;
    damageType: DamageType = DamageType.Physical;
    constructor(owner: BattleCharacter, id: string) {
        super(owner, id, weaponDefs);
    }
    loadWeaponDef(path: string) {
    }
}

const weaponDefs: Record<string, WeaponDef> = {
    "loaded_fate": {

    }
};

