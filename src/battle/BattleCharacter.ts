import { Status } from "./Status.js";
import { Passive } from "./Passive.js";
import type { DamageEvent, StatusChangeEvent } from "./Event.js";
import { DamageType } from "../enum/DamageType.js";
import type { BattleContext, BattleManager } from "./BattleManager.js";
import type { BaseEffect } from "./BaseEffect.js";
import { BattleCharacterData } from "./BattleCharacterData.js";

export class BattleCharacter extends BattleCharacterData {
    constructor(manager: BattleManager, index: number, weaponid: string = "barehand", statusid: string[] = [], passiveid: string[] = []) {
        super(manager);
        this.battleManager = manager;
        this.index = index;
        statusid.forEach(id => {
            this.statuses.push(new Status(id, this, 10));
        });
        passiveid.forEach(id => {
            this.allEffects.push(new Passive(this, id));
        });
        this.maxHp = 100.0;
        this.hp = 100.0;
    }

    beforeStart() {
        this.allEffects.forEach(p => { p.beforeStart?.() });
    }
    onStart() {
        this.allEffects.forEach(p => { p.onStart?.() });
    }
    update(): void {
        this.statuses.forEach(status => {
            status.update(this.totalSpeed * this.battleManager.tickTime);
        });
    }

    onDamageTaken(event: DamageEvent) {
        this.allEffects.forEach(p => { p.beforeDamageTaken?.(event) });
        this.applyResistance(event);
        const final = (event.amount + event.modifier.flat) * event.modifier.multiplier
        this.logger.recordDamageEvent(event, final);
        this.takeDamage(final);
        this.allEffects.forEach(p => { p.afterDamageTaken?.(event) });
    }
    applyResistance(damage: DamageEvent) {
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
    takeDamage(damage: number): void {
        this.hp -= Math.max(damage, 0);
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
                this.statuses.splice(i);
                return;
            }
        }
    }
    afterStatusChange(event: StatusChangeEvent) {
        this.allEffects.forEach(p => { p.afterStatusChange?.(event) });
        const beforeStack = event.status.stack - event.delta;
        const afterStack = event.status.stack
        event.status.stack = afterStack;
        this.logger.recordStatusChangeEvent(event, beforeStack, afterStack);
    }

    onEffectToggle(effect: BaseEffect) {
        this.logger.recordEffectToggleEvent(effect)
    }
    onStatusToggle(status: Status) { }
}


