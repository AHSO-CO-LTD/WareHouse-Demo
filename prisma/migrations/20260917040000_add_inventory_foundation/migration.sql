CREATE TYPE "InventoryDocumentType" AS ENUM ('OPENING', 'RECEIPT', 'ISSUE');
CREATE TYPE "InventoryBalanceStatus" AS ENUM ('AVAILABLE');

CREATE TABLE "inventory_document" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "type" "InventoryDocumentType" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_document_line" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "productId" UUID NOT NULL,
    "lotId" UUID,
    "slotId" UUID NOT NULL,
    "inputUnitId" UUID NOT NULL,
    "inputUnitCode" TEXT NOT NULL,
    "inputUnitName" TEXT NOT NULL,
    "conversionFactor" DECIMAL(24,8) NOT NULL,
    "inputQuantity" DECIMAL(24,8) NOT NULL,
    "baseQuantity" DECIMAL(24,8) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_document_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_ledger_entry" (
    "id" BIGSERIAL NOT NULL,
    "workspaceId" UUID NOT NULL,
    "documentLineId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "lotId" UUID,
    "slotId" UUID NOT NULL,
    "status" "InventoryBalanceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "signedBaseQuantity" DECIMAL(24,8) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_ledger_entry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_balance" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "lotId" UUID,
    "lotKey" TEXT NOT NULL,
    "slotId" UUID NOT NULL,
    "status" "InventoryBalanceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "quantity" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inventory_balance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "slot_id_workspaceId_key" ON "slot"("id", "workspaceId");
CREATE UNIQUE INDEX "inventory_document_id_workspaceId_key" ON "inventory_document"("id", "workspaceId");
CREATE UNIQUE INDEX "inventory_document_workspaceId_sequence_key" ON "inventory_document"("workspaceId", "sequence");
CREATE UNIQUE INDEX "inventory_document_workspaceId_code_key" ON "inventory_document"("workspaceId", "code");
CREATE UNIQUE INDEX "inventory_document_workspaceId_idempotencyKey_key" ON "inventory_document"("workspaceId", "idempotencyKey");
CREATE UNIQUE INDEX "inventory_document_line_id_workspaceId_key" ON "inventory_document_line"("id", "workspaceId");
CREATE UNIQUE INDEX "inventory_document_line_documentId_lineNumber_key" ON "inventory_document_line"("documentId", "lineNumber");
CREATE UNIQUE INDEX "inventory_ledger_entry_documentLineId_workspaceId_key" ON "inventory_ledger_entry"("documentLineId", "workspaceId");
CREATE UNIQUE INDEX "inventory_balance_workspaceId_productId_lotKey_slotId_status_key" ON "inventory_balance"("workspaceId", "productId", "lotKey", "slotId", "status");
CREATE INDEX "inventory_document_workspaceId_type_postedAt_idx" ON "inventory_document"("workspaceId", "type", "postedAt");
CREATE INDEX "inventory_document_line_workspaceId_productId_slotId_idx" ON "inventory_document_line"("workspaceId", "productId", "slotId");
CREATE INDEX "inventory_ledger_entry_workspaceId_productId_lotId_slotId_occurredAt_idx" ON "inventory_ledger_entry"("workspaceId", "productId", "lotId", "slotId", "occurredAt");
CREATE INDEX "inventory_ledger_entry_workspaceId_slotId_occurredAt_idx" ON "inventory_ledger_entry"("workspaceId", "slotId", "occurredAt");
CREATE INDEX "inventory_balance_workspaceId_productId_status_idx" ON "inventory_balance"("workspaceId", "productId", "status");
CREATE INDEX "inventory_balance_workspaceId_slotId_status_idx" ON "inventory_balance"("workspaceId", "slotId", "status");

ALTER TABLE "inventory_document" ADD CONSTRAINT "inventory_document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_document" ADD CONSTRAINT "inventory_document_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_document_line" ADD CONSTRAINT "inventory_document_line_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_document_line" ADD CONSTRAINT "inventory_document_line_documentId_workspaceId_fkey" FOREIGN KEY ("documentId", "workspaceId") REFERENCES "inventory_document"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_document_line" ADD CONSTRAINT "inventory_document_line_productId_workspaceId_fkey" FOREIGN KEY ("productId", "workspaceId") REFERENCES "product"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_document_line" ADD CONSTRAINT "inventory_document_line_lotId_workspaceId_fkey" FOREIGN KEY ("lotId", "workspaceId") REFERENCES "inventory_lot"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_document_line" ADD CONSTRAINT "inventory_document_line_slotId_workspaceId_fkey" FOREIGN KEY ("slotId", "workspaceId") REFERENCES "slot"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_document_line" ADD CONSTRAINT "inventory_document_line_inputUnitId_workspaceId_fkey" FOREIGN KEY ("inputUnitId", "workspaceId") REFERENCES "unit"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_ledger_entry" ADD CONSTRAINT "inventory_ledger_entry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_ledger_entry" ADD CONSTRAINT "inventory_ledger_entry_documentLineId_workspaceId_fkey" FOREIGN KEY ("documentLineId", "workspaceId") REFERENCES "inventory_document_line"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_ledger_entry" ADD CONSTRAINT "inventory_ledger_entry_productId_workspaceId_fkey" FOREIGN KEY ("productId", "workspaceId") REFERENCES "product"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_ledger_entry" ADD CONSTRAINT "inventory_ledger_entry_lotId_workspaceId_fkey" FOREIGN KEY ("lotId", "workspaceId") REFERENCES "inventory_lot"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_ledger_entry" ADD CONSTRAINT "inventory_ledger_entry_slotId_workspaceId_fkey" FOREIGN KEY ("slotId", "workspaceId") REFERENCES "slot"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_balance" ADD CONSTRAINT "inventory_balance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_balance" ADD CONSTRAINT "inventory_balance_productId_workspaceId_fkey" FOREIGN KEY ("productId", "workspaceId") REFERENCES "product"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_balance" ADD CONSTRAINT "inventory_balance_lotId_workspaceId_fkey" FOREIGN KEY ("lotId", "workspaceId") REFERENCES "inventory_lot"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_balance" ADD CONSTRAINT "inventory_balance_slotId_workspaceId_fkey" FOREIGN KEY ("slotId", "workspaceId") REFERENCES "slot"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;
