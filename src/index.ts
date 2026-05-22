import express from "express";
import { PrismaClient } from '@prisma/client';


const app = express();
const prisma = new PrismaClient();

app.get("/", (_, res) => {
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

app.listen(3000, () => {
  console.log("Hello World!");
});
