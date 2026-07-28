import { Weapon } from "./Weapon.js";
import { Status, type EffectContext } from "./Status.js";
import { Passive } from "./Passive.js";
import type { DamageEvent, StatusChangeEvent } from "./Event.js";
import { DamageType } from "../enum/DamageType.js";
import type { BattleContext } from "./BattleManager.js";

export class BattleCharacter {
    index: number;

    wieldWeapon: Weapon = new Weapon();
    currentStatus: Status[] = [];

    passives: Passive[] = [];

    // Combat Stat
    maxHp: number = 100.0;
    hp: number = 100.0;
    shield: number = 0.0;
    resistance: Record<DamageType, number> = {
        [DamageType.Physical]: 0.0,
        [DamageType.Fire]: 0.0,
        [DamageType.Poison]: 0.0
    };

    // Dependancy
    battleCtx: BattleContext

    constructor(ctx: BattleContext, index: number, weaponid: string = "barehand", statusid: string[] = [], passiveid: string[] = []) {
        this.battleCtx = ctx;

        this.index = index;

        this.wieldWeapon = Weapon.Weapons[weaponid]?.clone() ?? new Weapon();
        statusid.forEach(id => {
            this.currentStatus.push(new Status(id, this, 10));
        });

        passiveid.forEach(id => {
            this.passives.push(new Passive(this, id));
        });

        this.maxHp = 100.0;
        this.hp = 100.0;
    }

    getStatus(id: string): Status | undefined {
        return this.currentStatus.find(s => s.id === id);
    }

    update(ctx: EffectContext): void {
        // Checking OnTick Status
        this.currentStatus.forEach(status => {
            status.processOnTick(ctx);
        });

        // this.passives.forEach(passive => {
        //     passive.triggerEffect(ctx);
        // });
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
        for (let status of this.currentStatus) {
            if (status.id == id) {
                status.stack += stack;
                return
            }
        }
        this.currentStatus.push(new Status(id, this, stack));
    }

    onStart() {
        this.passives.forEach(p => { p.onStart });
    }

    onDamageTaken(event: DamageEvent) {
        this.passives.forEach(p => { p.onDamageTaken?.(event) });

        this.applyResistance(event);


        const final = (event.amount + event.modifier.flat) * event.modifier.multiplier

        this.battleCtx.logger.recordDamageEvent(event, final);

        this.takeDamage(final);
    }

    onStatusChange(event: StatusChangeEvent) {
        this.passives.forEach(p => { p.onStatusChange?.(event) });

        const beforeStack = event.status.stack;
        const afterStack = Math.max(0, beforeStack + event.amount);

        const change = afterStack - beforeStack;

        event.status.stack = afterStack;

        this.battleCtx.logger.recordStatusChangeEvent(event, beforeStack, afterStack);
    }
    /* TODOS:
    onStart?: (character: Character) => void;
    onAttack?: (event: DamageEvent) => void;
    
    onDeath?: (event: DamageEvent) => void;
    onStatusAdd?: (event: StatusAddEvent) => void;
    */
}


