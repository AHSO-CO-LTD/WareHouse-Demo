-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "unit" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "barcode" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseUnitId" UUID NOT NULL,
    "currentCost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_unit_conversion" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "factor" DECIMAL(24,8) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_unit_conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_lot" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "supplierLotCode" TEXT,
    "manufacturedAt" DATE,
    "expiresAt" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_cost_history" (
    "id" BIGSERIAL NOT NULL,
    "workspaceId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "actorUserId" TEXT,
    "previousCost" DECIMAL(18,2),
    "nextCost" DECIMAL(18,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_cost_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unit_workspaceId_createdAt_idx" ON "unit"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "unit_id_workspaceId_key" ON "unit"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "unit_workspaceId_code_key" ON "unit"("workspaceId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "unit_workspaceId_name_key" ON "unit"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "product_workspaceId_status_createdAt_idx" ON "product"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_id_workspaceId_key" ON "product"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "product_workspaceId_code_key" ON "product"("workspaceId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "product_workspaceId_name_key" ON "product"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "product_workspaceId_barcode_key" ON "product"("workspaceId", "barcode");

-- CreateIndex
CREATE INDEX "product_unit_conversion_workspaceId_productId_idx" ON "product_unit_conversion"("workspaceId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_unit_conversion_productId_unitId_key" ON "product_unit_conversion"("productId", "unitId");

-- CreateIndex
CREATE INDEX "inventory_lot_workspaceId_productId_expiresAt_idx" ON "inventory_lot"("workspaceId", "productId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_lot_id_workspaceId_key" ON "inventory_lot"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_lot_workspaceId_code_key" ON "inventory_lot"("workspaceId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_lot_productId_sequence_key" ON "inventory_lot"("productId", "sequence");

-- CreateIndex
CREATE INDEX "product_cost_history_workspaceId_productId_occurredAt_idx" ON "product_cost_history"("workspaceId", "productId", "occurredAt");

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_baseUnitId_workspaceId_fkey" FOREIGN KEY ("baseUnitId", "workspaceId") REFERENCES "unit"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_unit_conversion" ADD CONSTRAINT "product_unit_conversion_productId_workspaceId_fkey" FOREIGN KEY ("productId", "workspaceId") REFERENCES "product"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_unit_conversion" ADD CONSTRAINT "product_unit_conversion_unitId_workspaceId_fkey" FOREIGN KEY ("unitId", "workspaceId") REFERENCES "unit"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lot" ADD CONSTRAINT "inventory_lot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lot" ADD CONSTRAINT "inventory_lot_productId_workspaceId_fkey" FOREIGN KEY ("productId", "workspaceId") REFERENCES "product"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_productId_workspaceId_fkey" FOREIGN KEY ("productId", "workspaceId") REFERENCES "product"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_cost_history" ADD CONSTRAINT "product_cost_history_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
