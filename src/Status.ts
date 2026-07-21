import { DamageType } from "./enum/DamageType.js";

import type { Character } from "./Character.js";
import { Events, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { EventType } from "./enum/EventType.js";


export interface StatusContext {
    holder: Character,
    target?: Character
}

interface StatusDef {
    tickInterval?: number;
    onTick?: (status: Status, ctx: StatusContext) => void;
    natureDecrease: (status: Status, ctx: StatusContext) => StatusChangeEvent | void;
    //onAttack?: (status: Status, ctx: StatusContext) => void;
    //onDamageTaken?: (status: Status, ctx: StatusContext) => void;
    //onDeath?: (status: Status, ctx: StatusContext) => void;
}


export interface StatusAddEvent{
    holder: Character,
    status: Status,
    stack: number
}

export class Status{
    Id: string = "";
    private _Stack: number = 1;
    get Stack(): number {return this._Stack;}
    set Stack(value: number) {
        if(value != this._Stack){
            let original = this._Stack;
            this._Stack = value;
            //this.holder.onStatusChange({eventType: EventType.StatusChangeEvent, holder: this.holder, status:this, originalStack: original, newStack: value})
        }
    }

    Timer: number = 0;
    holder: Character;
    
    StatusDefinition: StatusDef;

    constructor(id: string, holder: Character, stack: number = 1){
        this.Id = id;
        this.Stack = stack;
        this.holder = holder

        const def = StatusDefs[id];

        if(!def){
            throw new Error(`Unknown status: ${id}`);
        }

        this.StatusDefinition = def;
    }

    processOnTick(ctx: StatusContext): void{
        if(!this.StatusDefinition.onTick){
            return;
        }

        if(!this.StatusDefinition.tickInterval){
            throw new Error(`Status ${this.Id} has no tick interval`)
        }

        if(this.Stack == 0){
            return;
        }

        this.Timer++;

        if(this.Timer < this.StatusDefinition.tickInterval){
            return;
        }

        this.Timer = 0;

        this.StatusDefinition.onTick(this, ctx);
    }

    clone(): Status {
        return new Status(this.Id, this.holder, this.Stack);
    }
}

const StatusDefs: Record<string, StatusDef> = {
    "burning": {
        tickInterval: 1000,
        onTick: (status, ctx) => {
            const damage = 10 * status.Stack
            
            const stackChange = status.StatusDefinition.natureDecrease(status, ctx)

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
            const before = status.Stack;
            status.Stack = Math.max(0,status.Stack-1);

            if (status.Stack != before) {
                return {
                    eventType: EventType.StatusChangeEvent,
                    holder: ctx.holder,
                    status: status,
                    originalStack: before,
                    newStack: status.Stack
                }
            }
        }
    },
    "poisoning": {
        tickInterval: 2000,
        onTick: (status, ctx) =>{
            const damage = 10 * status.Stack

            const stackChange = status.StatusDefinition.natureDecrease(status, ctx)
            
            const damageEvent = Events.damage({
                attacker: ctx.holder,
                receiver: ctx.holder,
                amount: damage,
                type: DamageType.Poison,
                damageSource: status
            })

            damageEvent.receiver.onDamageTaken(damageEvent);
        },
        natureDecrease: (status, ctx) => {
            const before = status.Stack;
            status.Stack = Math.max(0,status.Stack-1);

            if (status.Stack != before) {
                return {
                    eventType: EventType.StatusChangeEvent,
                    holder: ctx.holder,
                    status: status,
                    originalStack: before,
                    newStack: status.Stack
                }
            }
        }
    }
};
