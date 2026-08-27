import { Status, StatusName } from "./Status.js";
import { characterPassive, Passive } from "./Passive.js";
import { type AttackEvent, type DamageEvent, type StatusChangeEvent, type DamageSource, type DamageModifier } from "./Event.js";
import { DamageType } from "../enum/DamageType.js";
import type { BattleManager } from "./BattleManager.js";
import type { BaseEffect } from "./BaseEffect.js";
import { BattleCharacterData } from "./BattleCharacterData.js";
import { Weapon, weaponDefs } from "./Weapon.js";
import { Curse } from "./Curse.js";
import { Equipment, equipmentDefs } from "./Equipment.js";

export class BattleCharacter extends BattleCharacterData {
    _buffTimer: BuffTimerManager = new BuffTimerManager();
    constructor(manager: BattleManager, index: number, cid: string, curseses: string[] = [], equipments: string[] = []) {
        super(manager);
        this.battleManager = manager;
        this.index = index;
        this.id = cid;
        characterPassive[cid]?.forEach(id => {
            this.allEffects.push(new Passive(this, id));
        })
        curseses.forEach(id => {
            this.allEffects.push(new Curse(this, id));
        });
        let uniquiItemSet: Set<string> = new Set<string>();
        let i = 0;
        equipments.forEach(id => {
            if (id in weaponDefs) {
                this.allEffects.push(new Weapon(this, id, i));
            } else {
                if (!(equipmentDefs[id]?.isUnique && uniquiItemSet.has(id))) {
                    uniquiItemSet.add(id)
                    this.allEffects.push(new Equipment(this, id, i));
                }
            }
            i += 1;
        });
    }
    get alive() { return this.hp > 0 || this.undead; }

    beforeStart() {
        this.allEffects.forEach(effect => { effect.beforeStart?.() });
    }
    onStart() {
        this.allEffects.forEach(effect => { effect.onStart?.() });
    }
    update(): void {
        const deltaTime = this.totalSpeed * this.battleManager.tickTime;
        this._stamina += Math.min(this.maxStamina - this.stamina, this.staminaRecover * deltaTime); // 避免log
        this._buffTimer.update(deltaTime);
        this.statuses.forEach(status => {
            if (this.alive) {
                status.update(deltaTime);
            }
        });
        this.allEffects.forEach(effect => {
            if (this.alive) {
                if (effect instanceof Weapon) {
                    effect.update(deltaTime * this.attackSpeed);
                } else {
                    effect.update(deltaTime * this.nonAttackSpeed);
                }
            }
        });
        if (!this.alive && !this.beforeDeadTriggered) {
            this.allEffects.forEach(effect => {
                effect.beforeDead?.()
            });
            this.beforeDeadTriggered = true;
        }
    }
    // return true if hit
    attack(weapon: BaseEffect, damage: number, staminaCost: number, baseHitRate = 1.0, baseCritRate = 0.0, damageType = weapon.damageType, isTrueDamage = false, toSelf = false) {
        const receiver = toSelf ? this : this.opponent;
        const event: AttackEvent = {
            modifier: {
                flat: 0,
                multiplier: 1.0,
                finalFlat: 0
            },
            hitRate: this.hitRate * baseHitRate * (1 - receiver.evasion),
            critRate: baseCritRate + this.critRate,
            critDamage: this.critDamage,
            attacker: this,
            receiver,
            amount: damage,
            type: damageType,
            damageSource: weapon,
            isCritHit: false,
            isTrueDamage,
            staminaCost,
            hit: true,
        }
        this.allEffects.forEach(effect => effect.beforeAttack?.(event));
        if (weapon.id == "cw6") {
            event.hitRate = 0.95;
        }
        let hit = Math.random() < event.hitRate;
        event.hit = hit;
        if (!hit) {
            /**名字：做記號的牌
             * 效果：每次攻擊累積層數，不小於4層後，可以在未命中時消耗4層強制變為命中。觸發後有50%機率使自身在5秒內降低50%爆擊傷害。
             */
            if (this.getEffect("marked_cards")) {
                for (const marked_cards of this.getEffects("marked_cards")) {
                    if (marked_cards.stack >= 4) {
                        marked_cards.stack -= 4;
                        hit = true;
                        if (Math.random() < 0.5) {
                            this.critDamage -= 0.5;
                            marked_cards.addTimer(5, () => {
                                this.critDamage += 0.5;
                            })
                        }
                        break;
                    }
                }
            }
        }
        if (hit) {
            this.allEffects.forEach(effect => effect.onAttackHit?.(event));
            if (Math.random() < event.critRate) {
                event.isCritHit = true;
                if (event.isCritHit) {
                }
                this.allEffects.forEach(effect => effect.onAttackCrit?.(event));
            } else {
                this.allEffects.forEach(effect => effect.onAttackNotCrit?.(event));
            }
            event.amount *= event.critRate;
            receiver.calculateDamage(this, event.amount, damageType, weapon, event.isCritHit, event.isTrueDamage, event.modifier);
            if (event.isCritHit) {
                this.allEffects.forEach(effect => effect.afterAttakCrit?.(event));
            } else {
                this.allEffects.forEach(effect => effect.afterAttakNotCrit?.(event));
            }
            this.allEffects.forEach(effect => effect.afterAttackHit?.(event));
            return event
        } else {
            // miss
            const missEvent: DamageEvent = {
                modifier: {
                    flat: 0,
                    multiplier: 1.0,
                    finalFlat: 0
                },
                attacker: this,
                receiver,
                amount: 0,
                type: damageType,
                damageSource: weapon,
                isCritHit: false
            }
            this.logger.recordDamageEvent(missEvent, "miss");
            this.allEffects.forEach(effect => effect.onAttackMiss?.(event));
            receiver.allEffects.forEach(effect => effect.onDodge?.())
            return event
        }
    }
    calculateDamage(attacker: BattleCharacter, amount: number, type: DamageType, damageSource: DamageSource,
        isCritHit: boolean = false, isTrueDamage: boolean = false, modifier: DamageModifier = {
            flat: 0,
            multiplier: 1.0,
            finalFlat: 0
        }) {
        const event: DamageEvent = {
            modifier,
            attacker: attacker,
            receiver: this,
            amount,
            type,
            damageSource,
            isCritHit
        }
        const originalDamage = event.amount;
        this.allEffects.forEach(p => p.beforeDamageTaken?.(event));
        this.applyDamageTakenMultiplier(event);
        const final = isTrueDamage ? originalDamage : (event.amount * this.attackPower + event.modifier.flat) * event.modifier.multiplier + event.modifier.finalFlat;
        event.amount = final
        this.logger.recordDamageEvent(event, final);
        this.takeDamage(final);
        this.opponent.heal(final * this.opponent.lifeSteal);
        this.allEffects.forEach(p => p.afterDamageTaken?.(event));
    }
    private applyDamageTakenMultiplier(damage: DamageEvent) {
        let multiplier = this.allDamageTakenMultiplier;
        if (damage.damageSource instanceof Weapon) {
            multiplier *= this.weaponDamageTakenMultiplier;
        }
        switch (damage.type) {
            case DamageType.Toxic:
                multiplier *= this.toxicDamageTakenMultiplier;
                break;
            case DamageType.Physical:
                multiplier *= this.physicalDamageTakenMultiplier;
                break;
        }
        damage.modifier.multiplier *= multiplier;
    }
    takeDamage(damage: number): void {
        damage = Math.max(damage, 0);
        const remaining = Math.max(damage - this.shield, 0);
        this.shield -= Math.min(damage, this.shield)
        this.hp -= remaining;
    }

