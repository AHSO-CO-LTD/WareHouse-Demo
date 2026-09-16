"use client";

import { FormEvent, useEffect, useEffectEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deleteWarehouseNodeAction,
  repositionRackLevelAction,
  updateWarehouseNodeAction,
} from "@/app/warehouse/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
type LevelPosition = { sequence: number; version: number };

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

function localCode(code: string | undefined, parentCode?: string) {
  if (!code || !parentCode) return code;
  const prefix = `${parentCode}-`;
  return code.startsWith(prefix) ? code.slice(prefix.length) : code;
}

type NodeActionsProps = {
  kind: NodeKind;
  id: string;
  version: number;
  code?: string;
  codePrefix?: string;
  editRequest?: number;
  name: string;
  sequence?: number;
  levelCount?: number;
  levelLimit?: number;
  levelPositions?: LevelPosition[];
  slotPlans?: SlotPlan[];
  slotLimit?: number;
  storageClass: StorageClass;
  inheritedStorageClass?: StorageClass;
  editLabel?: string;
  hideDelete?: boolean;
  label: string;
};

export function NodeActions({ kind, id, version, code, codePrefix, editRequest = 0, name, sequence, levelCount, levelLimit, levelPositions = [], slotPlans: initialSlotPlans = [], slotLimit, storageClass, inheritedStorageClass = null, editLabel = "Sửa", hideDelete = false, label }: NodeActionsProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FormData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [configuredLevelCount, setConfiguredLevelCount] = useState(levelCount ?? 0);
  const [slotPlans, setSlotPlans] = useState<SlotPlan[]>(() => createSlotPlans(levelCount ?? 0, initialSlotPlans));
  const [formRevision, setFormRevision] = useState(0);
  const [positioning, setPositioning] = useState(false);
  const [positionTarget, setPositionTarget] = useState<string | undefined>();
  const [positionDraft, setPositionDraft] = useState<FormData | null>(null);
  const isLevel = kind === "level";
  const isRack = kind === "rack";
  const isGeneratedCode = isLevel || kind === "slot";
  const isCodeLocked = isGeneratedCode || (isRack && Boolean(levelCount));
  const editableCode = localCode(code, codePrefix);
  const codeLockLabel = isGeneratedCode ? " · tự sinh" : " · đã khóa vì có tầng";

  function resetEditingForm() {
    setMessage(null);
    setDraft(null);
    setConfiguredLevelCount(levelCount ?? 0);
    setSlotPlans(createSlotPlans(levelCount ?? 0, initialSlotPlans));
    setFormRevision((current) => current + 1);
  }

  function handleEditingChange(nextEditing: boolean) {
    setEditing(nextEditing);
    if (nextEditing) resetEditingForm();
  }

  const openRequestedEditor = useEffectEvent(() => {
    handleEditingChange(true);
  });

  useEffect(() => {
    if (editRequest <= 0) return;
    const timeoutId = window.setTimeout(() => openRequestedEditor(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [editRequest]);

  function stageUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setDraft(new FormData(event.currentTarget));
  }

  function confirmUpdate() {
    if (!draft) return;
    startTransition(async () => {
      const result = await updateWarehouseNodeAction(draft);
      if (result.message) {
        setMessage(result.message);
        setDraft(null);
        return;
      }
      toast.success("Đã cập nhật vị trí kho.");
      setDraft(null);
      setEditing(false);
      router.refresh();
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("kind", kind);
      formData.set("id", id);
      const result = await deleteWarehouseNodeAction(formData);
      if (result.message) {
        setMessage(result.message);
        return;
      }
      toast.success("Đã xóa vị trí kho.");
      router.refresh();
    });
  }

  function stagePositionChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPositionDraft(new FormData(event.currentTarget));
  }

  function confirmPositionChange() {
    if (!positionDraft) return;
    startTransition(async () => {
      const result = await repositionRackLevelAction(positionDraft);
      if (result.message) {
        setMessage(result.message);
        setPositionDraft(null);
        return;
      }
      toast.success("Đã cập nhật vị trí tầng và mã liên quan.");
      setPositionDraft(null);
      setPositioning(false);
      setPositionTarget(undefined);
      router.refresh();
    });
  }

  const positionTargetValue = Number(positionTarget);
  const selectedTarget = levelPositions.find((position) => position.sequence === positionTargetValue);

  return (
    <div className="warehouse-node-actions">
      <Dialog open={editing} onOpenChange={handleEditingChange}>
        <DialogTrigger asChild><Button className="h-12 warehouse-edit-button" size="sm" variant="outline">{editLabel}</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Sửa {label}</DialogTitle></DialogHeader>
          <form className="warehouse-edit-form" key={formRevision} onSubmit={stageUpdate}>
            <input name="kind" type="hidden" value={kind} />
            <input name="id" type="hidden" value={id} />
            <input name="version" type="hidden" value={version} />
            <div className="field-group"><Label htmlFor={`${id}-code`}>{codeLabel[kind]}{isCodeLocked ? codeLockLabel : ""}</Label>{isCodeLocked ? <><input name="code" type="hidden" value={code} /><Input className="h-11" disabled id={`${id}-code`} value={code} /></> : <Input className="h-11" defaultValue={editableCode} id={`${id}-code`} maxLength={40} name="code" required />}</div>
            {isRack ? <><div className="field-group"><Label>Số tầng</Label><Select name="levelCount" onValueChange={(value) => { const count = Number(value); setConfiguredLevelCount(count); setSlotPlans((current) => createSlotPlans(count, current)); }} required value={configuredLevelCount ? String(configuredLevelCount) : undefined}><SelectTrigger className="h-11 w-full"><SelectValue placeholder="Chọn số tầng" /></SelectTrigger><SelectContent>{Array.from({ length: levelLimit ?? 0 }, (_, index) => index + 1).map((count) => <SelectItem key={count} value={String(count)}>{count} tầng</SelectItem>)}</SelectContent></Select></div>{configuredLevelCount > 0 && slotLimit !== undefined ? <><input name="slotPlans" type="hidden" value={JSON.stringify(slotPlans)} /><SlotPlanFields controlClassName="h-11" onChange={setSlotPlans} plans={slotPlans} slotLimit={slotLimit} /></> : null}</> : null}
            {isLevel ? <div className="field-group"><Label>Tầng</Label><input name="sequence" type="hidden" value={sequence} /><Input className="h-11" disabled value={`Tầng ${sequence}`} /></div> : null}
            <div className="field-group"><Label htmlFor={`${id}-name`}>Tên</Label><Input className="h-11" defaultValue={name} id={`${id}-name`} maxLength={120} minLength={2} name="name" required /></div>
            <div className="field-group">
              <Label>Tải trọng{inheritedStorageClass ? " · đã khóa theo cấp cha" : ""}</Label>
              {inheritedStorageClass ? (
                <>
                  <input name="storageClass" type="hidden" value={inheritedStorageClass} />
                  <Select disabled value={inheritedStorageClass}><SelectTrigger className="h-11 w-full"><SelectValue>{storageClassLabel[inheritedStorageClass]}</SelectValue></SelectTrigger><SelectContent><SelectItem value={inheritedStorageClass}>{storageClassLabel[inheritedStorageClass]}</SelectItem></SelectContent></Select>
                </>
              ) : (
                <Select defaultValue={storageClass ?? undefined} name="storageClass"><SelectTrigger className="h-11 w-full"><SelectValue placeholder="Chưa phân loại" /></SelectTrigger><SelectContent><SelectItem value="LIGHT">Nhẹ</SelectItem><SelectItem value="MEDIUM">Trung bình</SelectItem><SelectItem value="HEAVY">Nặng</SelectItem></SelectContent></Select>
              )}
            </div>
            {message ? <p className="form-error" role="alert">{message}</p> : null}
            <DialogFooter><Button className="h-12" onClick={resetEditingForm} type="button" variant="outline">Đặt lại</Button><Button className="h-12" type="submit">Lưu thay đổi</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {isLevel && levelCount && levelCount > 1 ? <Dialog open={positioning} onOpenChange={(open) => { setPositioning(open); if (!open) { setPositionTarget(undefined); setMessage(null); } }}>
        <DialogTrigger asChild><Button className="h-12 warehouse-position-button" size="sm" variant="outline">Chuyển/đổi</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Chuyển hoặc đổi tầng</DialogTitle></DialogHeader>
          <form className="warehouse-edit-form" onSubmit={stagePositionChange}>
            <input name="id" type="hidden" value={id} />
            <input name="version" type="hidden" value={version} />
            {selectedTarget ? <input name="targetVersion" type="hidden" value={selectedTarget.version} /> : null}
            <div className="field-group"><Label>Tầng hiện tại</Label><Input className="h-11" disabled value={`Tầng ${sequence}`} /></div>
            <div className="field-group"><Label htmlFor={`${id}-target-sequence`}>Vị trí đích</Label><Select name="targetSequence" onValueChange={setPositionTarget} required value={positionTarget}><SelectTrigger className="h-11 w-full" id={`${id}-target-sequence`}><SelectValue placeholder="Chọn tầng đích" /></SelectTrigger><SelectContent>{Array.from({ length: levelCount }, (_, index) => index + 1).filter((candidate) => candidate !== sequence).map((candidate) => { const occupied = levelPositions.some((position) => position.sequence === candidate); return <SelectItem key={candidate} value={String(candidate)}>{occupied ? `Đổi với Tầng ${candidate}` : `Chuyển tới Tầng ${candidate} trống`}</SelectItem>; })}</SelectContent></Select></div>
            {message ? <p className="form-error" role="alert">{message}</p> : null}
            <DialogFooter><Button className="h-12" type="submit">Tiếp tục</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog> : null}
      {!hideDelete ? <AlertDialog>
        <AlertDialogTrigger asChild><Button className="h-12" size="sm" variant="destructive">Xóa</Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Xóa {label}?</AlertDialogTitle><AlertDialogDescription>{isLevel ? "Tầng và các ô chứa chưa có sản phẩm sẽ bị xóa. Các tầng phía trên chỉ được đôn tự động khi chúng cũng chưa có sản phẩm." : "Chỉ có thể xóa khi vị trí này không còn cấp con. Thao tác này không thể hoàn tác."}</AlertDialogDescription></AlertDialogHeader>
          {message ? <p className="form-error" role="alert">{message}</p> : null}
          <AlertDialogFooter><AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={isPending} onClick={confirmDelete} variant="destructive">{isPending ? "Đang xóa" : "Xác nhận xóa"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> : null}
      {positionDraft ? <AlertDialog open onOpenChange={(open) => !open && setPositionDraft(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận đổi vị trí tầng?</AlertDialogTitle><AlertDialogDescription>Mã tầng và mã ô chứa thuộc các tầng được chuyển sẽ thay đổi theo vị trí mới.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={isPending} onClick={confirmPositionChange}>{isPending ? "Đang cập nhật" : "Xác nhận"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}
      {draft ? <AlertDialog open onOpenChange={(open) => !open && setDraft(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Lưu thay đổi?</AlertDialogTitle><AlertDialogDescription>Thông tin vị trí kho sẽ được cập nhật ngay.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={isPending} onClick={confirmUpdate}>{isPending ? "Đang lưu" : "Xác nhận lưu"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : null}
    </div>
  );
}
