-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "recoverable_amount" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN "counterparty" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "recovery_status" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_recovery_status_counterparty_idx" ON "Transaction"("recovery_status", "counterparty");

-- CreateTable
CREATE TABLE "Repayment" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Repayment_transaction_id_idx" ON "Repayment"("transaction_id");

-- AddForeignKey
ALTER TABLE "Repayment" ADD CONSTRAINT "Repayment_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
