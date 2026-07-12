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
    //onAttack?: (status: Status, ctx: StatusContext) => void;
    //onDamageTaken?: (status: Status, ctx: StatusContext) => void;
    //onDeath?: (status: Status, ctx: StatusContext) => void;
}

//type StatusFn = (status: Status, statusHolder: Character, target: Character) => StatusEffectResult | null;

export class Status{
    Id: string = "";
    Stack: number = 1;

    Timer: number = 0;
    
    StatusDefinition: StatusDef;

    constructor(id: string, stack: number = 1){
        this.Id = id;
        this.Stack = stack;

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

    decreaseStack(loss: number){
        this.Stack = Math.max(0, this.Stack - loss);
    }

    clone(): Status {
        return new Status(this.Id, this.Stack);
    }
}

const StatusDefs: Record<string, StatusDef> = {
    "burning": {
        tickInterval: 1000,
        onTick: (status, ctx) =>{
            const damage = 10 * status.Stack
            status.decreaseStack(1);

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
        }
    },
    "poisoning": {
        tickInterval: 2000,
        onTick: (status, ctx) =>{
            const damage = 10 * status.Stack

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
        }
    }
};
