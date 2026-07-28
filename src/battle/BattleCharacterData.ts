import type { BaseEffect } from "./BaseEffect.js";
import type { BattleCharacter } from "./BattleCharacter.js";
import type { BattleManager } from "./BattleManager.js";
import type { Status } from "./Status.js";

export type StatIdType =
    | "maxHp"
    | "hp"
    | "shield"
    | "allResistance"
    | "physicalResistance"
    | "poisonResistance"
    | "critRate"
    | "hitRate"
    | "evasion"
    | "attackSpeed"
    | "totalSpeed";

export class BattleCharacterData {
    statuses: Status[] = [];
    allEffects: BaseEffect[] = [];
    timer = 0.0;
    index = 0;

    // Dependancy
    battleManager: BattleManager
    opponent!: BattleCharacter;

    // Combat Stat
    _maxHp: number = 100.0;
    _hp: number = 100.0;
    _shield: number = 0.0;
    _allResistance: number = 0.0;
    _physicalResistance: number = 0.0;
    _poisonResistance: number = 0.0;

    _critRate: number = 0.0;
    _hitRate: number = 1.0;
    _evasion: number = 1.0;
    _attackSpeed: number = 1.0;
    _totalSpeed: number = 1.0;

    private setStat<T>(key: StatIdType, value: number): boolean {
        if (this[key] !== value) {
            this[key] = value;
            this.logger.recordStatChangeEvent(this, key);
            return true;
        }
        return false;
    }

    get maxHp() { return this._maxHp; }
    set maxHp(value: number) { this.setStat("maxHp", value) }
    get hp() { return this._hp; }
    set hp(value: number) { this.setStat("hp", value); }
    get shield() { return this._shield; }
    set shield(value: number) { this.setStat("shield", value); }
    get allResistance() { return this._allResistance; }
    set allResistance(value: number) { this.setStat("allResistance", value); }
    get physicalResistance() { return this._physicalResistance; }
    set physicalResistance(value: number) { this.setStat("physicalResistance", value); }
    get poisonResistance() { return this._poisonResistance; }
    set poisonResistance(value: number) { this.setStat("poisonResistance", value); }
    get critRate() { return this._critRate; }
    set critRate(value: number) { this.setStat("critRate", value); }
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