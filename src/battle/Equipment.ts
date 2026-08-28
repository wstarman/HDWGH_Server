import type { BattleCharacter } from "./BattleCharacter.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import equipmentDataList from "../data/equipments.json" with { type: "json" };
import { StatusName } from "./Status.js";
import { Weapon } from "./Weapon.js";
import { DamageType } from "../enum/DamageType.js";
import { Curse } from "./Curse.js";
import { initialCharacterValue } from "./BattleCharacterData.js";

export interface EquipmentDef extends BaseEffectDef {
}

export class Equipment extends BaseEffect {
    constructor(owner: BattleCharacter, id: string, index: number, defs?: Record<string, BaseEffectDef>) {
        if (defs) {
            super(owner, id, defs);
        }
        else {
            if (!equipmentDataLoaded) {
                const gradeTable: Record<string, number> = { "low": 0, "mid": 1, "high": 2 };
                for (const equipmentData of equipmentDataList) {
                    const eid = equipmentData.id;
                    if (equipmentDefs[eid] && equipmentData.tags) {
                        equipmentDefs[eid].tags = [...equipmentData.tags];
                    }
                    if (equipmentDefs[eid] && equipmentData.grade) {
                        equipmentDefs[eid].grade = gradeTable[equipmentData.grade]!;
                    }
                }
                equipmentDataLoaded = true;
            }
            super(owner, id, equipmentDefs);
        }
        this.index = index;
    }
}

