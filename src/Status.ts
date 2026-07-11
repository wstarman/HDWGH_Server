import type { Character } from "./Character.js";

export interface StatusEffectResult {
    receiver: "statusHolder" | "target";
    damage: number;
    damageType: string;
    sourceName: string;
}

type StatusFn = (status: Status, statusHolder: Character, target: Character) => StatusEffectResult | null;

export class Status{
    StatusId: string = "";
    StatusStack: number = 1;
    StatusCooldown: number = 100;
    CurrentCooldown: number = 0;
    StatusFunction: (status: Status, statusHolder: Character, target: Character) => StatusEffectResult | null;

    constructor(id: string = "", stack: number = 1){
        this.StatusId = id;
        this.StatusStack = stack;
        this.StatusCooldown = Math.ceil(StatusFns[id]?.cooldown ?? 100);
        this.StatusFunction = StatusFns[id]?.effect ?? (() => null);
    }

    decreaseStack(loss: number){
        this.StatusStack = Math.max(0, this.StatusStack - loss);
    }

    clone(): Status {
        return new Status(this.StatusId, this.StatusStack);
    }

    process(statusHolder: Character, target: Character): StatusEffectResult | null {
        this.CurrentCooldown++;
        if (this.CurrentCooldown == this.StatusCooldown){
            this.CurrentCooldown = 0;

            if (this.StatusFunction === null){
                return null;
            }

			const statusEffect = this.StatusFunction(this, statusHolder, target);
            return statusEffect;
		}

        return null;
    }

    
}

interface StatusDefinition {
    cooldown: number;
    effect: StatusFn;
}

const StatusFns: Record<string, StatusDefinition> = {
    "burning": {
        cooldown: 100,
        effect: (status, statusHolder, target) =>{
            const basedamage = 10;
            let damage = basedamage * status.StatusStack
            statusHolder.TakeDamage(damage);

            status.decreaseStack(1);

            return {
                receiver: "statusHolder",
                damage,
                damageType: "fire",
                sourceName: "burning",
            };
        }
    },
    "poisoning": {
        cooldown: 200,
        effect: (status, statusHolder, target) =>{
            const basedamage = 10;
            let damage = basedamage * status.StatusStack
            statusHolder.TakeDamage(damage);

            return {
                receiver: "statusHolder",
                damage,
                damageType: "fire",
                sourceName: "poisoning",
            };
        }
    },
};
