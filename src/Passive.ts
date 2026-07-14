import { DamageType } from "./enum/DamageType.js";
import { type DamageEvent, type DamageModifier } from "./Damage.js";
import type { Character } from "./Character.js";
import type { StatusAddEvent, StatusChangeEvent } from "./Status.js";

interface PassiveDef {
    onStart?: (character: Character) => void;
    onAttack?: (event: DamageEvent) => void;
    onDamageTaken?: (event: DamageEvent) => DamageModifier | null;
    onDeath?: (event: DamageEvent) => void;
    onStatusChange?: (event: StatusChangeEvent) => void;
    onStatusAdd?: (event: StatusAddEvent) => void;
}

export class Passive{
    Id: string = "";
    
    PassiveDefinition: PassiveDef;

    constructor(id: string){
        this.Id = id;
        const def = PassiveDefs[id];

        if(!def){
            throw new Error(`Unknown passive: ${id}`);
        }

        this.PassiveDefinition = def;
    }

}

const PassiveDefs: Record<string, PassiveDef> = {
    "drug_resistance": {
        onDamageTaken: (damageEvent) =>{
            if(damageEvent.sourceType == "status" && damageEvent.sourceId == "poisoning"){
                    return {
                        flat: 0,
                        multiplier: 0.75
                    }
            }

            return null;
        }
    },
    "drug_residues": {
        onStart(character) {
            character.AddStatus("poisoning", 5);
        },
        onStatusAdd(event) {
            event.status.StatusDefinition.natureDecrease = () => {
                // do nothing
            }
        }
    },
    "drug_withdrawal": {
        onStatusChange(event) {
            if(event.newStack==0){
                // TODO: add the debuff
            }
        },
    }
};
