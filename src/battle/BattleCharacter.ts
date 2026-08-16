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
        this._stamina += Math.min(this.maxStamina - this.stamina, this.staminaRecover * this.battleManager.tickTime); // 避免log
        this.statuses.forEach(status => {
            if (this.alive) {
                status.update(this.totalSpeed * this.battleManager.tickTime);
            }
        });
        this.allEffects.forEach(effect => {
            if (this.alive) {
                if (effect instanceof Weapon) {
                    effect.update(this.totalSpeed * this.attackSpeed * this.battleManager.tickTime);
                } else {
                    effect.update(this.totalSpeed * this.nonAttackSpeed * this.battleManager.tickTime);
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
    attack(weapon: Weapon, damage: number = weapon.damage, baseHitRate = 1.0, damageType = weapon.damageType, isTrueDamage = false) {
        const event: AttackEvent = {
            modifier: {
                flat: 0,
                multiplier: 1.0,
                finalFlat: 0
            },
            hitRate: this.hitRate * baseHitRate * (1 - this.opponent.evasion),
            critRate: this.critRate,
            attacker: this,
            receiver: this.opponent,
            amount: damage,
            type: damageType,
            damageSource: weapon,
            isCritHit: false,
            isTrueDamage
        }
        this.allEffects.forEach(effect => effect.beforeAttack?.(event));
        if (Math.random() < event.hitRate) {
            // hit
            this.allEffects.forEach(effect => effect.onAttackHit?.(event));
            if (Math.random() < event.critRate) {
                event.amount *= 2;
                event.isCritHit = true;
            }
            this.opponent.calculateDamage(this, event.amount, damageType, weapon, event.isCritHit, event.isTrueDamage, event.modifier);
            return true
        } else {
            // miss
            const missEvent: DamageEvent = {
                modifier: {
                    flat: 0,
                    multiplier: 1.0,
                    finalFlat: 0
                },
                attacker: this,
                receiver: this.opponent,
                amount: -1,
                type: damageType,
                damageSource: weapon,
                isCritHit: false
            }
            this.logger.recordDamageEvent(missEvent, "miss");
            this.allEffects.forEach(effect => effect.onAttackMiss?.());
            this.opponent.allEffects.forEach(effect => effect.onDodge?.())
            return false
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
}


