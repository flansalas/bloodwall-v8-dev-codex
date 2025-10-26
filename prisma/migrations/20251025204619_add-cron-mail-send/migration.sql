-- CreateTable
CREATE TABLE "CronMailSend" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronMailSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronMailSend_dayKey_idx" ON "CronMailSend"("dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "CronMailSend_job_recipient_dayKey_key" ON "CronMailSend"("job", "recipient", "dayKey");