let equipmentDataLoaded = false;
export const equipmentDefs: Record<string, EquipmentDef> = {
    /**白色小藥片
     * 每 5 秒觸發一次。觸發時，獲得 1 層中毒，並隨機獲得以下一種效果，持續 4 秒：
     * 攻擊力 +15%
     * 攻擊速度 +10%
     * 受到武器傷害 -10% */
    "pills": {
        triggerInterval: 5,
        persistent: true,
        onTrigger() {
            this.toggle(true);
            this.owner.addStatus(StatusName.poison, 1);
            const r = Math.random();
            if (r < 0.333) {
                this.owner.attackPower += 0.15;
                this.addTimer(4, () => {
                    this.owner.attackPower -= 0.15;
                    this.toggle(false);
                })
            } else if (r < 0.667) {
                this.owner.attackSpeed += 0.1;
                this.addTimer(4, () => {
                    this.owner.attackSpeed -= 0.1;
                    this.toggle(false);
                })
            } else {
                this.owner.weaponDamageTakenMultiplier *= 0.9;
                this.addTimer(4, () => {
                    this.owner.weaponDamageTakenMultiplier /= 0.9;
                    this.toggle(false);
                })
            }
        },
    },
    /**苦味糖漿
     * 開始時生效，每 1 秒回復 3 HP，並使受到的中毒傷害降低 10%。
     * 開場時以及之後每 3 秒加 1 層毒。
     */
    "bitter_syrup": {
        triggerInterval: 3,
        beforeStart() {
            this.owner.toxicDamageTakenMultiplier *= 0.9;
        },
        onStart() {
            this.owner.addStatus(StatusName.poison, 1);
        },
        everyTick(deltaTime) {
            this.temp1 += deltaTime;
            if (this.temp1 >= 1) {
                this.toggle();
                this.temp1 -= 1;
                this.owner.heal(3);
            }
        },
        onTrigger() {
            this.toggle();
            this.owner.addStatus(StatusName.poison, 1);
        },
    },
    /**安眠藥
     * 全場被動。每 3 秒觸發一次。
     * 接下來 2 秒內，受到的武器傷害降低 50%，但是在效果結束時獲得一層中毒並且返還 40% 傷害。
     */
    "night_pill": {
        triggerInterval: 3,
        persistent: true,
        isUnique: true,
        onTrigger() {
            this.toggle(true);
            this.owner.weaponDamageTakenMultiplier *= 0.5;
            this.temp1 = 0;
            this.addTimer(2, () => {
                this.toggle(false);
                this.owner.weaponDamageTakenMultiplier /= 0.5;
                this.owner.addStatus(StatusName.poison, 1);
                this.owner.takeDamage(this.temp1 * 0.8);
            });
        },
        afterDamageTaken(event) {
            if (event.damageSource instanceof Weapon) {
                this.temp1 += event.amount;
            }
        },
    },
    /**過期維他命
     * 被動：最大生命值獲取量 +10%。
     * 每 4 秒觸發一次。觸發時，獲得 10 max HP、一層毒。接下來 5 秒內，攻擊速度 +20%。
     */
    "expired_vitamin": {
        triggerInterval: 4,
        beforeStart() {
            this.owner.maxHpGainRate += 0.1;
        },
        onTrigger() {
            this.toggle();
            this.owner.maxHp += 10;
            this.owner.hp += 10;
            this.owner.addStatus(StatusName.poison, 1);
            this.owner.attackSpeed += 0.2;
            this.addTimer(5, () => this.owner.attackSpeed -= 0.2);
        }
    },
    /**戒毒小紙條
     * 全場被動。角色每次以任何手段減少 2 層毒，獲得 5 護盾並且傷害 +5%。
     */
    "recovery_note": {
        isUnique: true,
        beforeStart() {
            this.temp1 = 0;
            this.stack = 0;
        },
        afterStatusChange(event) {
            if (event.status.id == StatusName.poison && event.delta < 0) {
                this.temp1 += -event.delta;
                while (this.temp1 >= 2) {
                    this.togglePassive();
                    this.owner.shield += 5;
                    this.owner.attackPower += 0.05;
                    this.temp1 -= 2;
                    this.stack += 1;
                }
            }
        },
    },
    /**戒斷貼片
     * 全場被動。如果角色因為中毒受傷，其中的 10% 轉化為護盾。
     * 增加角色的自然毒衰減速度20%，此效果在毒層數低於 5 時不生效。
     */
    "withdrawal_patch": {
        isUnique: true,
        afterStatusChange(event) {
            if (event.status.stack >= 5 && !this.enabled2) {
                this.togglePassive(true);
                this.enabled2 = true;
                this.owner.getEffect("drug_tolerance")!.speed += 0.2;
            } else if (event.status.stack < 5 && this.enabled2) {
                this.togglePassive(false);
                this.owner.getEffect("drug_tolerance")!.speed -= 0.2;
            }
        },
        afterDamageTaken(event) {
            if (event.damageSource.id == StatusName.poison) {
                this.togglePassive();
                this.owner.shield += event.amount * 0.1;
            }
        },
    },
    /**
     * 黑市處方 
     * 每 4 秒觸發一次。
     * 觸發時，獲得3層中毒，並隨機獲得以下兩種效果，持續 4 秒：
     * 攻擊力 +30%
     * 攻擊速度 +20%
     * 受到傷害 -20%
     * 每秒增加2點護盾
     * 中毒傷害降低 40%
     * 如果隨機到重複效果，該效果數值提高 50%。(例如抽到兩次攻擊力，最後效果是(30%+30%)*1.5=+90%
     */
    "black_market_prescription": {
        triggerInterval: 4,
        persistent: true,
        onTrigger() {
            this.toggle(true);
            this.owner.addStatus(StatusName.poison, 3);
            const r1 = Math.floor(Math.random() * 5)
            const r2 = Math.floor(Math.random() * 5)
            const effectMultiplier = r1 == r2 ? 3 : 1;
            if (r1 == 0 || r2 == 0) {
                this.owner.attackPower += 0.3 * effectMultiplier;
                this.addTimer(4, () => { this.owner.attackPower -= 0.3 * effectMultiplier; })
            }
            if (r1 == 1 || r2 == 1) {
                this.owner.attackSpeed += 0.2 * effectMultiplier;
                this.addTimer(4, () => { this.owner.attackSpeed -= 0.2 * effectMultiplier; })
            }
            if (r1 == 2 || r2 == 2) {
                this.owner.allDamageTakenMultiplier *= r1 == r2 ? 0.7 * 0.7 : 0.8;
                this.addTimer(4, () => { this.owner.allDamageTakenMultiplier /= r1 == r2 ? 0.4 : 0.8; })
            }
            if (r1 == 3 || r2 == 3) {
                for (let i = 1; i <= 4; i++) {
                    this.addTimer(i, () => { this.owner.shield += 2 * effectMultiplier; })
                }
            }
            if (r1 == 4 || r2 == 4) {
                this.owner.toxicDamageTakenMultiplier *= r1 == r2 ? 0.4 * 0.4 : 0.6;
                this.addTimer(4, () => { this.owner.toxicDamageTakenMultiplier /= r1 == r2 ? 0.4 * 0.4 : 0.6; })
            }
            this.addTimer(4, () => { this.toggle(false); })
        },
    },
    /**
     * 霓虹吸入器
     * 每 5 秒觸發一次。
     * 觸發時，獲得 2 層中毒。
     * 接下來 3 秒內，攻擊速度 +30%。
     * 藥效期間，每次攻擊命中時，額外造成一次小量傷害(這個傷害不參加倍數計算)。
     * 藥效結束後，攻擊速度 -20%，持續 2 秒。
     */
    "neon_inhaler": {
        triggerInterval: 5,
        persistent: true,
        onTrigger() {
            this.toggle(true);
            this.owner.addStatus(StatusName.poison, 2);
            this.owner.attackSpeed += 0.3;
            this.addTimer(3, () => {
                this.toggle(false);
                this.owner.attackSpeed -= 0.5;
                this.addTimer(2, () => {
                    this.owner.attackSpeed += 0.2;
                })
            })
        },
        onAttackHit(event) {
            if (this.enabled) {
                event.modifier.finalFlat += 1;
            }
        },
    },
    /**
     * Dream Dust(幻覺)
     * 開場食用，獲得6層毒
     * 閃避率 +20%，miss率+20%。
     * 每次成功閃避時，獲得5護盾。
     * 每次攻擊落空，攻擊速度+50%(直到下次攻擊命中)
     */
    "dream_dust": {
        beforeStart() {
            this.toggle();
            this.owner.addStatus(StatusName.poison, 6);
            this.owner.evasion += 0.2;
            this.owner.hitRate -= 0.2;
        },
        onDodge() {
            this.togglePassive();
            this.owner.shield += 5;
        },
        onAttackMiss() {
            if (!this.enabled2) {
                this.togglePassive(true);
                this.enabled2 = true;
                this.owner.attackSpeed += 0.5;
            }
        },
        afterAttackHit(event) {
            if (this.enabled2) {
                this.togglePassive(false);
                this.enabled2 = false;
                this.owner.attackSpeed -= 0.5;
            }
        }
    },
    /**
     * 劣質血清 
     * 每 8 秒觸發一次。
     * 觸發時，獲得 20層中毒。
     * 立刻移除目前 50% 的中毒層數，每移除10層，本場戰鬥受到的毒傷害-5%
     */
    "low_grade_serum": {
        triggerInterval: 8,
        beforeStart() {
            this.stack = 0;
        },
        onTrigger() {
            this.toggle();
            this.owner.addStatus(StatusName.poison, 20);
            const removedPoison = Math.round(this.owner.getStatus(StatusName.poison)!.stack * 0.5);
            this.owner.addStatus(StatusName.poison, -removedPoison);
            this.stack += removedPoison;
            while (this.stack >= 10) {
                this.stack -= 10;
                this.owner.toxicDamageTakenMultiplier *= 0.95;
            }
        }
    },
    /**
     * 生命監測手環
     * 全場被動。
     * 角色清醒狀態時，受到的所有傷害降低 15%。
     * 每次脫離清醒狀態的時候，獲得當前毒層數*2的護盾
     */
    "life_monitor_bracelet": {
        isUnique: true
        // 效果實作於"清醒狀態"部分
    },
    /**
     * 規律藥盒 / Routine Pillbox
     * 全場被動。
     * 角色每受到5中毒傷害時候，獲得 1 層規律。
     * 最多 5 層。
     * 每層規律使毒自然降低速度+5%。
     */
    "routine_pillbox": {
        isUnique: true,
        beforeStart() {
            this.stack = 0;
        },
        afterDamageTaken(event) {
            if (event.type == DamageType.Toxic) {
                this.temp1 += event.amount;
                while (this.temp1 >= 5 && this.stack < 5) {
                    this.temp1 -= 5;
                    this.stack++;
                    this.owner.getEffect("drug_tolerance")!.speed += 0.05;
                }
            }
        }
    },
    /**
     * Black Adrenal  (抓著心臟跳動)
     * 每 9 秒觸發一次。
     * 觸發時，獲得 20層中毒。
     * 接下來 5 秒內，攻擊力 +25%，攻擊速度 +25%，並且攻擊增加50%吸血。
     * 藥效結束後，失去目前生命值的 20% + 最大生命的10%。
     */
    "black_adrenal": {
        persistent: true,
        triggerInterval: 9,
        onTrigger() {
            this.toggle(true);
            this.owner.addStatus(StatusName.poison, 20);
            this.owner.attackPower += 0.25;
            this.owner.attackSpeed += 0.25;
            this.owner.lifeSteal += 0.5;
            this.addTimer(5, () => {
                this.toggle(false);
                this.owner.attackPower -= 0.25;
                this.owner.attackSpeed -= 0.25;
                this.owner.lifeSteal -= 0.5;
                this.owner.hp -= this.owner.hp * 0.2 + this.owner.maxHp * 0.1;
            })
        }
    },
    /**
     * 超頻安瓿 / Overclock Ampoule
     * 每 8 秒觸發一次。
     * 接下來 5 秒內，攻擊速度 +50%。
     * 藥效期間，每次攻擊後，額外獲得 1 層超頻。
     * 每層超頻使攻擊速度再 +5%，最多 10 層。
     * 藥效結束後，清除所有超頻，並進入神經燒灼 3 秒。
     * 神經燒灼期間，每次攻擊獲得兩層中毒。
     */
    "overclock_ampoule": {
        persistent: true,
        triggerInterval: 8,
        onTrigger() {
            this.toggle(true);
            this.owner.addStatus(StatusName.poison, 20);
            this.owner.attackSpeed += 0.5;
            this.addTimer(5, () => {
                this.toggle(false);
                this.owner.attackSpeed -= 0.5 + this.stack * 0.05;
                this.stack = 0;
                this.enabled2 = true;
                this.addTimer(3, () => {
                    this.enabled2 = false;
                })
            })
        },
        afterAttackHit(event) {
            if (this.enabled && this.stack < 10) {
                this.stack++;
                this.owner.attackSpeed += 0.05;
            }
            if (this.enabled2) {
                this.owner.addStatus(StatusName.poison, 2);
            }
        }
    },
    /**
     * 白日 / White Sun
     * 每7秒觸發一次。
     * 觸發時，獲得 5 層中毒。
     * 接下來 4秒內，miss率+50%，爆擊率+50%
     * 藥效期間，每次miss都會讓爆擊率再加上5%
     * 藥效結束後，進入白化視界 2秒。
     * 白化視界期間，每次攻擊有 25% 機率落空
     */
    "white_sun": {
        persistent: true,
        triggerInterval: 7,
        onTrigger() {
            this.toggle(true);
            this.owner.addStatus(StatusName.poison, 5);
            this.owner.hitRate -= 0.5;
            this.owner.critRate += 0.5;
            this.addTimer(4, () => {
                this.toggle(false);
                this.owner.hitRate += 0.5;
                this.owner.critRate -= 0.5 + this.stack * 0.05;
                this.stack = 0;
                this.enabled2 = true;
                this.owner.hitRate -= 0.25;
                this.addTimer(2, () => {
                    this.enabled2 = false;
                    this.owner.hitRate += 0.25;
                })
            })
        },
        onAttackMiss() {
            if (this.enabled) {
                this.togglePassive();
                this.stack++;
                this.owner.critRate += 0.05;
            }
        },
    },
    /**
     * Deadman Protocol / 死人協議
     * 被動效果。
     * 角色受到致命傷害時自動觸發。
     * 每場戰鬥只能觸發一次。
     * 觸發時，獲得 150層中毒，獲得每秒降低50層毒的效果
     * 接下來 角色無法死亡，直到毒回到0結束。
     * 所有攻擊附帶額外傷害。
     * 藥效結束時，如果敵人仍然存活，角色直接死亡。
     */
    "deadman_protocol": {
        isUnique: true,
        persistent: true,
        beforeDead() {
            if (this.temp1 == 0) {
                this.temp1 = 1;
                this.toggle(true);
                this.owner.undead = true;
                this.owner.addStatus(StatusName.poison, 150);
                const everyEnabledSec = () => this.addTimer(1, () => {
                    this.owner.addStatus(StatusName.poison, -50);
                    everyEnabledSec();
                })
                everyEnabledSec();
            }
        },
        afterAttackHit(event) {
            if (this.enabled) {
                event.modifier.flat += 4;
            }
        },
        afterStatusChange(event) {
            if (event.status.id == StatusName.poison && event.status.stack <= 0) {
                this.toggle(false);
                this.owner.undead = false;
                if (this.owner.opponent.alive) {
                    this.owner.hp = -99999;
                }
            }
        },
    },
    /**
     * 病房門卡 
     * 全場被動。
     * 清醒狀態時所有非武器裝備觸發快50%
     * 角色每次身上中毒超過20層後，進入病房狀態
     * 病房狀態期間：
     * 強制清醒
     * 腳色每秒減少10層毒
     * 此期間每減少10層毒扣除等量5%最大生命值的HP
     * 若毒在此期間到達0，病房狀態將會滯留1秒後解除
     */

    "ward_access_card": {
        isUnique: true,
        // 部分效果寫在清醒被動中
        beforeStart() {
            this.stack = 0;
        },
        afterStatusChange(event) {
            if (event.status.id == StatusName.poison) {
                if (event.status.stack > 20 && !this.enabled) {
                    this.toggle(true);
                    this.mainTimer = 0;
                    this.owner.getEffect("sobriety")?.toggle(true);
                }
                if (event.delta < 0 && this.enabled) {
                    this.stack += -event.delta;
                    if (this.stack >= 10) {
                        this.stack -= 10;
                        this.owner.hp -= this.owner.maxHp * 0.05;
                    }
                    if (event.status.stack <= 0) {
                        this.addTimer(1, () => { this.toggle(false); })
                    }
                }
            }
        },
        everyTick() {
            if (this.enabled) {
                this.temp1 += this.owner.battleManager.tickTime * this.owner.totalSpeed;
                if (this.temp1 >= 1) {
                    this.temp1 -= 1;
                    this.toggle();
                    this.owner.addStatus(StatusName.poison, -10);
                }
            }
        }
    },
    /**
     * 淨斷束帶
     * 清醒狀態減傷+15%
     * 每次腳色脫離清醒狀態，降低10%最大HP，立刻減少等量的毒層數，若無層數可減，獲得解毒劑層數(使接下來N層毒失效)
     */
    "detox_strap": {
        // 部分效果和觸發條件寫在清醒被動中
        // 解毒劑效果寫在Character::addStatus中
        beforeStart() {
            this.stack = 0;
        },
        onTrigger() {
            this.togglePassive();
            const reducedHP = Math.floor(this.owner.maxHp * 0.1);
            let antidoteStack = reducedHP
            if (this.owner.getStatus(StatusName.poison)) {
                antidoteStack = Math.max(0, reducedHP - this.owner.getStatus(StatusName.poison)!.stack);
            }
            this.owner.maxHp *= 0.9;
            this.owner.addStatus(StatusName.poison, -reducedHP)
            this.stack += antidoteStack;
        }
    },

    // ---------------- 賭徒 ----------------

    /**名字：安慰獎籌碼
     * 效果：未命中時獲得1枚籌碼。爆擊時兌現全部籌碼，每枚增加10%傷害，最多持有5枚。 */
    "consolation_chip": {
        beforeStart() {
            this.stack = 0;
        },
        onAttackMiss() {
            if (this.stack < 5) {
                this.togglePassive();
                this.stack++;
                this.owner.attackPower += 0.1;
            }
        },
        afterAttackCrit() {
            this.togglePassive();
            this.owner.attackPower -= 0.1 * this.stack;
            this.stack = 0;
        }
    },
    /**名字：莊家抽水
     * 效果：爆擊傷害增加40%，但每次爆擊額外消耗1點耐力。耐力不足時不獲得傷害加成。 */
    "house_cut": {
        onAttackCrit(event) {
            if (this.owner.stamina >= 1) {
                this.togglePassive();
                this.owner.stamina -= 1;
                event.critDamage += 0.4;
            }
        }
    },
    /**名字：未中獎的彩券
     * 效果：如果攻擊未命中超過第二次，每次攻擊返還25%耐力，直到命中為止 */
    "losing_lottery_ticket": {
        beforeStart() {
            this.stack = 0;
        },
        onAttackMiss(event) {
            this.stack++;
            if (this.stack > 2) {
                this.togglePassive();
                this.owner.stamina += event.staminaCost * 0.25;
            }
        },
        afterAttackHit(event) {
            this.stack = 0;
        }
    },
    /**名字：押冷門
     * 效果：命中率低於40%的攻擊一旦命中，恢復1點耐力。
     */
    "long_shot_bet": {
        afterAttackHit(event) {
            if (event.hitRate < 0.4) {
                this.togglePassive();
                this.owner.stamina += 1;
            }
        }
    },
    /**名字：馬丁格爾策略
     * 效果：每次未命中，使目前的傷害加成依序增加至10%、20%、40%、80%、160%。命中時清空加成；若該次攻擊沒有爆擊，只獲得一半傷害加成。
     */
    "martingale_strategy": {
        beforeStart() {
            this.stack = 0;
        },
        onAttackMiss() {
            this.stack++;
        },
        onAttackCrit(event) {
            if (this.stack > 0) {
                this.togglePassive();
                event.modifier.multiplier += 0.1 * Math.pow(2, this.stack - 1);
            }
            this.stack = 0;
        },
        onAttackNotCrit(event) {
            if (this.stack > 0) {
                this.togglePassive();
                event.modifier.multiplier += 0.1 * Math.pow(2, this.stack - 1) * 0.5;
            }
            this.stack = 0;
        },
    },
    /**名字：追損客
     * 效果：每次未命中，使下一次攻擊的傷害與耐力消耗增加20%。效果可以疊加，命中後清空。
     */
    "loss_chaser": {
        beforeStart() {
            this.stack = 0;
        },
        onAttackMiss() {
            this.togglePassive();
            this.stack++;
            this.owner.staminaCostMultiplier += 0.2;
        },
        afterAttackHit(event) {
            this.togglePassive();
            event.modifier.multiplier += this.stack * 0.2;
            this.owner.staminaCostMultiplier -= 0.2 * this.stack;
            this.stack = 0;
        }
    },
    /**名字：詐領保險
     * 效果：每連續未命中3次時，回復自己已失去的HP的40%
     */
    "insurance_fraud": {
        beforeStart() {
            this.stack = 0;
        },
        onAttackMiss() {
            this.stack++;
            if (this.stack >= 3) {
                this.togglePassive();
                this.owner.hp += (this.owner.maxHp - this.owner.hp) * 0.4;
                this.stack = 0;
            }
        },
        afterAttackHit(event) {
            this.stack = 0;
        }
    },
    /**名字：Free game
     * 效果：當你連續命中三次攻擊，觸發連續10次最後一次攻擊[主要指使用的武器](傷害10%，不消耗耐力)
     */
    "free_game": {
        beforeStart() {
            this.stack = 0;
        },
        afterAttackHit(event) {
            this.stack++;
            if (this.stack == 3) {
                this.togglePassive();
                const weapon = event.damageSource as BaseEffect;
                for (let i = 0; i < 10; i++) {
                    this.owner.attack(weapon, weapon.damage * 0.1, 0);
                }
                this.stack = 0;
            }
        }
    },
    /**名字：做記號的牌
     * 效果：每次攻擊累積層數，不小於4層後，可以在未命中時消耗4層強制變為命中。觸發後有50%機率使自身在5秒內降低50%爆擊傷害。
     */
    "marked_cards": {
        // 部分效果寫在character.attack中，記得改id
        beforeStart() {
            this.stack = 0;
        },
        beforeAttack(event) {
            this.stack++;
        },
    },
    /**名字：破產清算
     * 效果：使用武器但耐力不足時，移除一層自身最高等Curse的效果。5秒冷卻。 */
    // "bankruptcy_liquidation": {
    //     onStaminaInsufficient() {
    //         let maxStatus = this.owner.statuses[0];
    //         let chosenCurse: Curse | null = null;
    //         this.owner.allEffects.forEach(effect => {
    //             if (effect instanceof Curse) {
    //                 if (!chosenCurse) {
    //                     chosenCurse = effect;
    //                 } else {
    //                     if (chosenCurse.grade < effect.grade) {
    //                         chosenCurse = effect;
    //                     }
    //                 }
    //             }
    //         })
    //     }
    // },
    /**名字：幸運硬幣
     * 效果：受到傷害時有50%機率使該次傷害減少25%。
     */
    "lucky_coin": {
        beforeDamageTaken(event) {
            if (Math.random() < 0.5) {
                this.togglePassive();
                event.modifier.multiplier -= 0.25;
            }
        },
    },
    /**名字：老虎機
     * 效果：每3次攻擊結算一次。三次攻擊結果完全相同時獲得獎勵：三次未命中使 手氣正旺 (被動3)立刻觸發9次；三次爆擊則立刻不消耗耐力攻擊7次。 */
    "slot_machine": {
        beforeStart() {
            this.stack = 0;
        },
        onAttackMiss(event) {
            this.stack++;
            this.temp1++;
            if (this.stack == 3) {
                if (this.temp1 == 3) {
                    this.owner.logger.recordCustomEvent(
                        this.owner.index,
                        this.id,
                        `[side:${this.owner.index}]獲得[item:slot_machine]的連續三次未命中獎勵`,
                        `TODO`
                    )
                    for (let i = 0; i < 9; i++) {
                        this.owner.getEffect("hot_streak")?.onTrigger!();
                    }
                }
                this.temp1 = 0;
                this.temp2 = 0;
                this.stack = 0;
            }
        },
        afterAttackHit(event) {
            this.stack++;
            if (event.isCritHit) {
                this.temp2++;
            }
            if (this.stack == 3) {
                if (this.temp2 == 3) {
                    this.owner.logger.recordCustomEvent(
                        this.owner.index,
                        this.id,
                        `[side:${this.owner.index}]獲得[item:slot_machine]的連續三次爆擊獎勵`,
                        `TODO`
                    )
                    for (let i = 0; i < 7; i++) {
                        const weapon = event.damageSource as BaseEffect;
                        this.owner.attack(weapon, weapon.damage, 0);
                    }
                }
                this.temp1 = 0;
                this.temp2 = 0;
                this.stack = 0;
            }
        },
    },
    /**名字：二十一點
     * 每次未命中獲得1～6點。爆擊時清空點數，點數越高，該次爆擊傷害越高(傷害倍率 = 1.1 + 3.9 × ((點數 − 1) ÷ 20)² {1.1~5})；點數超過21時立即清空，回復自己的10%maxHP。
     */
    "blackjack": {
        beforeStart() {
            this.stack = 0;
        },
        onAttackMiss(event) {
            this.stack += Math.floor(Math.random() * 6 + 1);
            if (this.stack > 21) {
                this.togglePassive();
                this.owner.hp += this.owner.maxHp * 0.1;
                this.stack = 0;
            }
        },
        onAttackCrit(event) {
            this.togglePassive();
            event.critDamage += 0.1 + 3.9 * Math.pow((this.stack - 1) / 20, 2);
            this.stack = 0;
        },
    },
    /**名字：捲錢跑路
     * 效果：生命降至0時不直接死亡，清除「手氣正旺」(被動3)在本場戰鬥累積的所有爆擊率(X)，以裝備欄第一個武器發動一次200%吸血的攻擊(必中並且傷害*X)。每場戰鬥只能觸發一次。
     */
    "cash_and_dash": {
        beforeStart() {
            this.enabled = true;
        },
        beforeDead() {
            if (!this.enabled) return;
            this.toggle();
            const streak = this.owner.getEffect("hot_streak");
            if (!streak) return;
            const streakStack = streak.stack;
            this.owner.critRate -= streakStack * streak.temp1;
            streak.stack = 0;
            let weapon: Weapon | null = null
            for (let effect of this.owner.allEffects) {
                if (effect instanceof Weapon) {
                    weapon = effect;
                    break;
                }
            }
            if (!weapon) return;
            this.owner.lifeSteal += 2;
            weapon.damage *= (1 + streakStack * streak.temp1);
            weapon.staminaCost -= 999;
            weapon.onTrigger?.();
            weapon.damage /= (1 + streakStack * streak.temp1);
            weapon.staminaCost += 999;
            this.owner.lifeSteal -= 2;
            this.enabled = false;
        },
    },
    /**名字：JACKPOT
     * 效果：每次未命中時都會把該次攻擊的基礎傷害的50%紀錄起來，命中攻擊有7%機率中獎，使該次攻擊基礎傷害加入之前紀錄的所有傷害(之後記錄清空)
     */
    "jackpot": {
        beforeStart() {
            this.stack = 0;
        },
        onAttackMiss(event) {
            this.stack += event.amount * 0.5;
        },
        onAttackHit(event) {
            if (Math.random() < 0.07) {
                this.togglePassive();
                event.modifier.flat += this.stack;
                this.stack = 0;
            }
        },
    },
    /**名字：砸鍋賣鐵
     * 效果：耐力不足時仍可發動攻擊，每缺少0.5點耐力便失去5%最大生命，並使該次攻擊增加等同於你失去生命值的基礎傷害。
     */
    "pawn_it_all": {
        // 效果寫在baseEffect.attack中
    },
    /**名字：賭場金庫
     * 效果：戰鬥開始時獲得相當於最大生命50%的護盾。15秒後或護盾第一次歸零時，； */
    // "ge17": {
    //     onStart() {
    //         this.owner.shield += this.owner.maxHp * 0.5;
    //     },
    //     onStatChange(stat, value) {
    //     },
    // },
    /**名字：護腕
     * 效果：最大HP增加10%，每秒回復0.5HP。
     */
    "bracer": {
        triggerInterval: 1,
        beforeStart() {
            this.toggle();
            this.owner.maxHp += initialCharacterValue.hp * 0.1;
        },
        onTrigger() {
            this.toggle();
            this.owner.hp += 0.5;
        },
    },
    /**名字：掛墜
     * 效果：最大耐力增加20%，耐力回復加快0.5。
     */
    "pendant": {
        beforeStart() {
            this.toggle();
            this.owner.maxStamina += initialCharacterValue.stamina * 0.2;
            this.owner.staminaRecover += 0.5;
        },
    },
    /**名字：系帶
     * 效果：武器抗性增加10%，攻擊速度加快5%。
     */
    "band": {
        beforeStart() {
            this.toggle();
            this.owner.weaponDamageTakenMultiplier *= 0.9;
            this.owner.attackSpeed += 0.05;
        },
    },
    /**名字：備用電池
     * 效果：每場戰鬥第一次耐力降至0時，立即恢復2點耐力。
     */
    "backup_battery":
    {
        onStaminaInsufficient() {
            if (this.temp1 == 0) {
                this.togglePassive();
                this.temp1 = 1;
                this.owner.stamina += 2;
            }
        },
    },
    /**名字：動能回收器
     * 效果：每受到50點傷害回復1點耐力。
     */
    "kinetic_energy_recycler": {
        beforeStart() {
            this.stack = 0;
        },
        afterDamageTaken(event) {
            this.stack += event.amount;
            while (this.stack >= 50) {
                this.togglePassive();
                this.stack -= 50;
                this.owner.stamina += 1;
            }
        },
    },
    /**名字：完美對拍
     * 效果：每3次攻擊不消耗耐力。
     */
    "perfect_timing": {
        beforeStart() {
            this.stack = 0;
        },
        beforeUseStamina(event) {
            if (this.stack >= 2) {
                this.togglePassive();
                this.stack = -1;
                event.costMultiplier = 0;
            }
        },
        beforeAttack(event) {
            this.stack++;
        }
    },
    /**名字：核動力核心
     * 效果：耐力不足立即恢復全部耐力。12秒冷卻。
     */
    "nuclear_core": {
        onStaminaInsufficient() {
            if (this.temp1 == 0) {
                this.togglePassive();
                this.owner.stamina = this.owner.maxStamina;
                this.temp1 = 1;
                this.addTimer(12, () => this.temp1 = 0);
            }
        },
    },
    /**名字：超載引擎
     * 效果：生命值低於50%的時候，耐力回復+2.5/s。
     */
    "overdrive_engine": {
        persistent: true,
        onStatChange(stat, value) {
            if (stat == "hp" || stat == "maxHp") {
                if (this.owner.hp < this.owner.maxHp * 0.5 && !this.enabled) {
                    this.toggle(true);
                    this.owner.staminaRecover += 2.5;
                }
                else if (this.owner.hp >= this.owner.maxHp * 0.5 && this.enabled) {
                    this.toggle(false);
                    this.owner.staminaRecover -= 2.5;
                }
            }
        },
    },
    /**名字：膽小龜殼
     * 效果：生命不高於25%時，受到的傷害降低50%，武器攻擊力-50%。
     */
    "cowards_shell": {
        persistent: true,
        onStatChange(stat, value) {
            if (stat == "hp" || stat == "maxHp") {
                if (this.owner.hp <= this.owner.maxHp * 0.25 && !this.enabled) {
                    this.toggle(true);
                    this.owner.allDamageTakenMultiplier *= 0.5;
                    this.owner.attackPower -= 0.5;
                }
                else if (this.owner.hp > this.owner.maxHp * 0.25 && this.enabled) {
                    this.toggle(false);
                    this.owner.allDamageTakenMultiplier /= 0.5;
                    this.owner.attackPower += 0.5;
                }
            }
        },
    },
    /**名字：吸血鬼吊墜
     * 效果：攻擊吸血+50%。
     */
    "vampire_pendant": {
        beforeStart() {
            this.toggle();
            this.owner.lifeSteal += 0.5;
        },
    },
    /**名字：龍心G
     * 效果：每秒恢復2.5%最大生命；效果在血量越低時越強，最高5%。
     */
    "dragon_heart": {
        triggerInterval: 1,
        onTrigger() {
            this.toggle();
            this.owner.hp += this.owner.maxHp * (0.025 + 0.025 * (1 - this.owner.hp / this.owner.maxHp));
        },
    },
};