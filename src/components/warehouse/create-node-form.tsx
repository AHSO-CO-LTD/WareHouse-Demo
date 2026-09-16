"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createWarehouseNodeAction } from "@/app/warehouse/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSlotPlans, SlotPlanFields, type SlotPlan } from "@/components/warehouse/slot-plan-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NodeKind = "warehouse" | "zone" | "rack" | "level" | "slot";
type StorageClass = "LIGHT" | "MEDIUM" | "HEAVY" | null;

const kindLabel: Record<NodeKind, string> = {
  warehouse: "kho",
  zone: "phân khu",
  rack: "kệ",
  level: "tầng kệ",
  slot: "ô chứa",
};

const storageClassLabel: Record<Exclude<StorageClass, null>, string> = {
  LIGHT: "Nhẹ",
  MEDIUM: "Trung bình",
  HEAVY: "Nặng",
};

const codeLabel: Record<NodeKind, string> = {
  warehouse: "Mã kho",
  zone: "Mã phân khu",
  rack: "Mã kệ",
  level: "Mã tầng",
  slot: "Mã ô chứa",
};

type CreateNodeFormProps = {
  kind: NodeKind;
  parentId?: string;
  inheritedStorageClass?: StorageClass;
  levelLimit?: number;
  slotLimit?: number;
  triggerLabel: string;
};

export function CreateNodeForm({ kind, parentId, inheritedStorageClass = null, levelLimit, slotLimit, triggerLabel }: CreateNodeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [levelCount, setLevelCount] = useState(0);
  const [slotPlans, setSlotPlans] = useState<SlotPlan[]>([]);
  const isLevel = kind === "level";
  const isRack = kind === "rack";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createWarehouseNodeAction({ message: null, success: false }, formData);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      formRef.current?.reset();
      setLevelCount(0);
      setSlotPlans([]);
      setOpen(false);
      toast.success(`Đã thêm ${kindLabel[kind]}.`);
      router.refresh();
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setMessage(null);
      setLevelCount(0);
      setSlotPlans([]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-12 warehouse-add-button" type="button">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Thêm {kindLabel[kind]}</DialogTitle></DialogHeader>
        <form ref={formRef} className="warehouse-dialog-form" onSubmit={submit}>
          <input name="kind" type="hidden" value={kind} />
          {parentId ? <input name="parentId" type="hidden" value={parentId} /> : null}
          <div className="field-group">
            <Label htmlFor={`${kind}-code`}>{codeLabel[kind]}</Label>
            <Input className="h-12" id={`${kind}-code`} maxLength={40} name="code" required />
          </div>
          {isRack ? (
            <div className="field-group">
              <Label>Số tầng</Label>
              <Select name="levelCount" onValueChange={(value) => { const count = Number(value); setLevelCount(count); setSlotPlans((current) => createSlotPlans(count, current)); }} required value={levelCount ? String(levelCount) : undefined}>
                <SelectTrigger className="h-12 w-full"><SelectValue placeholder="Chọn số tầng" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: levelLimit ?? 0 }, (_, index) => index + 1).map((count) => <SelectItem key={count} value={String(count)}>{count} tầng</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {isRack && levelCount > 0 && slotLimit !== undefined ? <><input name="slotPlans" type="hidden" value={JSON.stringify(slotPlans)} /><SlotPlanFields onChange={setSlotPlans} plans={slotPlans} slotLimit={slotLimit} /></> : null}
          {isLevel ? (
            <div className="field-group">
              <Label htmlFor={`${kind}-sequence`}>Số tầng</Label>
              <Input className="h-12" id={`${kind}-sequence`} max="99" min="1" name="sequence" type="number" required />
            </div>
          ) : null}
          <div className="field-group">
            <Label htmlFor={`${kind}-name`}>Tên</Label>
            <Input className="h-12" id={`${kind}-name`} maxLength={120} minLength={2} name="name" required />
          </div>
          <div className="field-group">
            <Label>Tải trọng{inheritedStorageClass ? " · đã khóa theo cấp cha" : ""}</Label>
            {inheritedStorageClass ? (
              <>
                <input name="storageClass" type="hidden" value={inheritedStorageClass} />
                <Select disabled value={inheritedStorageClass}>
                  <SelectTrigger className="h-12 w-full"><SelectValue>{storageClassLabel[inheritedStorageClass]}</SelectValue></SelectTrigger>
                  <SelectContent><SelectItem value={inheritedStorageClass}>{storageClassLabel[inheritedStorageClass]}</SelectItem></SelectContent>
                </Select>
              </>
            ) : (
              <Select name="storageClass">
                <SelectTrigger className="h-12 w-full"><SelectValue placeholder="Chưa phân loại" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIGHT">Nhẹ</SelectItem>
                  <SelectItem value="MEDIUM">Trung bình</SelectItem>
                  <SelectItem value="HEAVY">Nặng</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {message ? <p className="form-error" role="alert">{message}</p> : null}
          <DialogFooter><Button className="h-12" disabled={isPending} type="submit">{isPending ? "Đang thêm" : `Thêm ${kindLabel[kind]}`}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
