import { Status } from "./Status.js";
import { characterPassive, Passive } from "./Passive.js";
import { type AttackEvent, type DamageEvent, type StatusChangeEvent, type DamageSource } from "./Event.js";
import { DamageType } from "../enum/DamageType.js";
import type { BattleManager } from "./BattleManager.js";
import type { BaseEffect } from "./BaseEffect.js";
import { BattleCharacterData } from "./BattleCharacterData.js";
import { Weapon } from "./Weapon.js";
import { Curse } from "./Curse.js";

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
        equipments.forEach(id => {
            this.allEffects.push(new Passive(this, id));
        });
    }

    beforeStart() {
        this.allEffects.forEach(effect => { effect.beforeStart?.() });
    }
    onStart() {
        this.allEffects.forEach(effect => { effect.onStart?.() });
    }
    update(): void {
        this.stamina += Math.min(this.maxStamina - this.stamina, this.staminaRecover / this.battleManager.tickTime);
        this.statuses.forEach(status => {
            status.update(this.totalSpeed * this.battleManager.tickTime);
        });
        this.allEffects.forEach(effect => {
            effect.update(this.totalSpeed * this.battleManager.tickTime);
        });
    }

    attack(weapon: Weapon, damage: number = weapon.damage, baseHitRate = 1.0, damageType = weapon.damageType) {
        const event: AttackEvent = {
            hitRate: this.hitRate * baseHitRate,
            critRate: this.critRate,
            attacker: this,
            receiver: this.opponent,
            amount: damage,
            type: damageType,
            damageSource: weapon
        }
        this.allEffects.forEach(effect => effect.beforeAttack?.(event));
        if (Math.random() < event.hitRate) {
            this.allEffects.forEach(effect => effect.onAttackHit?.(event));
            this.opponent.calculateDamage(this, event.amount, damageType, weapon);
        } else {
            this.allEffects.forEach(effect => effect.onAttackMiss?.());
            this.opponent.allEffects.forEach(effect => effect.onDodge?.())
        }
    }
    calculateDamage(attacker: BattleCharacter, amount: number, type: DamageType, damageSource: DamageSource) {
        const event: DamageEvent = {
            modifier: {
                flat: 0,
                multiplier: 1.0
            },
            attacker: attacker,
            receiver: this,
            amount,
            type,
            damageSource
        }
        this.allEffects.forEach(p => p.beforeDamageTaken?.(event));
        this.applyResistance(event);
        const final = (event.amount + event.modifier.flat) * event.modifier.multiplier
        this.logger.recordDamageEvent(event, final);
        this.takeDamage(final);
        this.allEffects.forEach(p => p.afterDamageTaken?.(event));
    }
    private applyResistance(damage: DamageEvent) {
        let partialResistance = 0;
        switch (damage.type) {
            case DamageType.Poison:
                partialResistance = this.poisonResistance;
                break;
            case DamageType.Physical:
                partialResistance = this.physicalResistance;
                break;
        }
        damage.modifier.multiplier *= (1.0 - partialResistance) * (1.0 - this.allResistance);
    }
    private takeDamage(damage: number): void {
        damage = Math.max(damage, 0);
        const remaining = damage - this.shield;
        this.shield -= Math.min(damage, this.shield)
        this.hp -= remaining;
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
                status.stack = Math.max(0, status.stack + delta);
                return;
            }
        }
        this.statuses.push(new Status(id, this, delta));
    }
    clearStatus(id: string) {
        for (let i = 0; i < this.statuses.length; i++) {
            if (this.statuses[i]!.id == id) {
                this.statuses[i]!.onCleared?.();
                this.statuses.splice(i, 1);
                return;
            }
        }
    }
    afterStatusChange(event: StatusChangeEvent) {
        const beforeStack = event.status.stack - event.delta;
        const afterStack = event.status.stack
        event.status.stack = afterStack;
        this.logger.recordStatusChangeEvent(event, beforeStack, afterStack);
        this.allEffects.forEach(p => p.afterStatusChange?.(event));
    }

    onEffectToggle(effect: BaseEffect) {
        this.logger.recordEffectToggleEvent(effect)
        this.allEffects.forEach(p => p.onAnyEffectToggle?.(effect));
    }
    onStatusToggle(status: Status) { }
}


