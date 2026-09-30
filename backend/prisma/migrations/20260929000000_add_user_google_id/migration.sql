-- AlterTable
-- Google OAuth: identificador estável da conta Google (claim `sub` do ID token).
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
