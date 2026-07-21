import { Weapon } from "./Weapon.js";
import { Status } from "./Status.js";
import { Passive } from "./Passive.js";
import type { DamageEvent, StatusChangeEvent } from "./Event.js";
import { DamageType } from "./enum/DamageType.js";
import type { BattleContext } from "./BattleManager.js";

export class Character{
    Index: number;

    WieldWeapon: Weapon = new Weapon();
    CurrentStatus: Status[] = [];

    Passive: Passive[] = [];

    // Combat Stat
    MaxHP: number = 100.0;
    HP: number = 100.0;
    Shield: number = 0.0;
    Resistance: Record<DamageType, number> = {
        [DamageType.Physical]:  0.0,
        [DamageType.Fire]:      0.0,
        [DamageType.Poison]:    0.0
    };

    // Dependancy
    BattleCtx: BattleContext

    constructor(ctx: BattleContext, index: number, weaponid: string = "barehand", statusid: string[] = [], passiveid: string[] = []) {
        this.BattleCtx = ctx;
        
        this.Index = index;

        this.WieldWeapon = Weapon.Weapons[weaponid]?.clone() ?? new Weapon();
        statusid.forEach(id => {
            this.CurrentStatus.push(new Status(id, this, 5));
        });

        passiveid.forEach(id => {
            this.Passive.push(new Passive(id));
        });

        this.MaxHP = 100.0;
        this.HP = 100.0;
    }
    
    NormalAttack(Enemy: Character): void {
        //Enemy.TakeDamage(this.WieldWeapon.WeaponDamage);
    }

    ApplyResistance(damage: DamageEvent){
        const resistance = this.Resistance[damage.type];

        if (resistance !== undefined){
            damage.modifier.multiplier *= (100.0 - this.Resistance[damage.type]) / 100.0;
        }
    }

    TakeDamage(damage: number): void {
        this.HP -= Math.max(damage, 0);
    }

    AddStatus(id: string, stack: number){
        for (let status of this.CurrentStatus){
            if(status.Id==id){
                status.Stack += stack;
                return
            }
        }
        this.CurrentStatus.push(new Status(id, this, stack));
    }

    onStart(){
        this.Passive.forEach(p => {p.PassiveDefinition.onStart?.(this)});
    }

    onDamageTaken(event: DamageEvent){
        this.Passive.forEach(p => {p.PassiveDefinition.onDamageTaken?.(event)});

        this.ApplyResistance(event);


        const final = (event.amount + event.modifier.flat) * event.modifier.multiplier

        this.BattleCtx.logger.recordDamageEvent(event, final);

        this.TakeDamage(final);
    }

    onStatusChange(event: StatusChangeEvent){
        this.Passive.forEach(p => {p.PassiveDefinition.onStatusChange?.(event)});
    }
    /* TODOS:
    onStart?: (character: Character) => void;
    onAttack?: (event: DamageEvent) => void;
    
    onDeath?: (event: DamageEvent) => void;
    onStatusAdd?: (event: StatusAddEvent) => void;
    */
}


