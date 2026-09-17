import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ProductStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/server/db";
import { assertWorkspaceWritable } from "@/lib/server/workspace-lifecycle";

type DecimalInput = string;

export class CatalogDomainError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

function normalizeCode(value: string, label: string) {
  const code = value.trim().toUpperCase();
  if (!code) throw new CatalogDomainError("CODE_REQUIRED", `${label} là bắt buộc.`);
  return code;
}

function normalizeOptional(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function assertPositiveDecimal(value: DecimalInput, label: string) {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,8})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new CatalogDomainError("DECIMAL_INVALID", `${label} phải lớn hơn 0.`);
  }
  return normalized;
}

function assertNonNegativeMoney(value: DecimalInput) {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) < 0) {
    throw new CatalogDomainError("COST_INVALID", "Giá vốn phải là số tiền từ 0 trở lên.");
  }
  return normalized;
}

function assertLotDates(manufacturedAt: Date | null, expiresAt: Date | null) {
  if (manufacturedAt && expiresAt && expiresAt < manufacturedAt) {
    throw new CatalogDomainError("LOT_DATE_INVALID", "Hạn sử dụng phải sau hoặc bằng ngày sản xuất.");
  }
}

async function getWorkspace(userId: string) {
  const workspace = await db.workspace.findUnique({
    where: { ownerUserId: userId },
    include: { limits: true },
  });

  if (!workspace) throw new CatalogDomainError("WORKSPACE_NOT_FOUND", "Không tìm thấy không gian kho.");
  assertWorkspaceWritable(workspace);
  if (!workspace.limits) throw new CatalogDomainError("WORKSPACE_LIMITS_MISSING", "Thiếu cấu hình hạn mức kho.");
  return { ...workspace, limits: workspace.limits };
}

async function writeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new CatalogDomainError("CONCURRENCY_CONFLICT", "Dữ liệu vừa thay đổi. Vui lòng mở lại và thử lại.");
}

function mapDatabaseError(error: unknown): never {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "P2002") {
    throw new CatalogDomainError("DUPLICATE_VALUE", "Mã, tên hoặc mã quét đã tồn tại trong không gian kho này.");
  }
  if (code === "P2003") {
    throw new CatalogDomainError("DEPENDENCY_EXISTS", "Không thể thực hiện vì dữ liệu này đang được sử dụng.");
  }
  throw error;
}

async function requireUnit(transaction: Prisma.TransactionClient, workspaceId: string, unitId: string) {
  const unit = await transaction.unit.findFirst({
    where: { id: unitId, workspaceId },
    select: { id: true, code: true, name: true },
  });
  if (!unit) throw new CatalogDomainError("UNIT_NOT_FOUND", "Không tìm thấy đơn vị tính.");
  return unit;
}

async function nextUnitIdentity(transaction: Prisma.TransactionClient, workspaceId: string) {
  const maximum = await transaction.unit.aggregate({ where: { workspaceId }, _max: { sequence: true } });
  let sequence = (maximum._max.sequence ?? 0) + 1;

  while (true) {
    const code = `UOM-${String(sequence).padStart(3, "0")}`;
    const existingCode = await transaction.unit.findFirst({ where: { workspaceId, code }, select: { id: true } });
    if (!existingCode) return { sequence, code };
    sequence += 1;
  }
}

async function requireProduct(transaction: Prisma.TransactionClient, workspaceId: string, productId: string) {
  const product = await transaction.product.findFirst({
    where: { id: productId, workspaceId },
    select: { id: true, code: true, name: true, baseUnitId: true, currentCost: true, version: true },
  });
  if (!product) throw new CatalogDomainError("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm.");
  return product;
}

type ProductConversionInput = {
  id?: string;
  version?: number;
  unitId: string;
  factor: DecimalInput;
};

function normalizeProductConversions(inputs: ProductConversionInput[], baseUnitId: string) {
  const unitIds = new Set<string>();
  return inputs.map((input) => {
    if (input.unitId === baseUnitId) throw new CatalogDomainError("BASE_UNIT_CONVERSION", "Đơn vị cơ bản không thể đồng thời là đơn vị quy đổi.");
    if (unitIds.has(input.unitId)) throw new CatalogDomainError("DUPLICATE_CONVERSION_UNIT", "Mỗi đơn vị quy đổi chỉ được dùng một lần cho sản phẩm.");
    unitIds.add(input.unitId);
    return { ...input, factor: assertPositiveDecimal(input.factor, "Hệ số quy đổi") };
  });
}