    heal(value: number) {
        this.hp += Math.min(this.maxHp - this.hp, value) * Math.max(this.healRate, 0);
    }

    hasStatus(id: string): boolean {
        return !!this.statuses.find(s => s.id === id);
    }
    getStatus(id: string): Status | undefined {
        return this.statuses.find(s => s.id === id);
    }
    addStatus(id: string, delta: number) {
        for (let status of this.statuses) {
            if (status.id == id) {
                if (status.id == StatusName.poison && delta > 0) {
                    const straps = this.getEffects("detox_strap");
                    for (const strap of straps) {
                        const prevented = Math.min(delta, strap.stack);
                        delta -= prevented;
                        strap.stack -= prevented;
                        if (delta <= 0) break;
                    }
                }
                status.stack = Math.max(0, status.stack + delta);
                if (status.stack == 0) {
                    this.statuses.slice(this.statuses.indexOf(status), 1);
                }
                return;
            }
        }
        if (delta > 0) {
            this.statuses.push(new Status(id, this, delta));
        }
    }
    clearStatus(id: string) {
        for (let i = 0; i < this.statuses.length; i++) {
            if (this.statuses[i]!.id == id) {
                this.statuses[i]!.stack = 0;
                this.statuses[i]!.onCleared?.();
                this.statuses.splice(i, 1);
                return;
            }
        }
    }
    afterStatusChange(event: StatusChangeEvent) {
        const beforeStack = event.status.stack - event.delta;
        const afterStack = event.status.stack
        this.logger.recordStatusChangeEvent(event, beforeStack, afterStack);
        this.allEffects.forEach(p => p.afterStatusChange?.(event));
    }

    getEffect(id: string) {
        return this.allEffects.find(effect => effect.id == id);
    }

    getEffects(id: string) {
        return this.allEffects.filter(effect => effect.id == id);
    }

    getEffectNumber(id: string) {
        let result = 0;
        this.allEffects.forEach(effect => { if (effect.id == id) result++; });
        return result
    }

    onEffectToggle(effect: BaseEffect, enabled: boolean = true) {
        this.logger.recordEffectToggleEvent(effect)
        if (enabled) {
            this.allEffects.forEach(p => p.onAnyEffectToggle?.(effect));
        }
    }
    onStatusToggle(status: Status) { }

    // 用於不可疊加但可刷新的效果
    addBuff(id: string, durationSec: number, callback: () => void) {
        return this._buffTimer.add(id, durationSec, callback);
    }
    hasBuff(id: string) {
        return this._buffTimer.has(id);
    }
}

class BuffTimer {
    time = 0;
    constructor(
        public id: string,
        public duration: number,
        public callback: () => void
    ) { }
}
class BuffTimerManager {
    private timers: BuffTimer[] = [];
    add(id: string, durationSec: number, callback: () => void): BuffTimer {
        const existingTimer = this.timers.find(timer => timer.id === id)
        if (existingTimer) {
            existingTimer.time = 0;
            existingTimer.duration = durationSec;
            existingTimer.callback = callback;
            return existingTimer;
        } else {
            const timer = new BuffTimer(id, durationSec, callback);
            this.timers.push(timer);
            return timer;
        }
    }
    has(id: string) {
        return this.timers.findIndex(timer => timer.id === id) != -1;
    }
    remove(timer: BuffTimer): void {
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