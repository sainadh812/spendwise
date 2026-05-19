-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "period_type" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "month" INTEGER,
    "year" INTEGER NOT NULL,
    "stats" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "trends" JSONB NOT NULL,
    "anomalies" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "tx_count_at_generation" INTEGER NOT NULL,
    "tx_latest_at_generation" TIMESTAMP(3) NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gemini-2.5-pro',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Insight_year_month_idx" ON "Insight"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Insight_period_type_period_key_key" ON "Insight"("period_type", "period_key");
