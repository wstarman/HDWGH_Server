import type { BattleCharacter } from "./BattleCharacter.js";
import { Status, StatusName as StatusName } from "./Status.js";
import { BaseEffect, type BaseEffectDef } from "./BaseEffect.js";

interface PassiveDef extends BaseEffectDef {
}

export class Passive extends BaseEffect {
    constructor(owner: BattleCharacter, id: string) {
        super(owner, id, passiveDefs);
    }
}

export const characterPassive: Record<string, Array<string>> = {
    "DrugGuy": ["drug_residue", "drug_tolerance", "sobriety"],
    "gambler": ["against_the_odds", "gamblers_paradox", "hot_streak"]
}

const passiveDefs: Record<string, PassiveDef> = {
    /**藥物殘留
     * 開場自帶5層毒在身上*/
    "drug_residue": {
        onStart() {
            this.toggle();
            this.owner.addStatus("poison", 5);
        }
    },
    /**抗藥性
     * 自然獲得20%毒傷害抗性，每秒減少兩層毒
     */
    "drug_tolerance": { // 
        triggerInterval: 1,
        beforeStart() {
            this.owner.toxicDamageTakenMultiplier *= 0.8;
        },
        onTrigger() {
            this.toggle();
            const poisonStatus = this.owner.getStatus("poison");
            if (poisonStatus !== undefined) {
                this.owner.addStatus(StatusName.poison, -2);
            }
        }
    },
    /**清醒
     * 戰鬥途中每次身上中毒層數歸零立刻進入清醒模式，有任何毒層數後滯留一秒消失
     * 清醒效果:
        攻擊速度+30%
        爆擊率+20%
        每秒獲得5護盾

     * 相關道具：生命監測手環(life_monitor_bracelet)
     * 全場被動。
     * 角色清醒狀態時，受到的所有傷害降低 15%。
     * 每次脫離清醒狀態的時候，獲得當前毒層數*2的護盾
     * 
     * 相關道具：病房門卡 (ward_access_card)
     * 全場被動。
     * 清醒狀態時所有非武器裝備觸發快50%
     * 角色每次身上中毒超過20層後，進入病房狀態
     * 病房狀態期間：
     * 強制清醒
     * 腳色每秒減少10層毒
     * 此期間每減少10層毒扣除等量5%最大生命值的HP
     * 若毒在此期間到達0，病房狀態將會滯留1秒後解除
     * 
     * 相關道具：淨斷束帶(detox_strap)
     * 清醒狀態減傷+15%
     * 每次腳色脫離清醒狀態，降低10%最大HP，立刻減少等量的毒層數，若無層數可減，獲得解毒劑層數(使接下來N層毒失效)
     */
    "sobriety": {
        persistent: true,
        triggerInterval: 1,
        afterStatusChange(event) {
            if (event.status.id == StatusName.poison && event.status.stack == 0 && !this.enabled) {
                this.toggle(true);
                this.temp1 = 0;
                this.owner.attackSpeed += 0.3;
                this.owner.critRate += 0.2;
                this.mainTimer = 0;
                if (this.owner.getEffect("life_monitor_bracelet")) {
                    this.owner.allDamageTakenMultiplier *= 0.85;
                }
                if (this.owner.getEffect("ward_access_card")) {
                    this.owner.nonAttackSpeed += 0.5;
                }
                this.owner.allDamageTakenMultiplier *= Math.pow(0.85, this.owner.getEffectNumber("detox_strap"))
            }
        },
        everyTick(deltaTime) {
            if (!this.enabled || this.owner.getEffect("ward_access_card")?.enabled) return;
            if (this.owner.hasStatus(StatusName.poison)) {
                this.temp1! += deltaTime
            } else {
                this.temp1 = 0;
            }
            if (this.temp1! >= 1) {
                this.toggle(false);
                this.owner.attackSpeed -= 0.3;
                this.owner.critRate -= 0.2;
                if (this.owner.getEffect("life_monitor_bracelet")) {
                    this.owner.allDamageTakenMultiplier /= 0.85;
                    if (this.owner.hasStatus(StatusName.poison)) {
                        this.owner.shield += this.owner.getStatus(StatusName.poison)!.stack * 2
                    }
                }
                if (this.owner.getEffect("ward_access_card")) {
                    this.owner.nonAttackSpeed -= 0.5;
                }
                this.owner.getEffects("detox_strap").forEach(effect => effect.onTrigger?.())
            }
        },
        onTrigger() {
            if (!this.enabled) return;
            this.toggle();
            this.owner.shield += 5;
        }
    },

    // ---------------- 賭徒 ----------------

    /**逆勢賠率 / Against the Odds
     * 命中率越低，爆擊率越高。
    */
    "against_the_odds": {
        onStatChange(stat, value) {
            if (stat == "hitRate") {
                this.owner.critRate += this.temp1 - this.owner.hitRate;
                this.temp1 = this.owner.hitRate;
            }
        },
    },
    /**賭徒悖論 / Gambler's Paradox
     * 每次攻擊未命中，增加下一次命中攻擊的爆擊機率。
     * 效果可以疊加，攻擊命中後清空。
     */
    "gamblers_paradox": {
        beforeStart() {
            this.stack = 0;
        },
        onAttackMiss() {
            this.stack++;
        },
        onAttackHit(event) {
            event.critRate += this.stack * 0.01;
            this.stack = 0;
        },
    },
    /**手氣正旺 / Hot Streak
     * 每次造成爆擊，永久增加本場戰鬥的爆擊率。效果持續至戰鬥結束。
     * 相關裝備：老虎機
     * 效果：每3次攻擊結算一次。三次攻擊結果完全相同時獲得獎勵：三次未命中使 手氣正旺 (被動3)立刻觸發9次；三次爆擊則立刻不消耗耐力攻擊7次。
     * 
     * 相關裝備：捲錢跑路
     * 效果：生命降至0時不直接死亡，清除「手氣正旺」(被動3)在本場戰鬥累積的所有爆擊率(X)，發動一次200%吸血的攻擊(必中並且傷害*X)。每場戰鬥只能觸發一次。
     */
    "hot_streak": {
        beforeStart() {
            this.temp1 = 0.01;
        },
        afterAttackCrit(event) {
            this.onTrigger!();
        },
        onTrigger() {
            this.stack++;
            this.owner.critRate += this.temp1;
        },
    }
};

