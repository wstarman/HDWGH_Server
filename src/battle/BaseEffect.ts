import { DamageType } from "../enum/DamageType.js";
import type { Character } from "./Character.js";
import { Status, type EffectContext, type StatusAddEvent } from "./Status.js";
import { Events, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { StatusChangeReason } from "../enum/StatusChange.js";

export abstract class BaseEffect {
    id: string = "";
    timer = 0
    interval = Infinity
    owner: Character;
    onStart?: EffectCallbacks["onStart"];
    onAttack?: EffectCallbacks["onAttack"];
    onDamageTaken?: EffectCallbacks["onDamageTaken"];
    onDeath?: EffectCallbacks["onDeath"];
    onStatusChange?: EffectCallbacks["onStatusChange"];
    onStatusAdd?: EffectCallbacks["onStatusAdd"];
    onEffectTrigger?: EffectCallbacks["onEffectTrigger"];

    constructor(owner: Character, id: string, deflist: Record<string, BaseEffectDef>) {
        this.owner = owner
        this.id = id
        console.log(id, deflist)
        Object.assign(this, deflist[id]);
    }

    protected shouldTick(interval?: number): boolean {
        if (!interval) return false;
        this.timer++;
        if (this.timer < interval) return false;
        this.timer = 0;
        return true;
    }
}

export interface BaseEffectDef extends EffectCallbacks {
    interval?: number;
}



interface EffectCallbacks {
    onStart?(this: BaseEffect): void;
    onAttack?(this: BaseEffect, event: DamageEvent): void;
    onDamageTaken?(this: BaseEffect, event: DamageEvent): void;
    onDeath?(this: BaseEffect, event: DamageEvent): void;
    onStatusChange?(this: BaseEffect, event: StatusChangeEvent): void;
    onStatusAdd?(this: BaseEffect, event: StatusAddEvent): void;
    onEffectTrigger?(this: BaseEffect, ctx: EffectContext): void;
}

