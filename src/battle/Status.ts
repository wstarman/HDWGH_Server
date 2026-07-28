import { DamageType } from "../enum/DamageType.js";

import type { BattleCharacter } from "./BattleCharacter.js";
import { Events, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { EventType } from "../enum/EventType.js";
import { StatusChangeReason } from "../enum/StatusChange.js";
import { BaseEffect } from "./BaseEffect.js";

export interface EffectContext {
    holder: BattleCharacter,
    target?: BattleCharacter
}

interface StatusDef {
    tickInterval?: number;
    onTick?: (status: Status, ctx: EffectContext) => void;
    natureDecrease: (status: Status, ctx: EffectContext) => void;
    //onAttack?: (status: Status, ctx: StatusContext) => void;
    //onDamageTaken?: (status: Status, ctx: StatusContext) => void;
    //onDeath?: (status: Status, ctx: StatusContext) => void;
}

export interface StatusAddEvent {
    holder: BattleCharacter,
    status: Status,
    stack: number
}

export class Status {
    id: string = "";
    timer: number = 0
    private _stack: number = 1;
    get stack(): number { return this._stack; }
    set stack(value: number) {
        if (value != this._stack) {
            //let original = this._Stack;
            this._stack = value;
            //this.holder.onStatusChange({holder: this.holder, status:this, originalStack: original, newStack: value})
        }
    }

    holder: BattleCharacter;

    statusDefinition: StatusDef;

    constructor(id: string, holder: BattleCharacter, stack: number = 1) {
        this.id = id;
        this.stack = stack;
        this.holder = holder

        const def = StatusDefs[id];

        if (!def) {
            throw new Error(`Unknown status: ${id}`);
        }

        this.statusDefinition = def;
    }

    protected shouldTick(interval?: number): boolean {
        if (!interval) return false;
        this.timer++;
        if (this.timer < interval) return false;
        this.timer = 0;
        return true;
    }

    processOnTick(ctx: EffectContext): void {
        if (this.stack == 0) return;

        if (!this.shouldTick(this.statusDefinition.tickInterval)) return;

        this.statusDefinition.onTick?.(this, ctx);
        this.statusDefinition.natureDecrease(this, ctx);
    }

    clone(): Status {
        return new Status(this.id, this.holder, this.stack);
    }
}

const StatusDefs: Record<string, StatusDef> = {
    "burning": {
        tickInterval: 1000,
        onTick: (status, ctx) => {
            const damage = 10 * status.stack

            const damageEvent = Events.damage({
                attacker: ctx.holder,
                receiver: ctx.holder,
                amount: damage,
                type: DamageType.Fire,
                damageSource: status
            })

            damageEvent.receiver.onDamageTaken(damageEvent);
        },
        natureDecrease: (status, ctx) => {
            const statusChangeEvent = Events.statusChange({
                holder: ctx.holder,
                status: status,
                amount: -1,
            })

            ctx.holder.onStatusChange(statusChangeEvent);
        }
    },
    "poisoning": {
        tickInterval: 2000,
        onTick: (status, ctx) => {
            const damage = 10 * status.stack

            const damageEvent = Events.damage({
                attacker: ctx.holder,
                receiver: ctx.holder,
                amount: damage,
                type: DamageType.Poison,
                damageSource: status
            })

            damageEvent.receiver.onDamageTaken(damageEvent);
        },
        natureDecrease: (status, ctx) => { }
    }
};
