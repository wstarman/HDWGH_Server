import WeaponsData from "./Weapon.json" with {type: "json"}

type WeaponId = string

export class Weapon {
    WeaponId: string = "";
    WeaponDamage: number = 0;
    WeaponCooldown: number = 1000;

    constructor(id: string = "barehand", damage: number = 1, cd: number = 1000) {
        this.WeaponId = id;
        this.WeaponDamage = damage;
        this.WeaponCooldown = Math.ceil(cd);
    }

    clone(): Weapon {
        return new Weapon(this.WeaponId, this.WeaponDamage, this.WeaponCooldown);
    }

    static Weapons: Record<WeaponId, Weapon> = {};

    static {
        WeaponsData.forEach(weaponData => {
            this.Weapons[weaponData.id] = new Weapon(weaponData.id, weaponData.damage, weaponData.cooldown);
        });

        /*Object.values(Weapon.Weapons).forEach((weapon) => {
            console.log(`Weapon: ${weapon.WeaponId}, Damage: ${weapon.WeaponDamage}`);
        })*/
    }
}


