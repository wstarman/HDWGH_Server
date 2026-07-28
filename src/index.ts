import express from "express";
import { PrismaClient } from '@prisma/client';
import { BattleManager } from "./battle/BattleManager.js";
import type { CharacterData } from "./battle/BattleManager.js";
import { Shop } from "./Shop.js";

const app = express();
const prisma = new PrismaClient();

interface IdObject {
    id: string
}

interface CharacterInitData {
    character_id: string,
    curses: IdObject[],
    goods: IdObject[]
}


app.use(express.json());

app.get("/", (_, res) => {
    // Test data
    let testdata: CharacterData = JSON.parse(`{"weaponid": "sword", "statusid":["poisoning"], "passiveid": ["drug_residue"]}`);

    let bm: BattleManager = new BattleManager(testdata);
    bm.run();



    res.json({
        message: "Battle simulation successfully initialized.",
        playerhp: bm.player.hp,
        enemyhp: bm.enemy.hp,
        battlelog: bm.logger.battleLog
    })
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

    const drawnItems = Shop.draw(game.round);

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
        goods: data.equipmets
    }

    const saveCharacter = await prisma.character.create({
            data: {
                game_id: game.game_id,
                round: game.round,
                data: {
                    character_id: game.character_id,
                    curses: data.curses,
                    goods: data.equipmets
                }
            }
        });


    return;

    try {


        res.json({
            data: {
                uuid: newChar.game_id
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error failed to create character' });
    }
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
    console.log("Hello World!");
});
