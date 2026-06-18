import express from "express";
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get("/", (_, res) => {
  const animationData = {
    time: 10,
    attacker: 0,
    damage: {
      type: "fire",
      amount: 20
    },
    receiver: 1
  }
  res.send("hello");
});

app.get("/Character/:id", async (req, res) => {
  const {id} = req.params;

  console.log(id);

  try{
    const character = await prisma.character.findUnique({
      where: { id: parseInt(id) }
    });

    if(character) res.json(character);
    else res.status(404).json({ error: 'Character not found' });
  }
  catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post("/post", async (req, res) => {
  const { name, key } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const newTest = await prisma.test.create({
      data: {
        name: name,
        key: key
      }
    });

    // Respond with the newly created character (status 201 Created)
    res.status(201).json(newTest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error failed to create test' });
  } 
});


app.listen(3000, () => {
  console.log("Hello World!");
});
