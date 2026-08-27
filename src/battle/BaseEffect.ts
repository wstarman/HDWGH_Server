import { DamageType } from "../enum/DamageType.js";
import type { BattleCharacter } from "./BattleCharacter.js";
import type { StatIdType } from "./BattleCharacterData.js";
import { type AttackEvent, type DamageEvent, type StaminaCostEvent, type StatusChangeEvent } from "./Event.js";
import { StatusName } from "./Status.js";

interface EffectCallbacks {
    // 系統事件
    // 每一個tick，用於驅動臨時計時器或檢測狀態
    everyTick?(this: BaseEffect, deltaTime: number): void;
    // 在onStart之前，通常用於給自己上狀態或加基礎數值
    beforeStart?(this: BaseEffect): void;
    // 戰鬥開始瞬間，用於開場就會攻擊或干擾對面的裝備等
    onStart?(this: BaseEffect): void;
    // 計時器達到 triggerInterval 時，也用於武器攻擊
    onTrigger?(this: BaseEffect): void;
    // 遺言
    beforeDead?(this: BaseEffect): void;
    // 被移除/無效時
    onInvalid?(this: BaseEffect): void;

    // 攻擊、傷害相關事件
    // 嘗試消耗耐力時，可改變耐力消耗
    beforeUseStamina?(this: BaseEffect, event: StaminaCostEvent): void;
    // 耐力不足時，若此時將耐力補充至充足，則可繼續發動攻擊
    onStaminaInsufficient?(this: BaseEffect): void;
    // 自身的攻擊開始前，用於改變命中率等
    beforeAttack?(this: BaseEffect, event: AttackEvent): void;
    // 攻擊命中時，用於給攻擊附加效果、改變傷害或爆擊率。
    onAttackHit?(this: BaseEffect, event: AttackEvent): void;
    // 攻擊命中且爆擊成功時，接在onAttackHit之後，用於改變爆擊傷害等。
    onAttackCrit?(this: BaseEffect, event: AttackEvent): void;
    // 攻擊命中且未爆擊時，接在onAttackHit之後，用於改變未爆擊時的傷害等。
    onAttackNotCrit?(this: BaseEffect, event: AttackEvent): void;
    // 攻擊未命中時
    onAttackMiss?(this: BaseEffect, event: AttackEvent): void;
    // 對方攻擊未命中時，會接在對方的onAttackMiss之後
    onDodge?(this: BaseEffect): void;
    // 自身受到的傷害計算前，接在對手的onAttack(Not)Crit之後，可在此改變受到的傷害
    beforeDamageTaken?(this: BaseEffect, event: DamageEvent): void;
    // 受到傷害後
    afterDamageTaken?(this: BaseEffect, event: DamageEvent): void;
    // 攻擊命中且爆擊後，接在對手受到傷害之後
    afterAttackCrit?(this: BaseEffect, event: AttackEvent): void;
    // 攻擊命中且未爆擊後，接在對手受到傷害之後
    afterAttackNotCrit?(this: BaseEffect, event: AttackEvent): void;
    // 攻擊命中對手後，接在afterAttak(Not)Crit之後，用於需要記錄自身造成傷害的裝備
    afterAttackHit?(this: BaseEffect, event: AttackEvent): void;

    // 狀態相關事件
    // 異常狀態層數改變後，包含新增或移除
    afterStatusChange?(this: BaseEffect, event: StatusChangeEvent): void;
    // 任何效果觸發時，通常會在該效果處理之前，且僅包含主動觸發效果
    onAnyEffectToggle?(this: BaseEffect, effect: BaseEffect): void;
    // 己方狀態(攻守數值等)改變時
    onStatChange?(this: BaseEffect, stat: StatIdType, value: number): void;
}

export interface BaseEffectDef extends EffectCallbacks {
    triggerInterval?: number;
    index?: number;
    persistent?: boolean;
    tags?: Array<string>;
    isUnique?: boolean;
    grade?: number;  // "low" = 0, "mid" = 1, "high" = 2
    hasNegativeStack?: boolean
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
    basicTriggerInterval = Infinity;
    _stack: number = -1; // 會顯示在前端的通用暫時變數，為負數時不顯示
    tags: string[] = [];
    grade: number = 0;  // "low" = 0, "mid" = 1, "high" = 2
    hasNegativeStack: boolean = false;

    isUnique: boolean = false;
    damage: number = 0;
    staminaCost: number = 0;
    damageType: DamageType = DamageType.Physical;
    hitRate: number = 1.0;
    speed: number = 1.0;
    subTimers: TimerManager = new TimerManager();
    temp1 = 0;
    temp2 = 0;
    triggerProhibited = false;
    invalid = false;

    everyTick?: EffectCallbacks["everyTick"];
    beforeStart?: EffectCallbacks["beforeStart"];
    onStart?: EffectCallbacks["onStart"];
    onTrigger?: EffectCallbacks["onTrigger"];
    beforeDead?: EffectCallbacks["beforeDead"];
    onInvalid?: EffectCallbacks["onInvalid"];
    onClearNegativeStack?: (this: BaseEffect, clearFlat: number, clearRate: number) => void;

