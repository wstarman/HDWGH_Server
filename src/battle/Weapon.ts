import type { BattleCharacter } from "./BattleCharacter.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import { DamageType } from "../enum/DamageType.js";

interface WeaponDef extends BaseEffectDef {
    power: number,
    damageType: DamageType,
}

export class Weapon extends BaseEffect {
    power: number = 0;
    damageType: DamageType = DamageType.Physical;
    constructor(owner: BattleCharacter, id: string) {
        super(owner, id, weaponDefs);
    }
}

const weaponDefs: Record<string, WeaponDef> = {
};

