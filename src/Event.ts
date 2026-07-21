import type { Character } from "./Character.js";

import { EventType } from "./enum/EventType.js";
import type { DamageType } from "./enum/DamageType.js";
import type { Status } from "./Status.js";
import type { StatusChangeReason } from "./enum/StatusChange.js";

type DamageSource =
    | Character
    | Status;
    //| Skill
    //| Projectile;

type ChangeSource = 
    | Status;

export interface DamageModifier{
    flat: number,
    multiplier: number;
}

export interface DamageEvent {
    modifier: DamageModifier,

    attacker: Character,
    receiver: Character,
    amount: number,
    type: DamageType,
    damageSource: DamageSource
}

export interface StatusChangeEvent {
    holder: Character,
    status: Status,
    amount: number,
    reason: StatusChangeReason,
    changeSource: ChangeSource
}

export const Events = {
    damage(info: Omit<DamageEvent, "modifier">): DamageEvent {
        return{
            modifier: {
                flat: 0,
                multiplier: 1.0
            },
            ...info
        }
    },
    
    statusChange(info: Omit<StatusChangeEvent, "modifier">): StatusChangeEvent {
        return {
            ...info,
        };
    }
}