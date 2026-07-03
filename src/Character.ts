import { Weapon } from "./Weapon.js";
import { Status } from "./Status.js";

export class Character{
    WieldWeapon: Weapon = new Weapon();
    CurrentStatus: Status = new Status();

    // Combat Stat
    MaxHP: number = 100.0;
    HP: number = 100.0;
    Physical_Res: number = 0.0;
    Fire_Res: number = 0.0;

    constructor(weaponid: string = "barehand", statusid: string = "") {
        this.WieldWeapon = Weapon.Weapons[weaponid]?.clone() ?? new Weapon();
        this.CurrentStatus = new Status(statusid);

        this.MaxHP = 100.0;
        this.HP = 100.0;
        this.Physical_Res = 0.0;
        this.Fire_Res = 0.0;
    }
    
    NormalAttack(Enemy: Character): void {
        Enemy.TakeDamage(this.WieldWeapon.WeaponDamage);
    }

    TakeDamage(damage: number/*, type: DamageType*/): void {
        this.HP -= Math.max(damage, 0);
    }
		/*Physical_Damage_Type:
			damage *= (1.0 - (Physical_Res/100.0))
		Fire_Damage_Type:
			damage *= (1.0 - (Fire_Res/100.0))
			
		_:
			pass*/
}


