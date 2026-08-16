import type { BattleCharacter } from "./BattleCharacter.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";
import equipmentData from "../data/equipments.json" with { type: "json" };
import { StatusName } from "./Status.js";
import { Weapon } from "./Weapon.js";
import { DamageType } from "../enum/DamageType.js";

export interface EquipmentDef extends BaseEffectDef {
}

export class Equipment extends BaseEffect {
    constructor(owner: BattleCharacter, id: string, index: number, defs?: Record<string, BaseEffectDef>) {
        if (defs) {
            super(owner, id, defs);
        }
        else {
            if (!equipmentDataLoaded) {
                for (const equipment of equipmentData) {
                    const eid = equipment.id;
                    if (equipmentDefs[eid] && equipment.tags) {
                        equipmentDefs[eid].tags = [...equipment.tags];
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
                this.enabled2 = true;
                this.owner.getEffect("drug_tolerance")!.speed += 0.2;
            } else if (event.status.stack < 5 && this.enabled2) {
                this.owner.getEffect("drug_tolerance")!.speed -= 0.2;
            }
        },
        afterDamageTaken(event) {
            if (event.damageSource.id == StatusName.poison) {
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
            this.owner.addStatus(StatusName.poison, 6);
            this.owner.evasion += 0.2;
            this.owner.hitRate -= 0.2;
        },
        onDodge() {
            this.owner.shield += 5;
        },
        onAttackMiss() {
            if (!this.enabled2) {
                this.enabled2 = true;
                this.owner.attackSpeed += 0.5;
            }
        },
        onAttackHit(event) {
            if (this.enabled2) {
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
                    this.owner.getEffect("drug_tolerance")!.speed += 0.05;
                    this.stack++;
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
        onAttackHit(event) {
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
        onAttackHit(event) {
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
            const reducedHP = Math.floor(this.owner.maxHp * 0.1);
            let antidoteStack = reducedHP
            if (this.owner.getStatus(StatusName.poison)) {
                antidoteStack = Math.max(0, reducedHP - this.owner.getStatus(StatusName.poison)!.stack);
            }
            this.owner.maxHp *= 0.9;
            this.owner.addStatus(StatusName.poison, -reducedHP)
            this.stack += antidoteStack;
        }
    }
};

