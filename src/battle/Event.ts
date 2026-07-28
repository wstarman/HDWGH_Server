import type { BattleCharacter } from "./BattleCharacter.js";

import { EventType } from "../enum/EventType.js";
import type { DamageType } from "../enum/DamageType.js";
import type { Status } from "./Status.js";
import type { StatusChangeReason } from "../enum/StatusChange.js";
import type { Passive } from "./Passive.js";

type DamageSource =
    | BattleCharacter
    | Status;
//| Skill
//| Projectile;

export interface DamageModifier {
    flat: number,
    multiplier: number;
}

export interface DamageEvent {
    modifier: DamageModifier,
    attacker: BattleCharacter,
    receiver: BattleCharacter,
    amount: number,
    type: DamageType,
    damageSource: DamageSource
}

export interface StatusChangeEvent {
    holder: BattleCharacter,
    status: Status,
    delta: number
}

export const Events = {
    damage(info: Omit<DamageEvent, "modifier">): DamageEvent {
        return {
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