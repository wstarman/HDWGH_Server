import { DamageType } from "./enum/DamageType.js";
import type { Character } from "./Character.js";
import { Status, type StatusAddEvent } from "./Status.js";
import type { DamageEvent, StatusChangeEvent } from "./Event.js";

interface PassiveDef {
    onStart?: (character: Character) => void;
    onAttack?: (event: DamageEvent) => void;
    onDamageTaken?: (event: DamageEvent) => void;
    onDeath?: (event: DamageEvent) => void;
    onStatusChange?: (event: StatusChangeEvent) => void;
    onStatusAdd?: (event: StatusAddEvent) => void;
}

export class Passive {
    Id: string = "";

    PassiveDefinition: PassiveDef;

    constructor(id: string) {
        this.Id = id;
        const def = PassiveDefs[id];

        if (!def) {
            throw new Error(`Unknown passive: ${id}`);
        }

        this.PassiveDefinition = def;
    }

}

const PassiveDefs: Record<string, PassiveDef> = {
    "drug_resistance": {
        onDamageTaken: (damageEvent) => {
            if (damageEvent.damageSource instanceof Status && damageEvent.damageSource.Id == "poisoning") {
                damageEvent.modifier.multiplier *= 0.8  ;
            }
        },
        onStatusChange: (statusChangeEvent) => {

        }
    },
    "drug_residues": {
        onStart(character) {
            character.AddStatus("poisoning", 5);
        }
    },
    "drug_sobriety": {
        onStatusChange(event) {
            if (event.newStack == 0) {
                // TODO: add the debuff
            }
        }
    }
};
