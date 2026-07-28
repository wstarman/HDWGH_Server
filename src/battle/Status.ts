import { DamageType } from "../enum/DamageType.js";
import type { BattleCharacter } from "./BattleCharacter.js";

export enum StatusName {
    burning = "burning",
    poisoning = "poisoning",
    dizzy = "dizzy"
}

interface StatusCallbacks {
    onTrigger?(this: Status): void;
    natureDecrease?(this: Status): void;
    onCleared?(this: Status): void
}

interface StatusDef extends StatusCallbacks {
    triggerInterval?: number;
    damageType?: DamageType;
}

export class Status {
    id: string = "";
    timer: number = 0;
    triggerInterval = Infinity;
    maxStack = Infinity;
    owner: BattleCharacter;
    damageType: DamageType = DamageType.Physical;

    private _stack: number = 1;
    get stack(): number { return this._stack; }
    set stack(value: number) {
        if (value < 0)
            value = 0;
        if (value != this._stack) {
            const delta = value - this._stack;
            this._stack = value;
            this.owner.afterStatusChange({ owner: this.owner, status: this, delta })
            if (this.stack == 0) {
                this.owner.clearStatus(this.id);
            }
        }
    }

    onTrigger?: StatusCallbacks["onTrigger"]
    natureDecrease?: StatusCallbacks["natureDecrease"]
    onCleared?: StatusCallbacks["onCleared"]

    constructor(id: string, owner: BattleCharacter, stack: number = 1) {
        this.id = id;
        this.stack = stack;
        this.owner = owner
        const def = StatusDefs[id];
        if (!(id in StatusName) || !def) {
            throw new Error(`Unknown status: ${id}`);
        }
        Object.assign(this, def);
    }

    update(deltaTime: number): void {
        if (this.stack == 0) return;
        this.timer += deltaTime;
        if (this.timer >= this.triggerInterval) {
            this.timer -= this.triggerInterval;
            this.onTrigger?.();
            this.natureDecrease?.();
        }
    }

    protected toggue() {
        this.owner.onStatusToggle(this);
    }

    dealDamageToSelf(damage: number) {
        this.owner.calculateDamage(this.owner, damage, this.damageType, this);
    }
}

const StatusDefs: Record<string, StatusDef> = {
    "burning": {
        triggerInterval: 1000,
        damageType: DamageType.Fire,
        onTrigger() {
            this.toggue();
            const damage = 1 * this.stack;
            this.dealDamageToSelf(damage);
        },
        natureDecrease() {
            this.stack -= 1;
        }
    },
    "poisoning": {
        triggerInterval: Infinity,
        damageType: DamageType.Poison,
        onTrigger() {
            const damage = 1 * this.stack
            this.dealDamageToSelf(damage);
        },
        natureDecrease() { }
    },
    "dizzy": {
        triggerInterval: 1000,
        natureDecrease() {
            this.stack -= 1;
        }
    }
};
