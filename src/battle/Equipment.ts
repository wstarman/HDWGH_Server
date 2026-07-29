import type { BattleCharacter } from "./BattleCharacter.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import equipmentData from "../../../../assets/text/equipments.json" with { type: "json" };

export interface EquipmentDef extends BaseEffectDef {
}

export class Equipment extends BaseEffect {
    constructor(owner: BattleCharacter, id: string, defs?: Record<string, BaseEffectDef>) {
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
    }
}

let equipmentDataLoaded = false;
const equipmentDefs: Record<string, EquipmentDef> = {
};

