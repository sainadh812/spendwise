-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "merchant" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "is_cc_payment" BOOLEAN NOT NULL DEFAULT false,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "needs_review" BOOLEAN NOT NULL DEFAULT true,
    "email_message_id" TEXT,
    "remarks" TEXT,
    "source" TEXT NOT NULL DEFAULT 'email',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkippedEmail" (
    "id" TEXT NOT NULL,
    "email_message_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "body_snippet" TEXT NOT NULL,
    "ai_reason" TEXT,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkippedEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_email_message_id_key" ON "Transaction"("email_message_id");

-- CreateIndex
CREATE INDEX "idx_dedup" ON "Transaction"("amount", "merchant", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SkippedEmail_email_message_id_key" ON "SkippedEmail"("email_message_id");
