import type { Character } from "./Character.js";

export interface StatusEffectResult {
    receiver: "statusHolder" | "target";
    damage: number;
    damageType: string;
    sourceName: string;
}

type StatusFn = (statusHolder: Character, target: Character) => StatusEffectResult | null;

export class Status{
    StatusId: string = ""
    StatusCooldown: number = 100
    CurrentCooldown: number = 0
    StatusFunction: (statusHolder: Character, target: Character) => StatusEffectResult | null;

    constructor(id: string = "", cd: number = 100){
        this.StatusId = id;
        this.StatusCooldown = Math.ceil(cd);
        this.StatusFunction = StatusFns[id] ?? (() => null);
    }
    
    clone(): Status {
        return new Status(this.StatusId, this.StatusCooldown);
    }

    
}


const StatusFns: Record<string, StatusFn> = {
    "burning": (statusHolder, target) =>{
        const damage = 10;
        statusHolder.TakeDamage(damage);

        return {
            receiver: "statusHolder",
            damage,
            damageType: "fire",
            sourceName: "burning",
        };
    }
};
