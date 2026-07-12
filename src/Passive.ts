import { DamageType } from "./enum/DamageType.js";
import { type DamageEvent, type DamageModifier } from "./Damage.js";

interface PassiveDef {
    onAttack?: (event: DamageEvent) => void;
    onDamageTaken?: (event: DamageEvent) => DamageModifier | null;
    onDeath?: (event: DamageEvent) => void;
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
    }
};
