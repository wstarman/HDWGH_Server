import CurseData from "./data/curses.json" with {type: "json"}
import EqData from "./data/equipments.json" with {type: "json"}
import WeaponData from "./data/weapons.json" with {type: "json"}

enum ItemGrade {
    Low = "low",
    Mid = "mid",
    High = "high"
}

type GradeChance = Record<ItemGrade, number>;

interface EquipmentDTO {
    id: string;
}

interface ShopDrawResult {
    curses: EquipmentDTO[][];
    goods: EquipmentDTO[][];
}

export class Shop {
    static draw(character: string, round: number): ShopDrawResult {
        let ShopCurseList: EquipmentDTO[][] = [];
        let ShopEqList: EquipmentDTO[][] = [];

        // Curse
        for (let i = 0; i < 3; i++) {
            let CurseSelected: EquipmentDTO[] = [];

            //const selectedCurseIds = new Set<string>();
            while (CurseSelected.length < 3) {
                const grade = Shop.selectGrade(round);

                let selected: string | undefined;

                if (this.SIGNATURE_CURSE_TABLE[character] === undefined) {
                    throw new Error("No Signature Table");
                }

                if (this.SIGNATURE_CURSE_TABLE[character][grade].length === 0) {
                    let CurseRoll = Math.floor(Math.random() * this.CURSE_TABLE[grade].length)

                    selected = this.CURSE_TABLE[grade][CurseRoll];
                }
                else if (this.CURSE_TABLE[grade].length === 0) {
                    let CurseRoll = Math.floor(Math.random() * this.SIGNATURE_CURSE_TABLE[character][grade].length)

                    selected = this.SIGNATURE_CURSE_TABLE[character][grade][CurseRoll];
                }
                else {
                    const isSig: number = Math.floor(Math.random() * 2);

                    if (isSig) {
                        let CurseRoll = Math.floor(Math.random() * this.SIGNATURE_CURSE_TABLE[character][grade].length)

                        selected = this.SIGNATURE_CURSE_TABLE[character][grade][CurseRoll];
                    }
                    else {
                        let CurseRoll = Math.floor(Math.random() * this.CURSE_TABLE[grade].length)

                        selected = this.CURSE_TABLE[grade][CurseRoll];
                    }
                }




                if (selected/* && !selectedCurseIds.has(selected)*/) {
                    //selectedCurseIds.add(selected);
                    CurseSelected.push({ id: selected });
                }
            }

            ShopCurseList.push(CurseSelected);
        }

        // Equipment
        for (let i = 0; i < 5; i++) {
            let EqSelected: EquipmentDTO[] = [];
            while (EqSelected.length < 3) {
                const grade = Shop.selectGrade(round);

                let selected: string | undefined;

                if (this.SIGNATURE_EQUIPMENT_TABLE[character] === undefined) {
                    throw new Error("No Signature Table");
                }

                if (this.SIGNATURE_EQUIPMENT_TABLE[character][grade].length === 0) {
                    let EqRoll = Math.floor(Math.random() * this.EQUIPMENT_TABLE[grade].length)

                    selected = this.EQUIPMENT_TABLE[grade][EqRoll];
                }
                else if (this.EQUIPMENT_TABLE[grade].length === 0) {
                    let EqRoll = Math.floor(Math.random() * this.SIGNATURE_EQUIPMENT_TABLE[character][grade].length)

                    selected = this.SIGNATURE_EQUIPMENT_TABLE[character][grade][EqRoll];
                }
                else {
                    const isSig: number = Math.floor(Math.random() * 2);

                    if (isSig) {
                        let EqRoll = Math.floor(Math.random() * this.SIGNATURE_EQUIPMENT_TABLE[character][grade].length)

                        selected = this.SIGNATURE_EQUIPMENT_TABLE[character][grade][EqRoll];
                    }
                    else {
                        let EqRoll = Math.floor(Math.random() * this.EQUIPMENT_TABLE[grade].length)

                        selected = this.EQUIPMENT_TABLE[grade][EqRoll];
                    }
                }

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

        for (const grade of Object.values(ItemGrade)) {
            const value = chance[grade];

            total += value;

            if (roll < total) {
                return grade;
            }
        }

        throw new Error(
            `Invalid chance table: total chance is ${total}, expected 100`
        );
    }

    static checkDraw(round: number, com_table: Record<ItemGrade, string[]>, sig_table: Record<ItemGrade, string[]>): boolean {
        const chance = this.CHANCE_TABLE[round];

        if (!chance) return false;

        for (const [grade, value] of Object.entries(chance)) {
            if (value <= 0) continue;

            if (!isItemGrade(grade)) continue;

            if (com_table[grade].length > 0 ||
                sig_table[grade].length > 0) {
                return true;
            }
        }

        return false;
    }

    static readonly CHANCE_TABLE: Record<number, GradeChance> = {
        1: {
            [ItemGrade.Low]: 100,
            [ItemGrade.Mid]: 0,
            [ItemGrade.High]: 0
        },
        2: {
            [ItemGrade.Low]: 80,
            [ItemGrade.Mid]: 20,
            [ItemGrade.High]: 0
        },
        3: {
            [ItemGrade.Low]: 60,
            [ItemGrade.Mid]: 30,
            [ItemGrade.High]: 10
        },
        4: {
            [ItemGrade.Low]: 40,
            [ItemGrade.Mid]: 40,
            [ItemGrade.High]: 20
        },
        5: {
            [ItemGrade.Low]: 20,
            [ItemGrade.Mid]: 50,
            [ItemGrade.High]: 30
        },
        6: {
            [ItemGrade.Low]: 0,
            [ItemGrade.Mid]: 60,
            [ItemGrade.High]: 40
        },
    };

    static SIGNATURE_CURSE_TABLE: Record<string, Record<ItemGrade, string[]>> = {}

    static CURSE_TABLE: Record<ItemGrade, string[]> = {
        [ItemGrade.Low]: [],
        [ItemGrade.Mid]: [],
        [ItemGrade.High]: []
    };

    static SIGNATURE_EQUIPMENT_TABLE: Record<string, Record<ItemGrade, string[]>> = {}

    static EQUIPMENT_TABLE: Record<ItemGrade, string[]> = {
        [ItemGrade.Low]: [],
        [ItemGrade.Mid]: [],
        [ItemGrade.High]: []
    };

    static {
        CurseData.forEach(curse => {
            if (!isItemGrade(curse.grade)) return;

            if (curse.characters.length >= 1 && curse.characters[0] !== "Common") {
                curse.characters.forEach(character => {
                    this.SIGNATURE_CURSE_TABLE[character] ??= {
                        [ItemGrade.Low]: [],
                        [ItemGrade.Mid]: [],
                        [ItemGrade.High]: []
                    };

                    this.SIGNATURE_CURSE_TABLE[character][curse.grade as ItemGrade].push(curse.id);
                })
            }
            else {
                this.CURSE_TABLE[curse.grade as ItemGrade].push(curse.id);
            }
        });

        EqData.forEach(equipment => {
            if (!isItemGrade(equipment.grade)) return;

            if (equipment.characters.length >= 1 && equipment.characters[0] !== "Common") {
                equipment.characters.forEach(character => {
                    this.SIGNATURE_EQUIPMENT_TABLE[character] ??= {
                        [ItemGrade.Low]: [],
                        [ItemGrade.Mid]: [],
                        [ItemGrade.High]: []
                    };

                    this.SIGNATURE_EQUIPMENT_TABLE[character][equipment.grade as ItemGrade].push(equipment.id);
                })
            }
            else {
                this.EQUIPMENT_TABLE[equipment.grade as ItemGrade].push(equipment.id);
            }
        });

        WeaponData.forEach(weapon => {
            if (!isItemGrade(weapon.grade)) return;

            if (weapon.characters.length >= 1 && weapon.characters[0] !== "Common") {
                weapon.characters.forEach(character => {
                    this.SIGNATURE_EQUIPMENT_TABLE[character] ??= {
                        [ItemGrade.Low]: [],
                        [ItemGrade.Mid]: [],
                        [ItemGrade.High]: []
                    };

                    this.SIGNATURE_EQUIPMENT_TABLE[character][weapon.grade as ItemGrade].push(weapon.id);
                })
            }
            else {
                this.EQUIPMENT_TABLE[weapon.grade as ItemGrade].push(weapon.id);
            }
        });
    }
}

function isItemGrade(key: string): key is ItemGrade {
    return Object.values(ItemGrade).includes(key as ItemGrade);
}