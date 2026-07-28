import { DamageType } from "../enum/DamageType.js";
import type { BattleCharacter } from "./BattleCharacter.js";
import { Status } from "./Status.js";
import { Events, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { StatusChangeReason } from "../enum/StatusChange.js";
import { BattleLogger } from "./BattleLogger.js";

interface EffectCallbacks {
    everyTick?(this: BaseEffect): void;
    beforeStart?(this: BaseEffect): void;
    onStart?(this: BaseEffect): void;
    onTrigger?(this: BaseEffect): void;
    onAttack?(this: BaseEffect, event: DamageEvent): void;
    beforeDamageTaken?(this: BaseEffect, event: DamageEvent): void;
    afterDamageTaken?(this: BaseEffect, event: DamageEvent): void;
    afterStatusChange?(this: BaseEffect, event: StatusChangeEvent): void;
    // onAnyEffectToggle?(this: BaseEffect): void;
}

export interface BaseEffectDef extends EffectCallbacks {
    triggerInterval?: number;
    index?: number;
    persistent?: boolean;
}

export abstract class BaseEffect {
    id: string = "";
    owner: BattleCharacter;
    index: number = -1;
    persistent: boolean = false;
    private _enabled: boolean = false;
    timer = 0;
    triggerInterval = Infinity;
    stack: number | null = null // 會顯示在前端的通用暫時變數
    temp1 = 0;

    beforeStart?: EffectCallbacks["beforeStart"];
    onStart?: EffectCallbacks["onStart"];
    onTrigger?: EffectCallbacks["onTrigger"];
    onAttack?: EffectCallbacks["onAttack"];
    beforeDamageTaken?: EffectCallbacks["beforeDamageTaken"];
    afterDamageTaken?: EffectCallbacks["afterDamageTaken"];
    afterStatusChange?: EffectCallbacks["afterStatusChange"];
    // onAnyEffectToggle?: EffectCallbacks["onAnyEffectToggle"];

    constructor(owner: BattleCharacter, id: string, deflist: Record<string, BaseEffectDef>) {
        this.owner = owner;
        this.id = id;
        Object.assign(this, deflist[id]);
    }

    get enabled() { return this._enabled; }
    set enabled(value) {
        this._enabled = value;
        this.owner.onEffectToggle(this);
    }

    protected toggue() {
        this.owner.onEffectToggle(this);
    }

    update(deltaTime: number): void {
        this.timer += deltaTime;
        if (this.timer >= this.triggerInterval) {
            this.timer -= this.triggerInterval;
            this.onTrigger?.();
        }
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
                    this.owner.logger.recordEffectToggleEvent(this)
                    console.log(`[${name}] ${key}`, args);
                }
                return successful;
            } as any;
        }
    }
    return result;
}