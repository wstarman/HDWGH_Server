import EqData from "./Equipment.json" with {type: "json"}


interface TierChance {
    basic: number,
    mid: number,
    advanced: number
}

type EquipmentTier = "basic" | "mid" | "advanced";

interface EquipmentDTO {
    id: string;
}

export class Shop {
    static draw(round: number): EquipmentDTO[] {
        let EqSelected: EquipmentDTO[] = [];
        while (EqSelected.length < 3) {
            const tier = Shop.selectTier(round);

            let EqRoll = Math.floor(Math.random() * this.EQUIPMENT_TABLE[tier].length)


            const selected = this.EQUIPMENT_TABLE[tier][EqRoll];
            if (selected) {
                EqSelected.push({ id: selected });
            }
        }

        return EqSelected;
    }

    static selectTier(round: number): EquipmentTier {
        const chance = this.CHANCE_TABLE[round];

        if (!chance) {
            throw new Error(`No chance table found for round ${round}`);
        }

        const roll = Math.random() * 100;

        let total = 0;

        for (const [tier, value] of Object.entries(chance)) {
            total += value;

            if (roll < total) {
                return tier as EquipmentTier;
            }
        }

        throw new Error(
            `Invalid chance table: total chance is ${total}, expected 100`
        );
    }

    static readonly CHANCE_TABLE: Record<number, TierChance> = {
        1: {
            basic: 100,
            mid: 0,
            advanced: 0
        },
        2: {
            basic: 80,
            mid: 20,
            advanced: 0
        },
        3: {
            basic: 60,
            mid: 30,
            advanced: 10
        },
        4: {
            basic: 40,
            mid: 40,
            advanced: 20,
        },
        5: {
            basic: 20,
            mid: 50,
            advanced: 30,
        },
        6: {
            basic: 0,
            mid: 60,
            advanced: 40,
        },
    };

    static EQUIPMENT_TABLE: Record<EquipmentTier, string[]> = {
        basic: [],
        mid: [],
        advanced: [],
    };

    static {
        Object.entries(EqData as Record<EquipmentTier, string[]>).forEach(([tier, eqlist]) => {
            if (!isEquipmentTier(tier)) return;


            this.EQUIPMENT_TABLE[tier] = eqlist;
        });
    }
}

function isEquipmentTier(key: string): key is EquipmentTier {
    return ["basic", "mid", "advanced"].includes(key);
}