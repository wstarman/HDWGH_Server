import express from "express";
import { PrismaClient } from '@prisma/client';
import type { Character } from "@prisma/client";
import { BattleManager } from "./battle/BattleManager.js";
import { Shop } from "./Shop.js";
import type { BattleLog } from "./battle/BattleLogger.js";

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

interface PlayerInfo{
    max_hp: number,
    hp: number
}

interface SimulationResult{
    result: string,
    time_spent: number,
    player_info: PlayerInfo
    enemy_info: PlayerInfo
    battle_log: BattleLog[]
}


app.use(express.json());

app.get("/", (_, res) => {
    // Test data
    let testCharacter: CharacterInitData = {
        character_id: "gambler",
        curses: [
            { "id": "cold_hand" },
            { "id": "wrong_bet" },
            { "id": "tilt" },
            { "id": "sunk_cost" },
            { "id": "gamblers_fallacy" },
            { "id": "total_ruin" },
        ],
        equipmets: [
            { "id": "ge1" },
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
            game_result: "continue",
            round: 1,
            life: 3
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
        let finalMoney = data.money
        let result = "continue";

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

            finalMoney += 20;
        }
        else if (bm.result == "lose") {
            finalHp -= 1;
            finalMoney += 25;
        }

        await prisma.game.update({
            where: {
                game_id: uuid,
            },
            data: {
                hp: finalHp,
                round: game.round + 1,
                money: finalMoney
            }
        });

        if (finalHp <= 0) {
            result = "lose";
        }
        else if (game.round == 6) {
            result = "win";
        }

        res.json({
            data: {
                player_character: init_data,
                opponent_character: enemy_data,
                battlelog: bm.logger.battleLog,
                battle_result: bm.result,
                game_result: result,
                round: game.round + 1,
                life: finalHp
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error failed to initialize battle' });
    }
});

app.post("/test", async (req, res) => {
    const { data } = req.body;

    const player = data.player_character

    const enemy = data.opponent_character

    const playerInitData: CharacterInitData = {
        character_id: player.character_id,
        curses: player.curses,
        equipmets: player.equipmets
    }

    const enemyInitData: CharacterInitData = {
        character_id: enemy.character_id,
        curses: enemy.curses,
        equipmets: enemy.equipmets
    }

    try {
        let simulationResult: SimulationResult[] = []

        for (let round = 0; round < data.simulation_round; round++) {
            let bm: BattleManager = new BattleManager(playerInitData, enemyInitData)
            bm.run()

            console.log(bm.result)

            let result: SimulationResult = {
                result: bm.result,
                time_spent: bm.elapsedTime,
                player_info: {
                    max_hp: bm.player.maxHp,
                    hp: bm.player.hp
                },
                enemy_info: {
                    max_hp: bm.enemy.maxHp,
                    hp: bm.enemy.hp
                },
                battle_log: bm.logger.battleLog
            }
            
            simulationResult.push(result)
        }
        
        res.json({
            data: {
                player_character: playerInitData,
                opponent_character: enemyInitData,
                simulation_results: simulationResult,
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
