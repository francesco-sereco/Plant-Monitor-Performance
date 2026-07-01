-- CreateEnum
CREATE TYPE "SystemCheckStatus" AS ENUM ('ok', 'error');

-- CreateTable
CREATE TABLE "system_checks" (
    "id" TEXT NOT NULL,
    "check_key" TEXT NOT NULL,
    "status" "SystemCheckStatus" NOT NULL,
    "note" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_checks_check_key_key" ON "system_checks"("check_key");

-- RLS: solo ruolo Prisma pmp_app (API backend)
ALTER TABLE "system_checks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pmp_app_all" ON "system_checks" FOR ALL TO pmp_app USING (true) WITH CHECK (true);
