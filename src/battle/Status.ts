import { DamageType } from "../enum/DamageType.js";
import type { BattleCharacter } from "./BattleCharacter.js";
import { Events, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { EventType } from "../enum/EventType.js";

interface StatusCallbacks {
    onTick?(this: Status): void;
    natureDecrease(this: Status): void;
}

interface StatusDef extends StatusCallbacks {
    tickInterval?: number;
}

export class Status {
    id: string = "";
    timer: number = 0
    tickInterval = Infinity
    holder: BattleCharacter;

    private _stack: number = 1;
    get stack(): number { return this._stack; }
    set stack(value: number) {
        if (value != this._stack) {
            const delta = this._stack - value;
            this._stack = value;
            this.holder.onStatusChange({ holder: this.holder, status: this, delta })
        }
    }

    onTick?: StatusCallbacks["onTick"]
    natureDecrease?: StatusCallbacks["natureDecrease"]

    constructor(id: string, holder: BattleCharacter, stack: number = 1) {
        this.id = id;
        this.stack = stack;
        this.holder = holder
        const def = StatusDefs[id];
        if (!def) {
            throw new Error(`Unknown status: ${id}`);
        }
        Object.assign(this, def);
    }

    protected shouldTick(interval?: number): boolean {
        if (!interval) return false;
        this.timer++;
        if (this.timer < interval) return false;
        this.timer = 0;
        return true;
    }

    update(deltaTime: number): void {
        if (this.stack == 0) return;
        if (!this.shouldTick(this.tickInterval)) return;
        this.onTick?.();
        this.natureDecrease?.();
    }

}

const StatusDefs: Record<string, StatusDef> = {
    "burning": {
        tickInterval: 1000,
        onTick() {
            const damage = 10 * this.stack

            const damageEvent = Events.damage({
                attacker: this.holder,
                receiver: this.holder,
                amount: damage,
                type: DamageType.Fire,
                damageSource: this
            })

            damageEvent.receiver.onDamageTaken(damageEvent);
        },
        natureDecrease() {
            const statusChangeEvent = Events.statusChange({
                holder: this.holder,
                status: this,
                delta: -1,
            })
            this.holder.onStatusChange(statusChangeEvent);
        }
    },
    "poisoning": {
        tickInterval: 2000,
        onTick() {
            const damage = 10 * this.stack

            const damageEvent = Events.damage({
                attacker: this.holder,
                receiver: this.holder,
                amount: damage,
                type: DamageType.Poison,
                damageSource: this
            })

            damageEvent.receiver.onDamageTaken(damageEvent);
        },
        natureDecrease() { }
    }
};
