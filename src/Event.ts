import type { Character } from "./Character.js";

import { EventType } from "./enum/EventType.js";
import type { DamageType } from "./enum/DamageType.js";
import type { Status } from "./Status.js";

type DamageSource =
    | Character
    | Status;
    //| Skill
    //| Projectile;

export interface DamageModifier{
    flat: number,
    multiplier: number;
}

export interface DamageEvent {
    eventType: EventType.DamageEvent,
    modifier: DamageModifier,

    attacker: Character,
    receiver: Character,
    amount: number,
    type: DamageType,
    damageSource: DamageSource
}

export interface StatusChangeEvent {
    eventType: EventType.StatusChangeEvent,

    holder: Character,
    status: Status,
    originalStack: number,
    newStack: number
}

export const Events = {
    damage(info: Omit<DamageEvent, "eventType" | "modifier">): DamageEvent {
        return{
            eventType: EventType.DamageEvent,
            modifier: {
                flat: 0,
                multiplier: 1.0
            },
            ...info
        }
    },
    
    statusChange(info: Omit<StatusChangeEvent, "eventType">): StatusChangeEvent {
        return {
            eventType: EventType.StatusChangeEvent,
            ...info,
        };
    }
}