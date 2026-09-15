-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "TransactionalEmailType" AS ENUM ('EMAIL_VERIFIED_WELCOME', 'DEMO_ACTIVATED', 'PASSWORD_CHANGED');

-- AlterTable
ALTER TABLE "user"
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "companyName" TEXT,
ADD COLUMN "dateOfBirth" DATE,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT,
ADD COLUMN "privacyVersion" TEXT,
ADD COLUMN "marketingEmailConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "email_delivery" (
    "id" UUID NOT NULL,
    "userId" TEXT,
    "workspaceId" UUID,
    "recipient" TEXT NOT NULL,
    "type" "TransactionalEmailType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");

-- Enforce case-insensitive email uniqueness even if a future write bypasses Better Auth normalization.
CREATE UNIQUE INDEX "user_email_normalized_key" ON "user"(LOWER("email"));

-- CreateIndex
CREATE UNIQUE INDEX "email_delivery_idempotencyKey_key" ON "email_delivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "email_delivery_status_createdAt_idx" ON "email_delivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "email_delivery_userId_type_createdAt_idx" ON "email_delivery"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "email_delivery_workspaceId_type_createdAt_idx" ON "email_delivery"("workspaceId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
