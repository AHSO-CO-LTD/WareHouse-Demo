import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { InventoryDocumentType } from "@/generated/prisma/enums";
import { db } from "@/lib/server/db";
import { assertWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

type DecimalInput = string;
const NO_LOT_KEY = "__NO_LOT__";

export class InventoryDomainError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

type InventoryLineInput = { productId: string; lotId?: string; slotId: string; unitId: string; quantity: DecimalInput };

function positiveDecimal(value: string) {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,8})?$/.test(normalized) || Number(normalized) <= 0) throw new InventoryDomainError("QUANTITY_INVALID", "Số lượng phải lớn hơn 0.");
  return normalized;
}

async function getWorkspace(userId: string) {
  const workspace = await db.workspace.findUnique({ where: { ownerUserId: userId }, include: { limits: true } });
  if (!workspace) throw new InventoryDomainError("WORKSPACE_NOT_FOUND", "Không tìm thấy không gian kho.");
  assertWorkspaceWritable(workspace);
  if (!workspace.limits) throw new InventoryDomainError("WORKSPACE_LIMITS_MISSING", "Thiếu cấu hình hạn mức kho.");
  return { ...workspace, limits: workspace.limits };
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await operation(); } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if ((code !== "P2034" && code !== "P2002") || attempt === 2) throw error;
    }
  }
  throw new InventoryDomainError("CONCURRENCY_CONFLICT", "Dữ liệu vừa thay đổi. Vui lòng thử lại.");
}

export async function postInventoryDocument(input: { actorUserId: string; type: InventoryDocumentType; idempotencyKey: string; lines: InventoryLineInput[] }) {
  if (input.lines.length < 1 || input.lines.length > 20) throw new InventoryDomainError("LINES_INVALID", "Phiếu cần từ 1 đến 20 dòng hàng.");
  const workspace = await getWorkspace(input.actorUserId);

  return withRetry(() => db.$transaction(async (transaction) => {
    const existing = await transaction.inventoryDocument.findFirst({ where: { workspaceId: workspace.id, idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
    const count = await transaction.inventoryDocument.count({ where: { workspaceId: workspace.id } });
    if (count >= workspace.limits.inventoryTransactionLimit) throw new InventoryDomainError("QUOTA_EXCEEDED", "Đã đạt hạn mức giao dịch tồn kho của bản dùng thử.");
    const maximum = await transaction.inventoryDocument.aggregate({ where: { workspaceId: workspace.id }, _max: { sequence: true } });
    const sequence = (maximum._max.sequence ?? 0) + 1;
    const document = await transaction.inventoryDocument.create({ data: { workspaceId: workspace.id, sequence, code: `INV-${String(sequence).padStart(4, "0")}`, type: input.type, idempotencyKey: input.idempotencyKey, actorUserId: input.actorUserId } });

    for (const [index, source] of input.lines.entries()) {
      const quantity = positiveDecimal(source.quantity);
      const [product, slot] = await Promise.all([
        transaction.product.findFirst({ where: { id: source.productId, workspaceId: workspace.id, status: "ACTIVE" }, include: { baseUnit: true, conversions: { include: { unit: true } } } }),
        transaction.slot.findFirst({ where: { id: source.slotId, workspaceId: workspace.id } }),
      ]);
      if (!product) throw new InventoryDomainError("PRODUCT_NOT_FOUND", "Sản phẩm không hợp lệ hoặc đã ngừng dùng.");
      if (!slot) throw new InventoryDomainError("SLOT_NOT_FOUND", "Ô chứa không hợp lệ.");
      const conversion = product.conversions.find((candidate) => candidate.unitId === source.unitId);
      const selectedUnit = source.unitId === product.baseUnitId
        ? { id: product.baseUnit.id, code: product.baseUnit.code, name: product.baseUnit.name, factor: "1" }
        : conversion ? { id: conversion.unit.id, code: conversion.unit.code, name: conversion.unit.name, factor: conversion.factor.toString() } : null;
      if (!selectedUnit) throw new InventoryDomainError("UNIT_CONVERSION_INVALID", "Đơn vị không thuộc sản phẩm này.");
      const lot = source.lotId ? await transaction.inventoryLot.findFirst({ where: { id: source.lotId, workspaceId: workspace.id, productId: product.id } }) : null;
      if (source.lotId && !lot) throw new InventoryDomainError("LOT_INVALID", "Lô hàng không thuộc sản phẩm đã chọn.");
      const factor = selectedUnit.factor;
      const baseQuantity = new Prisma.Decimal(quantity).mul(new Prisma.Decimal(factor)).toFixed(8);
      const lotKey = lot?.id ?? NO_LOT_KEY;
      const signedQuantity = input.type === "ISSUE" ? `-${baseQuantity}` : baseQuantity;
      if (input.type === "ISSUE") {
        const updated = await transaction.inventoryBalance.updateMany({ where: { workspaceId: workspace.id, productId: product.id, lotKey, slotId: slot.id, status: "AVAILABLE", quantity: { gte: baseQuantity } }, data: { quantity: { decrement: baseQuantity }, version: { increment: 1 } } });
        if (updated.count !== 1) throw new InventoryDomainError("INSUFFICIENT_STOCK", `Tồn tại ${slot.code} không đủ để xuất ${product.name}.`);
      } else {
        await transaction.inventoryBalance.upsert({ where: { workspaceId_productId_lotKey_slotId_status: { workspaceId: workspace.id, productId: product.id, lotKey, slotId: slot.id, status: "AVAILABLE" } }, create: { workspaceId: workspace.id, productId: product.id, lotId: lot?.id, lotKey, slotId: slot.id, quantity: baseQuantity }, update: { quantity: { increment: baseQuantity }, version: { increment: 1 } } });
      }
      const line = await transaction.inventoryDocumentLine.create({ data: { workspaceId: workspace.id, documentId: document.id, lineNumber: index + 1, productId: product.id, lotId: lot?.id, slotId: slot.id, inputUnitId: selectedUnit.id, inputUnitCode: selectedUnit.code, inputUnitName: selectedUnit.name, conversionFactor: factor, inputQuantity: quantity, baseQuantity, unitCost: product.currentCost } });
      await transaction.inventoryLedgerEntry.create({ data: { workspaceId: workspace.id, documentLineId: line.id, productId: product.id, lotId: lot?.id, slotId: slot.id, signedBaseQuantity: signedQuantity } });
    }
    await transaction.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "inventory.document.post", resource: "inventory_document", resourceId: document.id, result: "SUCCESS", after: { code: document.code, type: document.type, lineCount: input.lines.length } } });
    return document;
  }, { isolationLevel: "Serializable" }));
}
