"use server";

import { z } from "zod";

import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import {
  createWarehouseNode,
  deleteWarehouseNode,
  repositionRackLevel,
  updateWarehouseNode,
  WarehouseDomainError,
} from "@/lib/server/warehouse-service";

export type WarehouseActionState = { message: string | null; success: boolean };

function parseSlotPlans(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  try { return JSON.parse(value); } catch { return value; }
}

const schema = z.object({
  kind: z.enum(["warehouse", "zone", "rack", "level", "slot"]),
  parentId: z.string().uuid().optional(),
  code: z.preprocess(
    (value) => typeof value === "string" ? (value.trim() === "" ? undefined : value.trim().toUpperCase()) : value,
    z.string().trim().min(1).max(40).optional(),
  ),
  name: z.string().trim().min(2).max(120),
  sequence: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.coerce.number().int().min(1).max(99).optional(),
  ),
  levelCount: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.coerce.number().int().min(1).max(99).optional(),
  ),
  slotPlans: z.preprocess(
    parseSlotPlans,
    z.array(z.object({ sequence: z.number().int().min(1).max(99), slotCount: z.number().int().min(0).max(99) })).optional(),
  ),
  storageClass: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.enum(["LIGHT", "MEDIUM", "HEAVY"]).optional(),
  ),
});

const nodeSchema = schema.extend({
  id: z.string().uuid(),
  version: z.coerce.number().int().min(1),
});

const deleteSchema = z.object({
  kind: z.enum(["warehouse", "zone", "rack", "level", "slot"]),
  id: z.string().uuid(),
});

const levelPositionSchema = z.object({
  id: z.string().uuid(),
  version: z.coerce.number().int().min(1),
  targetSequence: z.coerce.number().int().min(1).max(99),
  targetVersion: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.coerce.number().int().min(1).optional(),
  ),
});

async function getWarehouseOwner() {
  const user = await getCurrentUser();
  if (!user || user.role !== AUTH_ROLES.DEMO_USER) return null;
  return user;
}

export async function createWarehouseNodeAction(
  _previous: WarehouseActionState,
  formData: FormData,
): Promise<WarehouseActionState> {
  const user = await getWarehouseOwner();
  if (!user) return { message: "Bạn không có quyền quản lý kho này.", success: false };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Kiểm tra lại tên, mã và cấp cha của vị trí.", success: false };
  if (!parsed.data.code) return { message: "Mã vị trí là bắt buộc.", success: false };
  if (parsed.data.kind === "rack" && !parsed.data.levelCount) return { message: "Hãy chọn số tầng cho kệ.", success: false };
  if (parsed.data.kind === "rack" && !parsed.data.slotPlans) return { message: "Hãy cấu hình số ô chứa cho từng tầng.", success: false };
  if (parsed.data.kind === "level" && !parsed.data.sequence) return { message: "Số thứ tự tầng là bắt buộc.", success: false };
  try {
    await createWarehouseNode({ ...parsed.data, actorUserId: user.id, storageClass: parsed.data.storageClass ?? null });
    return { message: null, success: true };
  } catch (error) {
    return { message: error instanceof WarehouseDomainError ? error.message : "Chưa thể lưu vị trí kho. Vui lòng thử lại.", success: false };
  }
}

export async function updateWarehouseNodeAction(formData: FormData): Promise<WarehouseActionState> {
  const user = await getWarehouseOwner();
  if (!user) return { message: "Bạn không có quyền quản lý kho này.", success: false };
  const parsed = nodeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Kiểm tra lại thông tin vị trí kho.", success: false };
  if (parsed.data.kind === "rack" && !parsed.data.levelCount) return { message: "Hãy chọn số tầng cho kệ.", success: false };
  if (parsed.data.kind === "rack" && !parsed.data.slotPlans) return { message: "Hãy cấu hình số ô chứa cho từng tầng.", success: false };
  if (parsed.data.kind === "level" && !parsed.data.sequence) return { message: "Số thứ tự tầng là bắt buộc.", success: false };
  if (!parsed.data.code) return { message: "Mã vị trí là bắt buộc.", success: false };
  try {
    await updateWarehouseNode({ ...parsed.data, actorUserId: user.id, storageClass: parsed.data.storageClass ?? null });
    return { message: null, success: true };
  } catch (error) {
    return { message: error instanceof WarehouseDomainError ? error.message : "Chưa thể cập nhật vị trí kho. Vui lòng thử lại.", success: false };
  }
}

export async function deleteWarehouseNodeAction(formData: FormData): Promise<WarehouseActionState> {
  const user = await getWarehouseOwner();
  if (!user) return { message: "Bạn không có quyền quản lý kho này.", success: false };
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Vị trí kho không hợp lệ.", success: false };
  try {
    await deleteWarehouseNode({ ...parsed.data, actorUserId: user.id });
    return { message: null, success: true };
  } catch (error) {
    return { message: error instanceof WarehouseDomainError ? error.message : "Chưa thể xóa vị trí kho. Vui lòng thử lại.", success: false };
  }
}

export async function repositionRackLevelAction(formData: FormData): Promise<WarehouseActionState> {
  const user = await getWarehouseOwner();
  if (!user) return { message: "Bạn không có quyền quản lý kho này.", success: false };
  const parsed = levelPositionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Vị trí tầng đích không hợp lệ.", success: false };
  try {
    await repositionRackLevel({ ...parsed.data, actorUserId: user.id });
    return { message: null, success: true };
  } catch (error) {
    return { message: error instanceof WarehouseDomainError ? error.message : "Chưa thể chuyển tầng. Vui lòng thử lại.", success: false };
  }
}