    beforeUseStamina?: EffectCallbacks["beforeUseStamina"];
    onStaminaInsufficient?: EffectCallbacks["onStaminaInsufficient"];
    beforeAttack?: EffectCallbacks["beforeAttack"];
    onAttackHit?: EffectCallbacks["onAttackHit"];
    onAttackCrit: EffectCallbacks["onAttackCrit"];
    onAttackNotCrit: EffectCallbacks["onAttackNotCrit"];
    onAttackMiss?: EffectCallbacks["onAttackMiss"];
    onDodge?: EffectCallbacks["onDodge"];
    beforeDamageTaken?: EffectCallbacks["beforeDamageTaken"];
    afterDamageTaken?: EffectCallbacks["afterDamageTaken"];
    afterAttakCrit?: EffectCallbacks["afterAttackCrit"];
    afterAttakNotCrit?: EffectCallbacks["afterAttackNotCrit"];
    afterAttackHit?: EffectCallbacks["afterAttackHit"];
    afterStatusChange?: EffectCallbacks["afterStatusChange"];
    onAnyEffectToggle?: EffectCallbacks["onAnyEffectToggle"];
    onStatChange?: EffectCallbacks["onStatChange"];

    constructor(owner: BattleCharacter, id: string, deflist: Record<string, BaseEffectDef>) {
        this.owner = owner;
        this.id = id;
        Object.assign(this, deflist[id]);
        this.basicTriggerInterval = this.triggerInterval;
        if (this.hasNegativeStack) {
            this.onClearNegativeStack = this._clearNegativeStack;
        }
    }

    get enabled() { return this._enabled; }
    set enabled(value) {
        this._enabled = value;
        // this.owner.onEffectToggle(this);
    }
    get stack() { return this._stack; }
    set stack(value) {
        if (value != this.stack) {
            this._stack = value;
            this.owner.logger.recordEffectStackChangeEvent(this);
        }
    }

    toggle(enabled?: boolean) {
        this.owner.logger.recordEffectToggleEvent(this, true, enabled !== undefined, enabled ?? true);
        if (enabled !== undefined) {
            this.enabled = enabled;
        } else {
            this.owner.onEffectToggle(this);
        }
    }

    togglePassive(enabled?: boolean) {
        this.owner.logger.recordEffectToggleEvent(this, false, enabled !== undefined, enabled ?? true);
    }

    update(deltaTime: number): void {
        deltaTime *= this.speed;
        if (!this.owner.hasStatus(StatusName.stun) && !this.triggerProhibited) {
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

    /**相關裝備：砸鍋賣鐵(賭徒)
     * 效果：耐力不足時仍可發動攻擊，每缺少0.5點耐力便失去相當於5%最大生命的生命，並使該次攻擊增加等同於你失去生命值的基礎傷害。
     */
    attack(damage: number = this.damage, hitRate: number = this.hitRate, staminaCost: number = this.staminaCost, isTrueDamage: boolean = false): attackResult {
        const staminaCostEvent: StaminaCostEvent = {
            costFlat: 0.0,
            costMultiplier: 1.0
        }
        this.owner.allEffects.forEach(effect => effect.beforeUseStamina?.(staminaCostEvent));
        staminaCost = Math.max(0, staminaCost * this.owner.staminaCostMultiplier * staminaCostEvent.costMultiplier + this.owner.staminaCostFlat + staminaCostEvent.costFlat);
        let result: attackResult = {
            used: false,
            hit: false,
            event: null
        }
        if (this.owner.attackProhibited) return result;
        let staminaEnough = this.owner.stamina >= staminaCost;
        if (!staminaEnough) {
            if (this.owner.getEffect("pawn_it_all")) {
                const pias = this.owner.getEffects("pawn_it_all")
                pias.forEach(pia => pia.togglePassive());
                const effectNumber = pias.length;
                const lostHp = Math.ceil((staminaCost - this.owner.stamina) / 0.5) * (0.05 * this.owner.maxHp) * effectNumber;
                staminaCost -= Math.floor((staminaCost - this.owner.stamina) / 0.5) * 0.5
                this.owner.hp -= lostHp;
                damage += lostHp;
                staminaEnough = true;
            }
        }
        if (!staminaEnough) {
            for (const effect of this.owner.allEffects) {
                if (effect.onStaminaInsufficient) {
                    effect.onStaminaInsufficient();
                    staminaEnough = this.owner.stamina >= staminaCost;
                    if (staminaEnough) {
                        break;
                    }
                }
            }
        }
        if (staminaEnough) {
            this.toggle();
            this.owner.stamina -= staminaCost;
            result.used = true;
            result.event = this.owner.attack(this, damage, staminaCost, hitRate, 0, DamageType.Physical, isTrueDamage);
            result.hit = result.event.hit;
            return result;
        }
        return result;
    }

    addTimer(durationSec: number, callBack: () => void) {
        this.subTimers.add(durationSec, callBack);
    }

    _clearNegativeStack(clearFlat: number, clearRate: number) {
        this.stack = Math.max(0, this.stack * (1 - clearRate) - clearFlat);
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

interface attackResult {
    used: boolean,
    hit: boolean,
    event: AttackEvent | null
}
/*
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
*/