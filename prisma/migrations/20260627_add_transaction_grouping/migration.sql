-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "group_id" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_group_id_idx" ON "Transaction"("group_id");
