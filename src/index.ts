import express from "express";
import { PrismaClient } from '@prisma/client';
import { BattleManager } from "./battle/BattleManager.js";
import type { CharacterData } from "./battle/BattleManager.js";
import { Shop } from "./Shop.js";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/", (_, res) => {
    // Test data
    let testdata: CharacterData = JSON.parse(`{"weaponid": "sword", "statusid":["poisoning"], "passiveid": ["drug_resistance"]}`);

    let bm: BattleManager = new BattleManager(testdata);
    bm.run();



    res.json({
        message: "Battle simulation successfully initialized.",
        playerhp: bm.player.hp,
        enemyhp: bm.enemy.hp,
        battlelog: bm.battleLogger.BattleLog
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
        const newChar = await prisma.game.create({
            data: {
                character_id: character_id,
                round: 1,
                hp: 3,
                money: 100
            }
        });

        console.log(1);

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

    const drawnGoods = Shop.draw(game.round);

    res.json({
        data: {
            money: game.money,
            curses: [
                [
                    { id: "phantom_dose" },
                    { id: "overbright_eyes" },
                    { id: "hollow_vessel" },
                ],
            ],
            goods: [
                drawnGoods
            ]
        }
    });
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
    console.log("Hello World!");
});
