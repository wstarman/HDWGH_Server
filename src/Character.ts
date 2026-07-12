import { Weapon } from "./Weapon.js";
import { Status } from "./Status.js";
import { Passive } from "./Passive.js";
import type { DamageEvent } from "./Damage.js";

export class Character{
    Index: number;

    WieldWeapon: Weapon = new Weapon();
    CurrentStatus: Status[] = [];

    Passive: Passive[] = [];

    // Combat Stat
    MaxHP: number = 100.0;
    HP: number = 100.0;
    Physical_Res: number = 0.0;
    Fire_Res: number = 0.0;

    constructor(index: number, weaponid: string = "barehand", statusid: string[] = [], passiveid: string[] = []) {
        this.Index = index;

        this.WieldWeapon = Weapon.Weapons[weaponid]?.clone() ?? new Weapon();
        statusid.forEach(id => {
            this.CurrentStatus.push(new Status(id, 1));
        });

        passiveid.forEach(id => {
            this.Passive.push(new Passive(id));
        });

        this.MaxHP = 100.0;
        this.HP = 100.0;
        this.Physical_Res = 0.0;
        this.Fire_Res = 0.0;
    }
    
    NormalAttack(Enemy: Character): void {
        //Enemy.TakeDamage(this.WieldWeapon.WeaponDamage);
    }

    TakeDamage(damage: number): void {
        this.HP -= Math.max(damage, 0);
    }
		/*Physical_Damage_Type:
			damage *= (1.0 - (Physical_Res/100.0))
		Fire_Damage_Type:
			damage *= (1.0 - (Fire_Res/100.0))
			
		_:
			pass*/
}


