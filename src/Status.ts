import { DamageType } from "./enum/DamageType.js";
import { DamageSystem, type DamageEvent } from "./Damage.js";

import type { Character } from "./Character.js";


export interface StatusEffectResult {
    receiver: Character;
    damage: number;
    damageType: string;
    sourceName: string;
}

export interface StatusContext {
    holder: Character,
    target?: Character
}

interface StatusDef {
    tickInterval?: number;
    onTick?: (status: Status, ctx: StatusContext) => DamageEvent;
    natureDecrease: (status: Status) => void;
    //onAttack?: (status: Status, ctx: StatusContext) => void;
    //onDamageTaken?: (status: Status, ctx: StatusContext) => void;
    //onDeath?: (status: Status, ctx: StatusContext) => void;
}

export interface StatusChangeEvent{
    holder: Character,
    status: Status,
    originalStack: number,
    newStack: number
}

export interface StatusAddEvent{
    holder: Character,
    status: Status,
    stack: number
}

//type StatusFn = (status: Status, statusHolder: Character, target: Character) => StatusEffectResult | null;

export class Status{
    Id: string = "";
    private _Stack: number = 1;
    get Stack(): number {return this._Stack;}
    set Stack(value: number) {
        if(value != this._Stack){
            let original = this._Stack;
            this._Stack = value;
            this.holder.onStatusChange({holder: this.holder, status:this, originalStack: original, newStack: value})
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

    processOnTick(ctx: StatusContext): DamageEvent | null{
        if(!this.StatusDefinition.onTick){
            return null;
        }

        if(!this.StatusDefinition.tickInterval){
            throw new Error(`Status ${this.Id} has no tick interval`)
        }

        this.Timer++;

        if(this.Timer < this.StatusDefinition.tickInterval){
            return null;
        }

        this.Timer = 0;

        const event = this.StatusDefinition.onTick(this, ctx);

        return event;
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
            status.StatusDefinition.natureDecrease(status);

            const event: DamageEvent = {
                attacker: ctx.holder,
                receiver: ctx.holder,
                amount: damage,
                type: DamageType.Fire,
                sourceType: "status",
                sourceObjectType: "status",
                sourceId: "burning"
            }

            return event;
        },
        natureDecrease(status) {
            status.Stack = Math.max(0,status.Stack-1);
        }
    },
    "poisoning": {
        tickInterval: 2000,
        onTick: (status, ctx) =>{
            const damage = 10 * status.Stack
            status.StatusDefinition.natureDecrease(status);
            
            const event: DamageEvent = {
                attacker: ctx.holder,
                receiver: ctx.holder,
                amount: damage,
                type: DamageType.Poison,
                sourceType: "status",
                sourceObjectType: "status",
                sourceId: "poisoning"
            }

            return event;
        },
        natureDecrease(status) {
            status.Stack = Math.max(0,status.Stack-1);
        }
    }
};