export async function createUnit(input: { actorUserId: string; name: string }) {
  const workspace = await getWorkspace(input.actorUserId);
  const name = input.name.trim();
  if (name.length < 1) throw new CatalogDomainError("UNIT_NAME_REQUIRED", "Tên đơn vị là bắt buộc.");

  try {
    return await writeWithRetry(() => db.$transaction(async (transaction) => {
      const { sequence, code } = await nextUnitIdentity(transaction, workspace.id);
      const unit = await transaction.unit.create({ data: { workspaceId: workspace.id, sequence, code, name } });
      await transaction.auditLog.create({
        data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.unit.create", resource: "unit", resourceId: unit.id, result: "SUCCESS", after: { code, name } },
      });
      return unit;
    }, { isolationLevel: "Serializable" }));
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function updateUnit(input: { actorUserId: string; id: string; version: number; name: string }) {
  const workspace = await getWorkspace(input.actorUserId);
  const name = input.name.trim();
  if (name.length < 1) throw new CatalogDomainError("UNIT_NAME_REQUIRED", "Tên đơn vị là bắt buộc.");

  try {
    await writeWithRetry(() => db.$transaction(async (transaction) => {
      const current = await transaction.unit.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
      if (!current) throw new CatalogDomainError("UNIT_NOT_FOUND", "Không tìm thấy đơn vị tính.");
      const updated = await transaction.unit.updateMany({
        where: { id: current.id, workspaceId: workspace.id, version: input.version },
        data: { name, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new CatalogDomainError("CONCURRENCY_CONFLICT", "Đơn vị vừa thay đổi. Vui lòng mở lại và thử lại.");
      await transaction.auditLog.create({
        data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.unit.update", resource: "unit", resourceId: current.id, result: "SUCCESS", before: { code: current.code, name: current.name }, after: { code: current.code, name } },
      });
    }, { isolationLevel: "Serializable" }));
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function deleteUnit(input: { actorUserId: string; id: string }) {
  const workspace = await getWorkspace(input.actorUserId);
  await writeWithRetry(() => db.$transaction(async (transaction) => {
    const unit = await transaction.unit.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
    if (!unit) throw new CatalogDomainError("UNIT_NOT_FOUND", "Không tìm thấy đơn vị tính.");
    const [baseProductCount, conversionCount, inventoryLineCount] = await Promise.all([
      transaction.product.count({ where: { workspaceId: workspace.id, baseUnitId: unit.id } }),
      transaction.productUnitConversion.count({ where: { workspaceId: workspace.id, unitId: unit.id } }),
      transaction.inventoryDocumentLine.count({ where: { workspaceId: workspace.id, inputUnitId: unit.id } }),
    ]);
    if (baseProductCount + conversionCount + inventoryLineCount > 0) throw new CatalogDomainError("UNIT_IN_USE", "Không thể xóa đơn vị đang được sản phẩm hoặc phiếu tồn kho sử dụng.");
    await transaction.unit.delete({ where: { id: unit.id } });
    await transaction.auditLog.create({
      data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.unit.delete", resource: "unit", resourceId: unit.id, result: "SUCCESS", before: { code: unit.code, name: unit.name } },
    });
  }, { isolationLevel: "Serializable" }));
}

export async function createProduct(input: { actorUserId: string; code: string; name: string; description?: string; barcode?: string; baseUnitId: string; currentCost: DecimalInput; status: ProductStatus; conversions?: ProductConversionInput[] }) {
  const workspace = await getWorkspace(input.actorUserId);
  const code = normalizeCode(input.code, "Mã sản phẩm");
  const name = input.name.trim();
  const currentCost = assertNonNegativeMoney(input.currentCost);
  const conversions = normalizeProductConversions(input.conversions ?? [], input.baseUnitId);
  if (name.length < 2) throw new CatalogDomainError("PRODUCT_NAME_REQUIRED", "Tên sản phẩm phải có ít nhất 2 ký tự.");

  try {
    return await writeWithRetry(() => db.$transaction(async (transaction) => {
      const count = await transaction.product.count({ where: { workspaceId: workspace.id } });
      if (count >= workspace.limits.productLimit) throw new CatalogDomainError("QUOTA_EXCEEDED", "Đã đạt hạn mức sản phẩm của bản dùng thử.");
      await requireUnit(transaction, workspace.id, input.baseUnitId);
      await Promise.all(conversions.map((conversion) => requireUnit(transaction, workspace.id, conversion.unitId)));
      const product = await transaction.product.create({
        data: { workspaceId: workspace.id, code, name, description: normalizeOptional(input.description), barcode: normalizeOptional(input.barcode), baseUnitId: input.baseUnitId, currentCost, status: input.status },
      });
      if (conversions.length > 0) {
        await transaction.productUnitConversion.createMany({
          data: conversions.map((conversion) => ({ workspaceId: workspace.id, productId: product.id, unitId: conversion.unitId, factor: conversion.factor })),
        });
      }
      await transaction.productCostHistory.create({ data: { workspaceId: workspace.id, productId: product.id, actorUserId: input.actorUserId, previousCost: null, nextCost: currentCost } });
      await transaction.auditLog.create({
        data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.product.create", resource: "product", resourceId: product.id, result: "SUCCESS", after: { code, name, baseUnitId: input.baseUnitId, currentCost, status: input.status, conversions: conversions.map(({ unitId, factor }) => ({ unitId, factor })) } },
      });
      return product;
    }, { isolationLevel: "Serializable" }));
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function updateProduct(input: { actorUserId: string; id: string; version: number; code: string; name: string; description?: string; barcode?: string; baseUnitId: string; currentCost: DecimalInput; status: ProductStatus; conversions?: ProductConversionInput[] }) {
  const workspace = await getWorkspace(input.actorUserId);
  const code = normalizeCode(input.code, "Mã sản phẩm");
  const name = input.name.trim();
  const currentCost = assertNonNegativeMoney(input.currentCost);
  const conversions = normalizeProductConversions(input.conversions ?? [], input.baseUnitId);
  if (name.length < 2) throw new CatalogDomainError("PRODUCT_NAME_REQUIRED", "Tên sản phẩm phải có ít nhất 2 ký tự.");

  try {
    await writeWithRetry(() => db.$transaction(async (transaction) => {
      const current = await requireProduct(transaction, workspace.id, input.id);
      await requireUnit(transaction, workspace.id, input.baseUnitId);
      await Promise.all(conversions.map((conversion) => requireUnit(transaction, workspace.id, conversion.unitId)));
      const currentConversions = await transaction.productUnitConversion.findMany({ where: { workspaceId: workspace.id, productId: current.id } });
      const currentConversionsById = new Map(currentConversions.map((conversion) => [conversion.id, conversion]));
      const incomingIds = new Set<string>();
      for (const conversion of conversions) {
        if (!conversion.id) continue;
        const existing = currentConversionsById.get(conversion.id);
        if (!existing || !conversion.version) throw new CatalogDomainError("CONVERSION_NOT_FOUND", "Không tìm thấy quy đổi đơn vị cần cập nhật.");
        incomingIds.add(existing.id);
      }
      const updated = await transaction.product.updateMany({
        where: { id: current.id, workspaceId: workspace.id, version: input.version },
        data: { code, name, description: normalizeOptional(input.description), barcode: normalizeOptional(input.barcode), baseUnitId: input.baseUnitId, currentCost, status: input.status, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new CatalogDomainError("CONCURRENCY_CONFLICT", "Sản phẩm vừa thay đổi. Vui lòng mở lại và thử lại.");
      for (const conversion of conversions) {
        if (!conversion.id) {
          await transaction.productUnitConversion.create({ data: { workspaceId: workspace.id, productId: current.id, unitId: conversion.unitId, factor: conversion.factor } });
          continue;
        }
        const existing = currentConversionsById.get(conversion.id);
        if (!existing || !conversion.version) throw new CatalogDomainError("CONVERSION_NOT_FOUND", "Không tìm thấy quy đổi đơn vị cần cập nhật.");
        if (existing.factor.toString() === conversion.factor) continue;
        const conversionUpdated = await transaction.productUnitConversion.updateMany({
          where: { id: existing.id, workspaceId: workspace.id, version: conversion.version },
          data: { factor: conversion.factor, version: { increment: 1 } },
        });
        if (conversionUpdated.count !== 1) throw new CatalogDomainError("CONCURRENCY_CONFLICT", "Quy đổi đơn vị vừa thay đổi. Vui lòng mở lại và thử lại.");
      }
      const deletedConversions = currentConversions.filter((conversion) => !incomingIds.has(conversion.id));
      if (deletedConversions.length > 0) {
        await transaction.productUnitConversion.deleteMany({ where: { id: { in: deletedConversions.map((conversion) => conversion.id) }, workspaceId: workspace.id } });
      }
      if (current.currentCost.toString() !== currentCost) {
        await transaction.productCostHistory.create({ data: { workspaceId: workspace.id, productId: current.id, actorUserId: input.actorUserId, previousCost: current.currentCost, nextCost: currentCost } });
      }
      await transaction.auditLog.create({
        data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.product.update", resource: "product", resourceId: current.id, result: "SUCCESS", before: { code: current.code, name: current.name, baseUnitId: current.baseUnitId, currentCost: current.currentCost.toString(), conversionCount: currentConversions.length }, after: { code, name, baseUnitId: input.baseUnitId, currentCost, status: input.status, conversions: conversions.map(({ unitId, factor }) => ({ unitId, factor })) } },
      });
    }, { isolationLevel: "Serializable" }));
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function deleteProduct(input: { actorUserId: string; id: string }) {
  const workspace = await getWorkspace(input.actorUserId);
  await writeWithRetry(() => db.$transaction(async (transaction) => {
    const product = await requireProduct(transaction, workspace.id, input.id);
    const [lotCount, conversionCount, inventoryLineCount, balanceCount] = await Promise.all([
      transaction.inventoryLot.count({ where: { workspaceId: workspace.id, productId: product.id } }),
      transaction.productUnitConversion.count({ where: { workspaceId: workspace.id, productId: product.id } }),
      transaction.inventoryDocumentLine.count({ where: { workspaceId: workspace.id, productId: product.id } }),
      transaction.inventoryBalance.count({ where: { workspaceId: workspace.id, productId: product.id } }),
    ]);
    if (lotCount + conversionCount + inventoryLineCount + balanceCount > 0) throw new CatalogDomainError("PRODUCT_HAS_DEPENDENCIES", "Không thể xóa sản phẩm đang có lô, quy đổi hoặc lịch sử tồn kho.");
    await transaction.product.delete({ where: { id: product.id } });
    await transaction.auditLog.create({
      data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.product.delete", resource: "product", resourceId: product.id, result: "SUCCESS", before: { code: product.code, name: product.name } },
    });
  }, { isolationLevel: "Serializable" }));
}

export async function createProductConversion(input: { actorUserId: string; productId: string; unitId: string; factor: DecimalInput }) {
  const workspace = await getWorkspace(input.actorUserId);
  const factor = assertPositiveDecimal(input.factor, "Hệ số quy đổi");
  try {
    return await writeWithRetry(() => db.$transaction(async (transaction) => {
      const product = await requireProduct(transaction, workspace.id, input.productId);
      if (product.baseUnitId === input.unitId) throw new CatalogDomainError("BASE_UNIT_CONVERSION", "Không cần tạo quy đổi cho đơn vị cơ bản.");
      await requireUnit(transaction, workspace.id, input.unitId);
      const conversion = await transaction.productUnitConversion.create({ data: { workspaceId: workspace.id, productId: product.id, unitId: input.unitId, factor } });
      await transaction.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.product_conversion.create", resource: "product_unit_conversion", resourceId: conversion.id, result: "SUCCESS", after: { productId: product.id, unitId: input.unitId, factor } } });
      return conversion;
    }, { isolationLevel: "Serializable" }));
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function updateProductConversion(input: { actorUserId: string; id: string; version: number; factor: DecimalInput }) {
  const workspace = await getWorkspace(input.actorUserId);
  const factor = assertPositiveDecimal(input.factor, "Hệ số quy đổi");
  await writeWithRetry(() => db.$transaction(async (transaction) => {
    const current = await transaction.productUnitConversion.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
    if (!current) throw new CatalogDomainError("CONVERSION_NOT_FOUND", "Không tìm thấy quy đổi đơn vị.");
    const updated = await transaction.productUnitConversion.updateMany({ where: { id: current.id, workspaceId: workspace.id, version: input.version }, data: { factor, version: { increment: 1 } } });
    if (updated.count !== 1) throw new CatalogDomainError("CONCURRENCY_CONFLICT", "Quy đổi vừa thay đổi. Vui lòng mở lại và thử lại.");
    await transaction.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.product_conversion.update", resource: "product_unit_conversion", resourceId: current.id, result: "SUCCESS", before: { factor: current.factor.toString() }, after: { factor } } });
  }, { isolationLevel: "Serializable" }));
}

export async function deleteProductConversion(input: { actorUserId: string; id: string }) {
  const workspace = await getWorkspace(input.actorUserId);
  await writeWithRetry(() => db.$transaction(async (transaction) => {
    const conversion = await transaction.productUnitConversion.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
    if (!conversion) throw new CatalogDomainError("CONVERSION_NOT_FOUND", "Không tìm thấy quy đổi đơn vị.");
    await transaction.productUnitConversion.delete({ where: { id: conversion.id } });
    await transaction.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.product_conversion.delete", resource: "product_unit_conversion", resourceId: conversion.id, result: "SUCCESS", before: { productId: conversion.productId, unitId: conversion.unitId, factor: conversion.factor.toString() } } });
  }, { isolationLevel: "Serializable" }));
}

export async function createInventoryLot(input: { actorUserId: string; productId: string; supplierLotCode?: string; manufacturedAt: Date | null; expiresAt: Date | null }) {
  const workspace = await getWorkspace(input.actorUserId);
  assertLotDates(input.manufacturedAt, input.expiresAt);
  try {
    return await writeWithRetry(() => db.$transaction(async (transaction) => {
      const product = await requireProduct(transaction, workspace.id, input.productId);
      const maximum = await transaction.inventoryLot.aggregate({ where: { workspaceId: workspace.id, productId: product.id }, _max: { sequence: true } });
      const sequence = (maximum._max.sequence ?? 0) + 1;
      const code = `${product.code}-LOT${String(sequence).padStart(3, "0")}`;
      const lot = await transaction.inventoryLot.create({ data: { workspaceId: workspace.id, productId: product.id, sequence, code, supplierLotCode: normalizeOptional(input.supplierLotCode), manufacturedAt: input.manufacturedAt, expiresAt: input.expiresAt } });
      await transaction.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.lot.create", resource: "inventory_lot", resourceId: lot.id, result: "SUCCESS", after: { productId: product.id, code, supplierLotCode: lot.supplierLotCode, manufacturedAt: lot.manufacturedAt?.toISOString(), expiresAt: lot.expiresAt?.toISOString() } } });
      return lot;
    }, { isolationLevel: "Serializable" }));
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function updateInventoryLot(input: { actorUserId: string; id: string; version: number; supplierLotCode?: string; manufacturedAt: Date | null; expiresAt: Date | null }) {
  const workspace = await getWorkspace(input.actorUserId);
  assertLotDates(input.manufacturedAt, input.expiresAt);
  await writeWithRetry(() => db.$transaction(async (transaction) => {
    const current = await transaction.inventoryLot.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
    if (!current) throw new CatalogDomainError("LOT_NOT_FOUND", "Không tìm thấy lô hàng.");
    const updated = await transaction.inventoryLot.updateMany({ where: { id: current.id, workspaceId: workspace.id, version: input.version }, data: { supplierLotCode: normalizeOptional(input.supplierLotCode), manufacturedAt: input.manufacturedAt, expiresAt: input.expiresAt, version: { increment: 1 } } });
    if (updated.count !== 1) throw new CatalogDomainError("CONCURRENCY_CONFLICT", "Lô hàng vừa thay đổi. Vui lòng mở lại và thử lại.");
    await transaction.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.lot.update", resource: "inventory_lot", resourceId: current.id, result: "SUCCESS", before: { supplierLotCode: current.supplierLotCode, manufacturedAt: current.manufacturedAt?.toISOString(), expiresAt: current.expiresAt?.toISOString() }, after: { supplierLotCode: normalizeOptional(input.supplierLotCode), manufacturedAt: input.manufacturedAt?.toISOString(), expiresAt: input.expiresAt?.toISOString() } } });
  }, { isolationLevel: "Serializable" }));
}

export async function deleteInventoryLot(input: { actorUserId: string; id: string }) {
  const workspace = await getWorkspace(input.actorUserId);
  await writeWithRetry(() => db.$transaction(async (transaction) => {
    const lot = await transaction.inventoryLot.findFirst({ where: { id: input.id, workspaceId: workspace.id } });
    if (!lot) throw new CatalogDomainError("LOT_NOT_FOUND", "Không tìm thấy lô hàng.");
    const [inventoryLineCount, balanceCount] = await Promise.all([
      transaction.inventoryDocumentLine.count({ where: { workspaceId: workspace.id, lotId: lot.id } }),
      transaction.inventoryBalance.count({ where: { workspaceId: workspace.id, lotId: lot.id } }),
    ]);
    if (inventoryLineCount + balanceCount > 0) throw new CatalogDomainError("LOT_IN_USE", "Không thể xóa lô đã có lịch sử hoặc số dư tồn kho.");
    await transaction.inventoryLot.delete({ where: { id: lot.id } });
    await transaction.auditLog.create({ data: { workspaceId: workspace.id, actorUserId: input.actorUserId, action: "catalog.lot.delete", resource: "inventory_lot", resourceId: lot.id, result: "SUCCESS", before: { productId: lot.productId, code: lot.code } } });
  }, { isolationLevel: "Serializable" }));
}
