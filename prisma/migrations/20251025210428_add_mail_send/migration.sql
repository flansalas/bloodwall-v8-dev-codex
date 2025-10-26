-- CreateTable
CREATE TABLE "MailSend" (
    "id" SERIAL NOT NULL,
    "job" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mail_once_per_day" ON "MailSend"("job", "email", "dateKey");
