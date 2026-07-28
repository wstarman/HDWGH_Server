import { DamageType } from "../enum/DamageType.js";
import type { BattleCharacter } from "./BattleCharacter.js";
import { Status } from "./Status.js";
import { Events, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { StatusChangeReason } from "../enum/StatusChange.js";
import { BattleLogger } from "./BattleLogger.js";

interface EffectCallbacks {
    onStart?(this: BaseEffect): void;
    onAttack?(this: BaseEffect, event: DamageEvent): void;
    onDamageTaken?(this: BaseEffect, event: DamageEvent): void;
    onDeath?(this: BaseEffect, event: DamageEvent): void;
    onStatusChange?(this: BaseEffect, event: StatusChangeEvent): void;
    onEffectTrigger?(this: BaseEffect): void;
}

export interface BaseEffectDef extends EffectCallbacks {
    interval?: number;
    slot?: number;
    persistent?: boolean;
}

export abstract class BaseEffect {
    id: string = "";
    owner: BattleCharacter;
    slot: number = -1;
    persistent: boolean = false;
    enabled: boolean = false
    timer = 0;
    interval = Infinity;

    onStart?: EffectCallbacks["onStart"];
    onAttack?: EffectCallbacks["onAttack"];
    onDamageTaken?: EffectCallbacks["onDamageTaken"];
    onDeath?: EffectCallbacks["onDeath"];
    onStatusChange?: EffectCallbacks["onStatusChange"];
    onEffectTrigger?: EffectCallbacks["onEffectTrigger"];

    constructor(owner: BattleCharacter, id: string, deflist: Record<string, BaseEffectDef>) {
        this.owner = owner;
        this.id = id;
        Object.assign(this, deflist[id]);
    }

    protected logToggueEvent() {
        this.owner.battleManager.logger.recordEffectToggleEvent(this);
    }

    protected shouldTick(interval?: number): boolean {
        if (!interval) return false;
        this.timer++;
        if (this.timer < interval) return false;
        this.timer = 0;
        return true;
    }
}

function wrapCallbacks<T extends object>(obj: T, name: string): T {
    const result = {} as T;

    for (const key in obj) {
        const value = obj[key];

        if (typeof value === "function") {
            result[key] = function (this: BaseEffect, ...args: any[]) {
                const successful = value.apply(this, args);
                if (successful) {
                    this.owner.battleManager.logger.recordEffectToggleEvent(this)
                    console.log(`[${name}] ${key}`, args);
                }
                return successful;
            } as any;
        }
    }

    return result;
}