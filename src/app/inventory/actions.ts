"use server";

import { z } from "zod";

import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { InventoryDomainError, postInventoryDocument } from "@/lib/server/inventory-service";

export type InventoryActionState = { success: boolean; message: string | null };

const lineSchema = z.object({ productId: z.string().uuid(), lotId: z.string().uuid().optional(), slotId: z.string().uuid(), unitId: z.string().uuid(), quantity: z.string().trim().min(1).max(25) });
const documentSchema = z.object({ type: z.enum(["OPENING", "RECEIPT", "ISSUE"]), idempotencyKey: z.string().uuid(), lines: z.array(lineSchema).min(1).max(20) });

export async function postInventoryDocumentAction(formData: FormData): Promise<InventoryActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== AUTH_ROLES.DEMO_USER) return { success: false, message: "Bạn không có quyền ghi tồn kho." };
  try {
    const parsed = documentSchema.safeParse({ type: formData.get("type"), idempotencyKey: formData.get("idempotencyKey"), lines: JSON.parse(String(formData.get("lines") ?? "[]")) });
    if (!parsed.success) return { success: false, message: "Kiểm tra lại các dòng hàng." };
    await postInventoryDocument({ actorUserId: user.id, ...parsed.data });
    return { success: true, message: null };
  } catch (error) {
    return { success: false, message: error instanceof InventoryDomainError ? error.message : "Chưa thể ghi phiếu tồn kho." };
  }
}
