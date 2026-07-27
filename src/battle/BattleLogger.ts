import { Character } from "./Character.js"
import { DamageType } from "../enum/DamageType.js";
import { EventType } from "../enum/EventType.js";
import type { DamageEvent, Events, StatusChangeEvent } from "./Event.js";
import { Passive } from "./Passive.js";
import { Status, type EffectContext } from "./Status.js";

export interface BattleLog {
    time: number;
    eventType: string;

    attacker?: number;
    receiver?: number;
    damage?: number;
    damageType?: string;

    owner?: number;
    statusId?: string;
    delta?: number;

    sourceType?: string;
    sourceObjectType?: string;
    sourceId?: string;

    equipmentId?: string
    equipmentSlot?: number;
}

export class BattleLogger {
    BattleLog: BattleLog[] = [];

    constructor(private readonly getTime: () => number) { }

    recordDamageEvent(event: DamageEvent, final: number) {

        let srcType: string = "error";
        let srcOT: string = "error";
        let srcId: string = "error";

        if (event.damageSource instanceof Status) {
            srcType = "status";
            srcOT = "status";
            srcId = event.damageSource.id;
        }

        const log: BattleLog = {
            time: this.getTime(),
            eventType: "damage",
            attacker: event.attacker.index,
            receiver: event.receiver.index,
            damage: final,
            damageType: event.type,
            sourceType: srcType,
            sourceObjectType: srcOT,
            sourceId: srcId
        }

        this.BattleLog.push(log);
    }

    recordStatusChangeEvent(event: StatusChangeEvent, before: number, after: number) {

        let srcType: string = "error";
        let srcOT: string = "error";
        let srcId: string = "error";

        const log: BattleLog = {
            time: this.getTime(),
            eventType: "status_stack_change",
            owner: event.holder.index,
            statusId: event.status.id,
            delta: after - before,
            sourceType: srcType,
            sourceObjectType: srcOT,
            sourceId: srcId,
        }

        this.BattleLog.push(log);
    }
}