import CurseData from "./Curse.json" with {type: "json"}
import EqData from "./Equipment.json" with {type: "json"}


interface GradeChance {
    basic: number,
    mid: number,
    advanced: number
}

type ItemGrade = "basic" | "mid" | "advanced";

interface EquipmentDTO {
    id: string;
}

interface ShopDrawResult {
    curses: EquipmentDTO[][];
    goods: EquipmentDTO[][];
}

export class Shop {
    static draw(round: number): ShopDrawResult {
        let ShopCurseList: EquipmentDTO[][] = [];
        let ShopEqList: EquipmentDTO[][] = [];

        // Curse
        for (let i = 0; i < 3; i++) {
            let CurseSelected: EquipmentDTO[] = [];

            //const selectedCurseIds = new Set<string>();
            while (CurseSelected.length < 3) {
                const grade = Shop.selectGrade(round);

                let CurseRoll = Math.floor(Math.random() * this.EQUIPMENT_TABLE[grade].length)


                const selected = this.CURSE_TABLE[grade][CurseRoll];
                if (selected/* && !selectedCurseIds.has(selected)*/) {
                    //selectedCurseIds.add(selected);
                    CurseSelected.push({ id: selected });
                }
            }

            ShopCurseList.push(CurseSelected);
        }

        // Equipment

        for (let i = 0; i < 3; i++) {
            let EqSelected: EquipmentDTO[] = [];
            while (EqSelected.length < 3) {
                const grade = Shop.selectGrade(round);

                let EqRoll = Math.floor(Math.random() * this.EQUIPMENT_TABLE[grade].length)


                const selected = this.EQUIPMENT_TABLE[grade][EqRoll];
                if (selected) {
                    EqSelected.push({ id: selected });
                }
            }

            ShopEqList.push(EqSelected);
        }


        return {
            curses: ShopCurseList,
            goods: ShopEqList
        };
    }

    static selectGrade(round: number): ItemGrade {
        const chance = this.CHANCE_TABLE[round];

        if (!chance) {
            throw new Error(`No chance table found for round ${round}`);
        }

        const roll = Math.random() * 100;

        let total = 0;

        for (const [grade, value] of Object.entries(chance)) {
            total += value;

            if (roll < total) {
                return grade as ItemGrade;
            }
        }

        throw new Error(
            `Invalid chance table: total chance is ${total}, expected 100`
        );
    }

    static readonly CHANCE_TABLE: Record<number, GradeChance> = {
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

    static CURSE_TABLE: Record<ItemGrade, string[]> = {
        basic: [],
        mid: [],
        advanced: [],
    };

    static EQUIPMENT_TABLE: Record<ItemGrade, string[]> = {
        basic: [],
        mid: [],
        advanced: [],
    };

    static {
        Object.entries(CurseData as Record<ItemGrade, string[]>).forEach(([grade, curselist]) => {
            if (!isItemGrade(grade)) return;


            this.CURSE_TABLE[grade] = curselist;
        });

        Object.entries(EqData as Record<ItemGrade, string[]>).forEach(([grade, eqlist]) => {
            if (!isItemGrade(grade)) return;


            this.EQUIPMENT_TABLE[grade] = eqlist;
        });
    }
}

function isItemGrade(key: string): key is ItemGrade {
    return ["basic", "mid", "advanced"].includes(key);
}