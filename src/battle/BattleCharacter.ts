import { Weapon } from "./Weapon.js";
import { Status } from "./Status.js";
import { Passive } from "./Passive.js";
import type { DamageEvent, StatusChangeEvent } from "./Event.js";
import { DamageType } from "../enum/DamageType.js";
import type { BattleContext, BattleManager } from "./BattleManager.js";
import type { BaseEffect } from "./BaseEffect.js";

export class BattleCharacter {
    index: number;
    wieldWeapon: Weapon = new Weapon();
    statuses: Status[] = [];
    allEffects: BaseEffect[] = [];
    timer = 0.0;

    // Combat Stat
    maxHp: number = 100.0;
    hp: number = 100.0;
    shield: number = 0.0;
    resistance: Record<DamageType, number> = {
        [DamageType.Physical]: 0.0,
        [DamageType.Fire]: 0.0,
        [DamageType.Poison]: 0.0
    };
    attackSpeed = 1.0;
    speed = 1.0;

    // Dependancy
    battleManager: BattleManager
    opponent!: BattleCharacter;

    constructor(manager: BattleManager, index: number, weaponid: string = "barehand", statusid: string[] = [], passiveid: string[] = []) {
        this.battleManager = manager;
        this.index = index;
        this.wieldWeapon = Weapon.Weapons[weaponid]?.clone() ?? new Weapon();
        statusid.forEach(id => {
            this.statuses.push(new Status(id, this, 10));
        });
        passiveid.forEach(id => {
            this.allEffects.push(new Passive(this, id));
        });
        this.maxHp = 100.0;
        this.hp = 100.0;
    }

    getStatus(id: string): Status | undefined {
        return this.statuses.find(s => s.id === id);
    }

    update(): void {
        this.statuses.forEach(status => {
            status.update(this.speed * this.battleManager.tickTime);
        });
    }

    applyResistance(damage: DamageEvent) {
        const resistance = this.resistance[damage.type];
        if (resistance !== undefined) {
            damage.modifier.multiplier *= (100.0 - this.resistance[damage.type]) / 100.0;
        }
    }

    takeDamage(damage: number): void {
        this.hp -= Math.max(damage, 0);
    }

    addStatus(id: string, stack: number) {
        for (let status of this.statuses) {
            if (status.id == id) {
                status.stack += stack;
                return
            }
        }
        this.statuses.push(new Status(id, this, stack));
    }

    onStart() {
        this.allEffects.forEach(p => { p.onStart?.() });
    }

    onDamageTaken(event: DamageEvent) {
        this.allEffects.forEach(p => { p.onDamageTaken?.(event) });
        this.applyResistance(event);
        const final = (event.amount + event.modifier.flat) * event.modifier.multiplier
        this.battleManager.logger.recordDamageEvent(event, final);
        this.takeDamage(final);
    }

    onStatusChange(event: StatusChangeEvent) {
        this.allEffects.forEach(p => { p.onStatusChange?.(event) });
        const beforeStack = event.status.stack - event.delta;
        const afterStack = event.status.stack
        event.status.stack = afterStack;
        this.battleManager.logger.recordStatusChangeEvent(event, beforeStack, afterStack);
    }
    /* TODOS:
    onStart?: (character: Character) => void;
    onAttack?: (event: DamageEvent) => void;
    
    onDeath?: (event: DamageEvent) => void;
    onStatusAdd?: (event: StatusAddEvent) => void;
    */
}


