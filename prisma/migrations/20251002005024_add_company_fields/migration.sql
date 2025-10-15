/*
  Warnings:

  - You are about to drop the column `assigneeId` on the `Action` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Action` table. All the data in the column will be lost.
  - You are about to drop the column `costImpactScale` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `mamDayOfWeek` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `mamTime` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `reportsJson` on the `Metric` table. All the data in the column will be lost.
  - Added the required column `ownerId` to the `Action` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text` to the `Action` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastWeek` to the `Metric` table without a default value. This is not possible if the table is not empty.
  - Made the column `baseline` on table `Metric` required. This step will fail if there are existing NULL values in that column.
  - Made the column `current` on table `Metric` required. This step will fail if there are existing NULL values in that column.
  - Made the column `goal` on table `Metric` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `TeamMember` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "udeId" INTEGER NOT NULL,
    CONSTRAINT "ActivityLog_udeId_fkey" FOREIGN KEY ("udeId") REFERENCES "UDE" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Action" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" DATETIME,
    "udeId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Action_udeId_fkey" FOREIGN KEY ("udeId") REFERENCES "UDE" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Action_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Action" ("createdAt", "dueDate", "id", "status", "udeId", "updatedAt") SELECT "createdAt", "dueDate", "id", "status", "udeId", "updatedAt" FROM "Action";
DROP TABLE "Action";
ALTER TABLE "new_Action" RENAME TO "Action";
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Category_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("companyId", "id", "name") SELECT "companyId", "id", "name" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_companyId_name_key" ON "Category"("companyId", "name");
CREATE TABLE "new_Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "industry" TEXT,
    "loopStatement" TEXT,
    "rhythmCadence" TEXT,
    "rhythmDay" TEXT,
    "rhythmTime" TEXT,
    "currency" TEXT DEFAULT 'USD',
    "reviewWindow" TEXT,
    "addOnAiCoach" BOOLEAN NOT NULL DEFAULT false,
    "lastSetupCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Company" ("createdAt", "currency", "id", "logoUrl", "name", "updatedAt") SELECT "createdAt", "currency", "id", "logoUrl", "name", "updatedAt" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE TABLE "new_Metric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "baseline" REAL NOT NULL,
    "goal" REAL NOT NULL,
    "current" REAL NOT NULL,
    "lastWeek" REAL NOT NULL,
    "udeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Metric_udeId_fkey" FOREIGN KEY ("udeId") REFERENCES "UDE" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Metric" ("baseline", "createdAt", "current", "goal", "id", "name", "udeId", "updatedAt") SELECT "baseline", "createdAt", "current", "goal", "id", "name", "udeId", "updatedAt" FROM "Metric";
DROP TABLE "Metric";
ALTER TABLE "new_Metric" RENAME TO "Metric";
CREATE TABLE "new_TeamMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'COLLAB',
    "avatarUrl" TEXT,
    "companyId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TeamMember" ("avatarUrl", "companyId", "email", "id", "name", "role") SELECT "avatarUrl", "companyId", "email", "id", "name", "role" FROM "TeamMember";
DROP TABLE "TeamMember";
ALTER TABLE "new_TeamMember" RENAME TO "TeamMember";
CREATE UNIQUE INDEX "TeamMember_email_key" ON "TeamMember"("email");
CREATE UNIQUE INDEX "TeamMember_companyId_name_key" ON "TeamMember"("companyId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
