-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'READ_ONLY', 'PURGE_PENDING', 'PURGED');

-- CreateEnum
CREATE TYPE "AppLocale" AS ENUM ('VI', 'EN');

-- CreateEnum
CREATE TYPE "AppTheme" AS ENUM ('LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING_EMAIL');

-- CreateEnum
CREATE TYPE "SupportSessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace" (
    "id" UUID NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "displayName" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "locale" "AppLocale" NOT NULL DEFAULT 'VI',
    "theme" "AppTheme" NOT NULL DEFAULT 'LIGHT',
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ONBOARDING',
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "purgeAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_limit" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "graceDays" INTEGER NOT NULL DEFAULT 7,
    "warehouseLimit" INTEGER NOT NULL DEFAULT 1,
    "zonesPerWarehouseLimit" INTEGER NOT NULL DEFAULT 2,
    "racksPerZoneLimit" INTEGER NOT NULL DEFAULT 3,
    "levelsPerRackLimit" INTEGER NOT NULL DEFAULT 3,
    "slotsPerLevelLimit" INTEGER NOT NULL DEFAULT 2,
    "productLimit" INTEGER NOT NULL DEFAULT 20,
    "projectLimit" INTEGER NOT NULL DEFAULT 5,
    "partyProfileLimit" INTEGER NOT NULL DEFAULT 5,
    "supplierLimit" INTEGER NOT NULL DEFAULT 5,
    "commercialDocumentLimit" INTEGER NOT NULL DEFAULT 10,
    "inventoryTransactionLimit" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_limit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_record" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policyKey" TEXT NOT NULL,
    "policyVer" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_session" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "startedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SupportSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "workspaceId" UUID,
    "actorUserId" TEXT,
    "supportSessionId" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "result" "AuditResult" NOT NULL,
    "reason" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_setting" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedByUserId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_ownerUserId_key" ON "workspace"("ownerUserId");

-- CreateIndex
CREATE INDEX "workspace_status_expiresAt_idx" ON "workspace"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "workspace_status_purgeAt_idx" ON "workspace"("status", "purgeAt");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_limit_workspaceId_key" ON "workspace_limit"("workspaceId");

-- CreateIndex
CREATE INDEX "consent_record_workspaceId_type_recordedAt_idx" ON "consent_record"("workspaceId", "type", "recordedAt");

-- CreateIndex
CREATE INDEX "support_session_workspaceId_status_expiresAt_idx" ON "support_session"("workspaceId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "support_session_startedByUserId_startedAt_idx" ON "support_session"("startedByUserId", "startedAt");

-- CreateIndex
CREATE INDEX "audit_log_workspaceId_occurredAt_idx" ON "audit_log"("workspaceId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_log_actorUserId_occurredAt_idx" ON "audit_log"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_log_resource_resourceId_occurredAt_idx" ON "audit_log"("resource", "resourceId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_log_requestId_idx" ON "audit_log"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_setting_key_key" ON "platform_setting"("key");

-- CreateIndex
CREATE INDEX "platform_setting_updatedByUserId_idx" ON "platform_setting"("updatedByUserId");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- AddForeignKey
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_limit" ADD CONSTRAINT "workspace_limit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_record" ADD CONSTRAINT "consent_record_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_session" ADD CONSTRAINT "support_session_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_session" ADD CONSTRAINT "support_session_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_supportSessionId_fkey" FOREIGN KEY ("supportSessionId") REFERENCES "support_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_setting" ADD CONSTRAINT "platform_setting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
