import type { DamageEvent } from "./Event.js";

export interface DamageModifier{
    flat: number,
    multiplier: number;
}

export class DamageSystem {
    static deal(event: DamageEvent): number{
        let modifier: DamageModifier = {
            flat: 0,
            multiplier: 1
        }

        event.receiver.Passive.forEach(passive => {
            if(passive.PassiveDefinition.onDamageTaken){
                const change = passive.PassiveDefinition.onDamageTaken(event);

                if(change){
                    modifier.flat += change.flat;
                    modifier.multiplier *= change.multiplier;
                }
            }
        })

        const final = Math.max(0, event.amount * modifier.multiplier + modifier.flat);

        event.receiver.TakeDamage(final);

        return final
    }
}