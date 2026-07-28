import { DamageType } from "../enum/DamageType.js";
import type { BattleCharacter } from "./BattleCharacter.js";
import { Status } from "./Status.js";
import { Events, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import { StatusChangeReason } from "../enum/StatusChange.js";

interface PassiveDef extends BaseEffectDef {
}

export class Passive extends BaseEffect {
    id: string = "";

    constructor(owner: BattleCharacter, id: string) {
        super(owner, id, passiveDefs);
    }
}

enum PassiveNames {
    DrugResidue = "drug_residue",
    DrugTolerance = "drug_tolerance",
    Sobriety = "sobriety"
}

const passiveDefs: Record<string, PassiveDef> = {
    "drug_residue": {
        onStart() {
            this.logToggueEvent()
            this.owner.addStatus("poisoning", 5);
        }
    },
    "drug_tolerance": {
        interval: 1000,
        onDamageTaken(damageEvent) {
            if (damageEvent.damageSource instanceof Status && damageEvent.damageSource.id == "poisoning") {
                damageEvent.modifier.multiplier *= 0.8;
            }
        },
        onEffectTrigger() {
            const poisoningStatus = this.owner.getStatus("poisoning");

            if (poisoningStatus !== undefined) {
                const statusChangeEvent = Events.statusChange({
                    holder: this.owner,
                    status: poisoningStatus,
                    delta: -1
                })

                this.owner.onStatusChange(statusChangeEvent);
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

