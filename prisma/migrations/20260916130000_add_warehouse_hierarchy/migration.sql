-- CreateEnum
CREATE TYPE "StorageClass" AS ENUM ('LIGHT', 'MEDIUM', 'HEAVY');

-- CreateTable
CREATE TABLE "warehouse" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "storageClass" "StorageClass",
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "storageClass" "StorageClass",
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "zoneId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "storageClass" "StorageClass",
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack_level" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "rackId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "storageClass" "StorageClass",
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rack_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "rackLevelId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageClass" "StorageClass",
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_id_workspaceId_key" ON "warehouse"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_workspaceId_code_key" ON "warehouse"("workspaceId", "code");

-- CreateIndex
CREATE INDEX "warehouse_workspaceId_createdAt_idx" ON "warehouse"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "zone_id_workspaceId_key" ON "zone"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "zone_warehouseId_code_key" ON "zone"("warehouseId", "code");

-- CreateIndex
CREATE INDEX "zone_workspaceId_warehouseId_idx" ON "zone"("workspaceId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "rack_id_workspaceId_key" ON "rack"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "rack_zoneId_code_key" ON "rack"("zoneId", "code");

-- CreateIndex
CREATE INDEX "rack_workspaceId_zoneId_idx" ON "rack"("workspaceId", "zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "rack_level_id_workspaceId_key" ON "rack_level"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "rack_level_rackId_sequence_key" ON "rack_level"("rackId", "sequence");

-- CreateIndex
CREATE INDEX "rack_level_workspaceId_rackId_idx" ON "rack_level"("workspaceId", "rackId");

-- CreateIndex
CREATE UNIQUE INDEX "slot_workspaceId_code_key" ON "slot"("workspaceId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "slot_rackLevelId_code_key" ON "slot"("rackLevelId", "code");

-- CreateIndex
CREATE INDEX "slot_workspaceId_rackLevelId_idx" ON "slot"("workspaceId", "rackLevelId");

-- AddForeignKey
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone" ADD CONSTRAINT "zone_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone" ADD CONSTRAINT "zone_warehouseId_workspaceId_fkey" FOREIGN KEY ("warehouseId", "workspaceId") REFERENCES "warehouse"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack" ADD CONSTRAINT "rack_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack" ADD CONSTRAINT "rack_zoneId_workspaceId_fkey" FOREIGN KEY ("zoneId", "workspaceId") REFERENCES "zone"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_level" ADD CONSTRAINT "rack_level_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_level" ADD CONSTRAINT "rack_level_rackId_workspaceId_fkey" FOREIGN KEY ("rackId", "workspaceId") REFERENCES "rack"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot" ADD CONSTRAINT "slot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot" ADD CONSTRAINT "slot_rackLevelId_workspaceId_fkey" FOREIGN KEY ("rackLevelId", "workspaceId") REFERENCES "rack_level"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
