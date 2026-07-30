import express from "express";
import { PrismaClient } from '@prisma/client';
import type { Character } from "@prisma/client";
import { BattleManager } from "./battle/BattleManager.js";
import { Shop } from "./Shop.js";

const app = express();
const prisma = new PrismaClient();

interface IdObject {
    id: string
}

export interface CharacterInitData {
    character_id: string,
    curses: IdObject[],
    equipmets: IdObject[]
}


app.use(express.json());

app.get("/", (_, res) => {
    // Test data
    let testCharacter: CharacterInitData = {
        character_id: "DrugGuy",
        curses: [{ "id": "overbright_eyes" },
        { "id": "hollow_vessel" }],
        equipmets: [
            { "id": "loaded_fate" },
            { "id": "rebound_baton" },
            { "id": "rusty_dagger" },
            { "id": "pills" },
            { "id": "bitter_syrup" },
            { "id": "night_pill" },
            { "id": "expired_vitamin" },
            { "id": "recovery_note" },
            { "id": "withdrawal_patch" },
        ]
    }

    let bm: BattleManager = new BattleManager(testCharacter, testCharacter);
    bm.run();

    console.log("Result:", bm.result);

    res.json({
        data: {
            player_character: testCharacter,
            opponent_character: testCharacter,
            battlelog: bm.logger.battleLog,
            battle_result: bm.result,
            game_result: "continue"
        }
    });
});

app.get("/Character/:id", async (req, res) => {
    const { id } = req.params;

    console.log(id);

    try {
        const character = await prisma.character.findUnique({
            where: { id: parseInt(id) }
        });

        if (character) res.json(character);
        else res.status(404).json({ error: 'Character not found' });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post("/new_game", async (req, res) => {
    const { data } = req.body;
    const { character_id } = data;

    if (!character_id) {
        return res.status(400).json({ error: "character_id is required." });
    }

    try {
        const newGame = await prisma.game.create({
            data: {
                character_id: character_id,
                round: 1,
                hp: 3,
                money: 100
            }
        });

        res.json({
            data: {
                uuid: newGame.game_id
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error failed to create character' });
    }
});

app.get("/shop", async (req, res) => {
    const { uuid } = req.query;

    const game = await prisma.game.findUnique({
        where: {
            game_id: uuid,
        },
    });

    if (!game) {
        return res.status(404).json({ error: "Game data not found" });
    }

    const drawnItems = Shop.draw(game.character_id, game.round);

    res.json({
        data: {
            money: game.money,
            curses: drawnItems.curses,
            goods: drawnItems.goods
        }
    });
});

app.post("/battle", async (req, res) => {
    const { uuid } = req.query;

    const game = await prisma.game.findUnique({
        where: {
            game_id: uuid,
        },
    });

    const { data } = req.body;

    const init_data: CharacterInitData = {
        character_id: game.character_id,
        curses: data.curses,
        equipmets: data.equipmets
    }

    try {

        const [randomCharacter] = await prisma.$queryRaw<Character[]>`
            SELECT *
            FROM "Character"
            WHERE round = ${game.round}
            ORDER BY RANDOM()
            LIMIT 1;
        `;

        const enemy_data: CharacterInitData = randomCharacter?.data ?? {
            character_id: "DrugGuy",
            curses: [],
            equipmets: []
        };

        //console.log(enemy_data);

        const bm: BattleManager = new BattleManager(init_data, enemy_data)
        bm.run()

        let finalHp = game.hp

        if (bm.result == "win") {
            await prisma.character.create({
                data: {
                    game_id: game.game_id,
                    round: game.round,
                    data: {
                        character_id: game.character_id,
                        curses: data.curses,
                        equipmets: data.equipmets
                    }
                }
            });
        }
        else if (bm.result == "lose") {
            finalHp -= 1;
        }

        await prisma.game.update({
            where: {
                game_id: uuid,
            },
            data: {
                hp: finalHp,
                round: game.round + 1
            }
        });

        res.json({
            data: {
                player_character: init_data,
                opponent_character: enemy_data,
                battlelog: bm.logger.battleLog,
                battle_result: bm.result,
                game_result: "continue"
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error failed to initialize battle' });
    }
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
    console.log("Hello World!");
});
