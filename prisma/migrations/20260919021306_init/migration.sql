-- CreateTable
CREATE TABLE "Game" (
    "game_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "money" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("game_id")
);

-- CreateTable
CREATE TABLE "Character" (
    "game_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("game_id","round")
);

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "Game"("game_id") ON DELETE RESTRICT ON UPDATE CASCADE;
