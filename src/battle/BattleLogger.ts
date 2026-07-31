import type { DamageEvent, StatusChangeEvent } from "./Event.js";
import { Status } from "./Status.js";
import type { BattleManager } from "./BattleManager.js";
import { BaseEffect } from "./BaseEffect.js";
import type { BattleCharacterData, StatIdType } from "./BattleCharacterData.js";
import { Weapon } from "./Weapon.js";

export interface BattleLog {
    time: number;
    eventType: string;

    attacker?: number;
    receiver?: number;
    damage?: number | "miss";
    damageType?: string;
    isCritHit?: boolean;

    owner?: number;
    statusId?: string;
    beforeStack?: number
    afterStack?: number
    delta?: number;

    sourceType?: string;
    sourceObjectType?: string;
    sourceId?: string;

    equipmentId?: string;
    equipmentSlot?: number;
    persistent?: boolean;
    enabled?: boolean;

    statId?: string;
    target?: number;
    value?: number;
}

export class BattleLogger {
    battleManeger: BattleManager;
    battleLog: BattleLog[] = [];

    constructor(battleManeger: BattleManager) {
        this.battleManeger = battleManeger;
    }

    getTime() {
        return this.battleManeger.elapsedTime;
    }

    recordDamageEvent(event: DamageEvent, finalDamage: number | "miss") {
        let srcType: string = "error";
        let srcObjectType: string = "error";
        let srcId: string = "error";

        if (event.damageSource instanceof Status) {
            srcType = "status";
            srcObjectType = "status";
        } else if (event.damageSource instanceof Weapon) {
            srcType = "attack";
            srcObjectType = "equipment";
        } else if (event.damageSource instanceof BaseEffect) {
            srcType = "effect";
            srcObjectType = "effect";
        }
        srcId = event.damageSource.id;

        const log: BattleLog = {
            time: this.getTime(),
            eventType: "damage",
            attacker: event.attacker.index,
            receiver: event.receiver.index,
            damage: finalDamage,
            damageType: event.type,
            sourceType: srcType,
            sourceObjectType: srcObjectType,
            sourceId: srcId,
            isCritHit: event.isCritHit
        }
        this.battleLog.push(log);
    }

    recordStatusChangeEvent(event: StatusChangeEvent, before: number, after: number) {
        const log: BattleLog = {
            time: this.getTime(),
            eventType: "status_stack_change",
            owner: event.owner.index,
            statusId: event.status.id,
            beforeStack: before,
            afterStack: after,
            delta: after - before,
        }
        this.battleLog.push(log);
    }

    recordEffectToggleEvent(item: BaseEffect) {
        const log: BattleLog = {
            time: this.getTime(),
            eventType: "equipment_toggle",
            owner: item.owner.index,
            equipmentId: item.id,
            equipmentSlot: item.index,
            persistent: item.persistent,
            enabled: item.enabled
        }
        this.battleLog.push(log);
    }

    recordStatChangeEvent(character: BattleCharacterData, statId: StatIdType) {
        const log: BattleLog = {
            time: this.getTime(),
            eventType: "stat_change",
            target: character.index,
            statId,
            value: character[statId]
        }
        this.battleLog.push(log);
    }

    recordEffectStackChangeEvent(effect: BaseEffect) {
        const log: BattleLog = {
            time: this.getTime(),
            eventType: "stat_change",
            target: effect.owner.index,
            statId: effect.id,
            value: effect.stack >= 0 ? effect.stack : -1,
            equipmentSlot: effect.index
        }
        this.battleLog.push(log);
    }
}