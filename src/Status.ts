import type { Character } from "./Character.js";

type StatusFn = (caster: Character, target: Character) => void;

export class Status{
    StatusId: string = ""
    StatusCooldown: number = 100
    CurrentCooldown: number = 0
    StatusFunction: (caster: Character, target: Character) => void;

    constructor(id: string = "", cd: number = 100){
        this.StatusId = id;
        this.StatusCooldown = Math.ceil(cd);
        this.StatusFunction = StatusFns[id] ?? (() => {});
    }
    
    clone(): Status {
        return new Status(this.StatusId, this.StatusCooldown);
    }

    
}


const StatusFns: Record<string, StatusFn> = {
    "burning": (caster, target) =>{
        caster.TakeDamage(10);
    }
};