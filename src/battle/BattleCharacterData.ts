import type { BaseEffect } from "./BaseEffect.js";
import type { BattleCharacter } from "./BattleCharacter.js";
import type { BattleManager } from "./BattleManager.js";
import type { Status } from "./Status.js";

export type StatIdType =
    | "maxHp"
    | "hp"
    | "stamina"
    | "maxStamina"
    | "staminaRecover"
    | "shield"
    | "allDamageTakenMultiplier"
    | "weaponDamageTakenMultiplier"
    | "physicalDamageTakenMultiplier"
    | "toxicDamageTakenMultiplier"
    | "attackPower"
    | "critRate"
    | "critDamage"
    | "hitRate"
    | "evasion"
    | "attackSpeed"
    | "totalSpeed";

export const initialCharacterValue = {
    hp: 100,
    stamina: 10,
    staminaRecover: 1.0,
    attackPower: 1,
}

export class BattleCharacterData {
    id!: string;
    statuses: Status[] = [];
    allEffects: BaseEffect[] = [];
    timer = 0.0;
    index = 0;

    // Dependancy
    battleManager: BattleManager
    opponent!: BattleCharacter;

    // Combat Stat
    _maxHp: number = initialCharacterValue.hp;
    _hp: number = initialCharacterValue.hp;
    _maxStamina: number = initialCharacterValue.stamina;
    _stamina: number = initialCharacterValue.stamina;
    _staminaRecover: number = initialCharacterValue.staminaRecover;
    _shield: number = 0.0;

    _allDamageTakenMultiplier: number = 1.0;
    _weaponDamageTakenMultiplier: number = 1.0;
    _physicalDamageTakenMultiplier: number = 1.0;
    _toxicDamageTakenMultiplier: number = 1.0;

    _attackPower: number = initialCharacterValue.attackPower;
    _critRate: number = 0.0;
    _critDamage: number = 2.0;
    _hitRate: number = 1.0;
    _evasion: number = 0.0;
    _attackSpeed: number = 1.0;
    _totalSpeed: number = 1.0;

    maxHpGainRate = 1.0;
    healRate = 1.0;
    attackProhibited = false;
    lifeSteal = 0.0;
    undead = false;
    beforeDeadTriggered = false;    // 是否觸發過beforeDead
    nonAttackSpeed = 1.0;
    staminaCostMultiplier = 1.0;
    staminaCostFlat = 0.0;

    private setStat<T>(key: StatIdType, value: number): boolean {
        if (this[`_${key}`] !== value) {
            this[`_${key}`] = value;
            this.logger.recordStatChangeEvent(this, key);
            this.allEffects.forEach(effect => { effect.onStatChange?.(key, value) });
            return true;
        }
        return false;
    }

    get maxHp() { return this._maxHp; }
    set maxHp(value: number) {
        value += (this.maxHpGainRate - 1) * (value - this.maxHp);
        this.setStat("maxHp", value);
        this.hp = Math.min(this.hp, this.maxHp);
    }
    get hp() { return this._hp; }
    set hp(value: number) { this.setStat("hp", Math.max(Math.min(value, this.maxHp), 0)); }
    get maxStamina() { return this._maxStamina; }
    set maxStamina(value: number) { this.setStat("maxStamina", value); }
    get stamina() { return this._stamina; }
    set stamina(value: number) { this.setStat("stamina", Math.min(value, this.maxStamina)); }
    get staminaRecover() { return this._staminaRecover; }
    set staminaRecover(value: number) { this.setStat("staminaRecover", value); }
    get shield() { return this._shield; }
    set shield(value: number) { this.setStat("shield", value); }

    get allDamageTakenMultiplier() { return this._allDamageTakenMultiplier; }
    set allDamageTakenMultiplier(value: number) { this.setStat("allDamageTakenMultiplier", value); }
    get weaponDamageTakenMultiplier() { return this._weaponDamageTakenMultiplier; }
    set weaponDamageTakenMultiplier(value: number) { this.setStat("weaponDamageTakenMultiplier", value); }
    get physicalDamageTakenMultiplier() { return this._physicalDamageTakenMultiplier; }
    set physicalDamageTakenMultiplier(value: number) { this.setStat("physicalDamageTakenMultiplier", value); }
    get toxicDamageTakenMultiplier() { return this._toxicDamageTakenMultiplier; }
    set toxicDamageTakenMultiplier(value: number) { this.setStat("toxicDamageTakenMultiplier", value); }

    get attackPower() { return this._attackPower; }
    set attackPower(value: number) { this.setStat("attackPower", value); }
    get critRate() { return this._critRate; }
    set critRate(value: number) { this.setStat("critRate", value); }
    get critDamage() { return this._critDamage; }
    set critDamage(value: number) { this.setStat("critDamage", value); }
    get hitRate() { return this._hitRate; }
    set hitRate(value: number) { this.setStat("hitRate", value); }
    get evasion() { return this._evasion; }
    set evasion(value: number) { this.setStat("evasion", value); }
    get attackSpeed() { return this._attackSpeed; }
    set attackSpeed(value: number) { this.setStat("attackSpeed", value); }
    get totalSpeed() { return this._totalSpeed; }
    set totalSpeed(value: number) { this.setStat("totalSpeed", value); }
    get logger() { return this.battleManager.logger }

    constructor(manager: BattleManager) {
        this.battleManager = manager
    }
}