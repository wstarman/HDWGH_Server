import { DamageType } from "../enum/DamageType.js";
import type { BattleCharacter } from "./BattleCharacter.js";
import type { StatIdType } from "./BattleCharacterData.js";
import { type AttackEvent, type DamageEvent, type StatusChangeEvent } from "./Event.js";
import { StatusName } from "./Status.js";

interface EffectCallbacks {
    // 每一個tick，用於驅動臨時計時器或檢測狀態
    everyTick?(this: BaseEffect, deltaTime: number): void;
    // 在onStart之前，通常用於給自己上狀態或加基礎數值
    beforeStart?(this: BaseEffect): void;
    // 戰鬥開始瞬間，用於開場就會攻擊或干擾對面的裝備等
    onStart?(this: BaseEffect): void;
    // 計時器達到 triggerInterval 時，也用於武器攻擊
    onTrigger?(this: BaseEffect): void;
    // 自身的攻擊開始前，用於改變命中率等
    beforeAttack?(this: BaseEffect, event: AttackEvent): void;
    // 攻擊命中時，用於給攻擊附加效果和改變傷害。
    onAttackHit?(this: BaseEffect, event: AttackEvent): void;
    // 攻擊未命中時
    onAttackMiss?(this: BaseEffect): void;
    // 對方攻擊未命中時，會接在對方的onAttackMisses之後
    onDodge?(this: BaseEffect): void;
    // 自身受到的傷害計算前，被攻擊時會在對手的onAttackHit之後，可在此改變受到的傷害
    beforeDamageTaken?(this: BaseEffect, event: DamageEvent): void;
    // 受到傷害後
    afterDamageTaken?(this: BaseEffect, event: DamageEvent): void;
    // 異常狀態層數改變後，包含新增或移除
    afterStatusChange?(this: BaseEffect, event: StatusChangeEvent): void;
    // 任何效果觸發時，通常會在該效果處理之前，且僅包含主動觸發效果
    onAnyEffectToggle?(this: BaseEffect, effect: BaseEffect): void;
    // 己方狀態改變時
    onStatChange?(this: BaseEffect, stat: StatIdType, value: number): void;
}

export interface BaseEffectDef extends EffectCallbacks {
    triggerInterval?: number;
    index?: number;
    persistent?: boolean;
    tags?: Array<string>;
    isUnique?: boolean;
}

export abstract class BaseEffect {
    id: string = "";
    owner: BattleCharacter;
    index: number = -1;
    persistent: boolean = false;
    private _enabled: boolean = false;
    enabled2: boolean = false;
    mainTimer = 0;
    triggerInterval = Infinity;
    _stack: number = -1; // 會顯示在前端的通用暫時變數，為負數時不顯示
    tags: string[] = [];

    isUniqui: boolean = false;
    damage: number = 0;
    staminaCost: number = 0;
    damageType: DamageType = DamageType.Physical;
    hitRate: number = 1.0;
    speed: number = 1.0;
    subTimers: TimerManager = new TimerManager();
    temp1 = 0;
    temp2 = 0;

    everyTick?: EffectCallbacks["everyTick"];
    beforeStart?: EffectCallbacks["beforeStart"];
    onStart?: EffectCallbacks["onStart"];
    onTrigger?: EffectCallbacks["onTrigger"];
    beforeAttack?: EffectCallbacks["beforeAttack"];
    onAttackHit?: EffectCallbacks["onAttackHit"];
    onAttackMiss?: EffectCallbacks["onAttackMiss"];
    onDodge?: EffectCallbacks["onDodge"];
    beforeDamageTaken?: EffectCallbacks["beforeDamageTaken"];
    afterDamageTaken?: EffectCallbacks["afterDamageTaken"];
    afterStatusChange?: EffectCallbacks["afterStatusChange"];
    onAnyEffectToggle?: EffectCallbacks["onAnyEffectToggle"];
    onStatChange?: EffectCallbacks["onStatChange"];

    constructor(owner: BattleCharacter, id: string, deflist: Record<string, BaseEffectDef>) {
        this.owner = owner;
        this.id = id;
        Object.assign(this, deflist[id]);
    }

    get enabled() { return this._enabled; }
    set enabled(value) {
        this._enabled = value;
        this.owner.onEffectToggle(this);
    }
    get stack() { return this._stack; }
    set stack(value) {
        this._stack = value;
        this.owner.logger.recordEffectStackChangeEvent(this);
    }

    protected toggle(enabled?: boolean) {
        if (enabled === true) {
            this.enabled = enabled;
        } else {
            enabled = true;
        }
        this.owner.onEffectToggle(this, enabled);
    }

    update(deltaTime: number): void {
        deltaTime *= this.speed;
        if (!this.owner.hasStatus(StatusName.stun)) {
            this.mainTimer += deltaTime;
            if (this.mainTimer >= this.triggerInterval) {
                this.mainTimer -= this.triggerInterval;
                this.onTrigger?.();
            }
        }
        this.subTimers.update(deltaTime);
        this.everyTick?.(deltaTime);
    }

    hasTag(tag: string): boolean {
        return this.tags.includes(tag);
    }

    attack(damage: number = this.damage, hitRate: number = this.hitRate, staminaCost: number = this.staminaCost): boolean {
        if (this.owner.stamina >= staminaCost) {
            this.toggle();
            this.owner.stamina -= staminaCost;
            this.owner.attack(this, damage, hitRate);
            return true;
        }
        return false;
    }

    addTimer(duration: number, callBack: () => void) {
        this.subTimers.add(duration, callBack);
    }
}

class Timer {
    time = 0;
    constructor(
        public duration: number,
        public callback: () => void
    ) { }
}
class TimerManager {
    private timers: Timer[] = [];
    add(duration: number, callback: () => void): Timer {
        const timer = new Timer(duration, callback);
        this.timers.push(timer);
        return timer;
    }
    remove(timer: Timer): void {
        const index = this.timers.indexOf(timer);
        if (index !== -1) {
            this.timers.splice(index, 1);
        }
    }
    clear(): void {
        this.timers.length = 0;
    }
    update(deltaTime: number): void {
        for (let i = this.timers.length - 1; i >= 0; i--) {
            const timer = this.timers[i];
            if (!timer) continue;
            timer.time += deltaTime;
            if (timer.time >= timer.duration) {
                this.timers.splice(i, 1);
                timer.callback();
            }
        }
    }
}

function wrapCallbacks<T extends object>(obj: T, name: string): T {
    const result = {} as T;
    for (const key in obj) {
        const value = obj[key];

        if (typeof value === "function") {
            result[key] = function (this: BaseEffect, ...args: any[]) {
                const successful = value.apply(this, args);
                if (successful) {
                    this.owner.logger.recordEffectToggleEvent(this)
                    console.log(`[${name}] ${key}`, args);
                }
                return successful;
            } as any;
        }
    }
    return result;
}