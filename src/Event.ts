import type { Character } from "./Character.js";
import type { DamageType } from "./enum/DamageType.js";
import type { EventType } from "./enum/EventType.js";
import type { Status } from "./Status.js";

export interface DamageEvent {
    eventType: EventType.DamageEvent,
    attacker: Character,
    receiver: Character,
    amount: number,
    type: DamageType
    sourceType: string,
    sourceObjectType: string;
    sourceId: string
}

export interface StatusChangeEvent {
    eventType: EventType.StatusChangeEvent,
    holder: Character,
    status: Status,
    originalStack: number,
    newStack: number
}

export type Events = DamageEvent | StatusChangeEvent;