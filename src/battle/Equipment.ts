import type { BattleCharacter } from "./BattleCharacter.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";

export interface EquipmentDef extends BaseEffectDef {
}

export class Equipment extends BaseEffect {
    constructor(owner: BattleCharacter, id: string, defs: Record<string, BaseEffectDef> | null = null) {
        if (defs) {
            super(owner, id, defs);
        }
        else {
            super(owner, id, equipmentDefs);
        }
    }
}

const equipmentDefs: Record<string, EquipmentDef> = {
};

