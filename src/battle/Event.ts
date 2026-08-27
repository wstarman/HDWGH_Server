import type { BattleCharacter } from "./BattleCharacter.js";

import type { DamageType } from "../enum/DamageType.js";
import type { Status } from "./Status.js";
import type { BaseEffect } from "./BaseEffect.js";
import type { Weapon } from "./Weapon.js";

export type DamageSource =
    | BaseEffect
    | Status;

export interface DamageModifier {
    flat: number,
    multiplier: number,
    finalFlat: number
}

export interface AttackEvent {
    hitRate: number,
    critRate: number,
    critDamage: number,
    attacker: BattleCharacter,
    receiver: BattleCharacter,
    amount: number,
    modifier: DamageModifier,
    type: DamageType,
    damageSource: DamageSource,
    isCritHit: boolean,
    isTrueDamage: boolean,
    staminaCost: number,
    hit: boolean
}

export interface DamageEvent {
    modifier: DamageModifier,
    attacker: BattleCharacter,
    receiver: BattleCharacter,
    amount: number,
    type: DamageType,
    damageSource: DamageSource,
    isCritHit: boolean
}

export interface StatusChangeEvent {
    owner: BattleCharacter,
    status: Status,
    delta: number
}

export interface StaminaCostEvent {
    costFlat: number,
    costMultiplier: number,
}