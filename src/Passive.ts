import { DamageType } from "./enum/DamageType.js";
import type { Character } from "./Character.js";
import { Status, type EffectContext, type StatusAddEvent } from "./Status.js";
import { Events, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { BaseEffect } from "./BaseEffect.js";
import { StatusChangeReason } from "./enum/StatusChange.js";

interface PassiveDef {
    onStart?: (character: Character) => void;
    onAttack?: (event: DamageEvent) => void;
    onDamageTaken?: (event: DamageEvent) => void;
    onDeath?: (event: DamageEvent) => void;
    onStatusChange?: (event: StatusChangeEvent) => void;
    onStatusAdd?: (event: StatusAddEvent) => void;
    onEffectTrigger?: (passive: Passive, ctx: EffectContext) => void;
    effectInterval?: number;
}

export class Passive extends BaseEffect {
    Id: string = "";

    PassiveDefinition: PassiveDef;

    constructor(id: string) {
        super();

        this.Id = id;
        const def = PassiveDefs[id];

        if (!def) {
            throw new Error(`Unknown passive: ${id}`);
        }

        this.PassiveDefinition = def;
    }

    triggerEffect(ctx: EffectContext){
        if(!this.shouldTick(this.PassiveDefinition.effectInterval)) return;


        this.PassiveDefinition.onEffectTrigger?.(this, ctx);
    }

}

const PassiveDefs: Record<string, PassiveDef> = {
    "drug_resistance": {
        onDamageTaken: (damageEvent) => {
            if (damageEvent.damageSource instanceof Status && damageEvent.damageSource.Id == "poisoning") {
                damageEvent.modifier.multiplier *= 0.8;
            }
        },
        onEffectTrigger(passive, ctx){
            const poisoningStatus = ctx.holder.GetStatus("poisoning");

            if (poisoningStatus !== undefined) {
                const statusChangeEvent = Events.statusChange({
                    holder: ctx.holder,
                    status: poisoningStatus,
                    amount: -1,
                    reason: StatusChangeReason.Cleanse,
                    changeSource: passive 
                })

                ctx.holder.onStatusChange(statusChangeEvent);
            }
        },
        effectInterval: 1000
    },
    "drug_residues": {
        onStart(character) {
            character.AddStatus("poisoning", 5);
        }
    },
    "drug_sobriety": {
        /*onStatusChange(event) {
            if (event.newStack == 0) {
                // TODO: add the debuff
            }
        }*/
    }
};
