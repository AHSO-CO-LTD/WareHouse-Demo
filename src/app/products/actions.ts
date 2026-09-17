"use server";

import { z } from "zod";

import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import {
  CatalogDomainError,
  createInventoryLot,
  createProduct,
  createProductConversion,
  createUnit,
  deleteInventoryLot,
  deleteProduct,
  deleteProductConversion,
  deleteUnit,
  updateInventoryLot,
  updateProduct,
  updateProductConversion,
  updateUnit,
} from "@/lib/server/catalog-service";

export type CatalogActionState = { message: string | null; success: boolean };

const optionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(maximum).optional(),
);

const unitSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

const versionedUnitSchema = unitSchema.extend({ id: z.string().uuid(), version: z.coerce.number().int().min(1) });

const productSchema = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(2).max(120),
  description: optionalText(500),
  barcode: optionalText(80),
  baseUnitId: z.string().uuid(),
  currentCost: z.string().trim().min(1).max(21),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

const versionedProductSchema = productSchema.extend({ id: z.string().uuid(), version: z.coerce.number().int().min(1) });

const productConversionPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  version: z.number().int().min(1).optional(),
  unitId: z.string().uuid(),
  factor: z.string().trim().min(1).max(25),
});

type ProductFormInput = z.infer<typeof productSchema> & {
  conversions: z.infer<typeof productConversionPayloadSchema>[];
};

type VersionedProductFormInput = z.infer<typeof versionedProductSchema> & {
  conversions: z.infer<typeof productConversionPayloadSchema>[];
};

const conversionSchema = z.object({
  productId: z.string().uuid(),
  unitId: z.string().uuid(),
  factor: z.string().trim().min(1).max(25),
});

const versionedConversionSchema = z.object({ id: z.string().uuid(), version: z.coerce.number().int().min(1), factor: z.string().trim().min(1).max(25) });

const lotSchema = z.object({
  productId: z.string().uuid(),
  supplierLotCode: optionalText(80),
  manufacturedAt: z.preprocess((value) => value === "" ? null : value, z.coerce.date().nullable()),
  expiresAt: z.preprocess((value) => value === "" ? null : value, z.coerce.date().nullable()),
});

const versionedLotSchema = lotSchema.omit({ productId: true }).extend({ id: z.string().uuid(), version: z.coerce.number().int().min(1) });
const idSchema = z.object({ id: z.string().uuid() });

async function getCatalogOwner() {
  const user = await getCurrentUser();
  return user?.role === AUTH_ROLES.DEMO_USER ? user : null;
}

function invalid(message: string): CatalogActionState {
  return { message, success: false };
}

function mapError(error: unknown, fallback: string): CatalogActionState {
  return invalid(error instanceof CatalogDomainError ? error.message : fallback);
}

function parseProductForm(formData: FormData, versioned: false): ProductFormInput | null;
function parseProductForm(formData: FormData, versioned: true): VersionedProductFormInput | null;
function parseProductForm(formData: FormData, versioned: boolean): ProductFormInput | VersionedProductFormInput | null {
  const raw = Object.fromEntries(formData);
  const product = (versioned ? versionedProductSchema : productSchema).safeParse(raw);
  if (!product.success) return null;

  try {
    const conversions = z.array(productConversionPayloadSchema).max(20).safeParse(JSON.parse(String(raw.conversions ?? "[]")));
    if (!conversions.success) return null;
    return { ...product.data, conversions: conversions.data };
  } catch {
    return null;
  }
}

export async function createUnitAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = unitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Kiểm tra lại tên đơn vị.");
  try { await createUnit({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể tạo đơn vị."); }
}

export async function updateUnitAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = versionedUnitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Kiểm tra lại đơn vị tính.");
  try { await updateUnit({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể cập nhật đơn vị."); }
}

export async function deleteUnitAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Đơn vị không hợp lệ.");
  try { await deleteUnit({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể xóa đơn vị."); }
}

export async function createProductAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = parseProductForm(formData, false);
  if (!parsed) return invalid("Kiểm tra lại thông tin sản phẩm.");
  try { await createProduct({ ...parsed, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể tạo sản phẩm."); }
}

export async function updateProductAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = parseProductForm(formData, true);
  if (!parsed) return invalid("Kiểm tra lại thông tin sản phẩm.");
  try { await updateProduct({ ...parsed, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể cập nhật sản phẩm."); }
}

export async function deleteProductAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Sản phẩm không hợp lệ.");
  try { await deleteProduct({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể xóa sản phẩm."); }
}

export async function createProductConversionAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = conversionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Kiểm tra lại quy đổi đơn vị.");
  try { await createProductConversion({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể thêm quy đổi."); }
}

export async function updateProductConversionAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = versionedConversionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Kiểm tra lại quy đổi đơn vị.");
  try { await updateProductConversion({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể cập nhật quy đổi."); }
}

export async function deleteProductConversionAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Quy đổi không hợp lệ.");
  try { await deleteProductConversion({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể xóa quy đổi."); }
}

export async function createInventoryLotAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = lotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Kiểm tra lại thông tin lô hàng.");
  try { await createInventoryLot({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể tạo lô hàng."); }
}

export async function updateInventoryLotAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = versionedLotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Kiểm tra lại thông tin lô hàng.");
  try { await updateInventoryLot({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể cập nhật lô hàng."); }
}

export async function deleteInventoryLotAction(formData: FormData): Promise<CatalogActionState> {
  const user = await getCatalogOwner();
  if (!user) return invalid("Bạn không có quyền quản lý danh mục.");
  const parsed = idSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid("Lô hàng không hợp lệ.");
  try { await deleteInventoryLot({ ...parsed.data, actorUserId: user.id }); return { message: null, success: true }; } catch (error) { return mapError(error, "Chưa thể xóa lô hàng."); }
}
