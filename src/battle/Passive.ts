import { DamageType } from "../enum/DamageType.js";
import type { Character } from "./Character.js";
import { Status, type EffectContext, type StatusAddEvent } from "./Status.js";
import { Events, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import { StatusChangeReason } from "../enum/StatusChange.js";

interface PassiveDef extends BaseEffectDef {
}

export class Passive extends BaseEffect {
    id: string = "";

    constructor(owner: Character, id: string) {
        console.log(id, passiveDefs)
        super(owner, id, passiveDefs);
    }
}

enum PassiveNames {
    DrugResidue = "drug_residue",
    DrugTolerance = "drug_tolerance",
    Sobriety = "sobriety"
}
function Log(id: string) { }
const passiveDefs: Record<string, PassiveDef> = {
    "drug_residue": {
        onStart() {
            this.owner.addStatus("poisoning", 5);
        }
    },
    "drug_tolerance": {
        interval: 1000,
        onDamageTaken: (damageEvent) => {
            if (damageEvent.damageSource instanceof Status && damageEvent.damageSource.id == "poisoning") {
                damageEvent.modifier.multiplier *= 0.8;
            }
        },
        onEffectTrigger(ctx) {
            const poisoningStatus = ctx.holder.getStatus("poisoning");

            if (poisoningStatus !== undefined) {
                const statusChangeEvent = Events.statusChange({
                    holder: ctx.holder,
                    status: poisoningStatus,
                    amount: -1
                })

                ctx.holder.onStatusChange(statusChangeEvent);
            }
        }
    },
    "sobriety": {
        /*onStatusChange(event) {
            if (event.newStack == 0) {
                // TODO: add the debuff
            }
        }*/
    }
};

