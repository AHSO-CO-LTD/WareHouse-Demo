"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createUnitAction, deleteUnitAction, updateUnitAction, type CatalogActionState } from "@/app/products/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UnitItem = { id: string; code: string; name: string; version: number; usageCount: number };

type PendingMutation = {
  title: string;
  description: string;
  formData: FormData;
  action: (formData: FormData) => Promise<CatalogActionState>;
  successMessage: string;
  afterSuccess?: () => void;
};

type UnitManagerProps = { units: UnitItem[]; writable: boolean };

export function UnitManager({ units, writable }: UnitManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);

  function openNewUnit() {
    setEditingUnit(null);
    setDialogOpen(true);
  }

  function openUnit(unit: UnitItem) {
    setEditingUnit(unit);
    setDialogOpen(true);
  }

  function stageMutation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPendingMutation({
      title: editingUnit ? "Lưu đơn vị tính?" : "Thêm đơn vị tính?",
      description: editingUnit ? "Tên đơn vị sẽ được cập nhật cho các sản phẩm đang sử dụng." : "Mã đơn vị sẽ được tự tạo và không thay đổi khi đổi tên.",
      formData: new FormData(event.currentTarget),
      action: editingUnit ? updateUnitAction : createUnitAction,
      successMessage: editingUnit ? "Đã cập nhật đơn vị tính." : "Đã thêm đơn vị tính.",
      afterSuccess: () => { setDialogOpen(false); setEditingUnit(null); },
    });
  }

  function stageDeletion() {
    if (!editingUnit) return;
    const formData = new FormData();
    formData.set("id", editingUnit.id);
    setMessage(null);
    setPendingMutation({
      title: "Xóa đơn vị tính?",
      description: editingUnit.usageCount > 0 ? "Đơn vị này đang được sản phẩm sử dụng nên không thể xóa." : "Đơn vị sẽ bị xóa vĩnh viễn.",
      formData,
      action: deleteUnitAction,
      successMessage: "Đã xóa đơn vị tính.",
      afterSuccess: () => { setDialogOpen(false); setEditingUnit(null); },
    });
  }

  function confirmMutation() {
    if (!pendingMutation) return;
    const mutation = pendingMutation;
    startTransition(async () => {
      const result = await mutation.action(mutation.formData);
      if (!result.success) {
        setMessage(result.message);
        setPendingMutation(null);
        return;
      }
      toast.success(mutation.successMessage);
      mutation.afterSuccess?.();
      setPendingMutation(null);
      router.refresh();
    });
  }

  return (
    <>
      <section className="warehouse-page-heading">
        <h1>Đơn vị tính</h1>
        <span className="warehouse-page-capacity">{units.length} đơn vị</span>
      </section>

      {message ? <p className="form-error mb-4" role="alert">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button className="h-12" disabled={!writable} onClick={openNewUnit} type="button">Thêm đơn vị</Button>
      </div>

      {units.length === 0 ? (
        <section className="warehouse-empty-state mt-6">
          <h2>Bạn chưa có đơn vị tính</h2>
          {writable ? <Button className="h-12" onClick={openNewUnit} type="button">Thêm đơn vị</Button> : null}
        </section>
      ) : (
        <ol className="warehouse-hierarchy mt-6">
          {units.map((unit) => (
            <li className="warehouse-node" key={unit.id}>
              <button className="warehouse-node-row warehouse-node-row--editable w-full text-left" disabled={!writable} onClick={() => openUnit(unit)} type="button">
                <span className="warehouse-node-identity">
                  <span className="warehouse-node-type">Đơn vị</span>
                  <span className="warehouse-node-title"><strong>{unit.code}</strong><span>{unit.name}</span></span>
                </span>
                <span className="warehouse-node-summary">{unit.usageCount === 0 ? "Chưa sử dụng" : `${unit.usageCount} sản phẩm`}</span>
                <span className="warehouse-node-controls"><span className="warehouse-edit-button inline-flex h-12 items-center rounded-lg border px-4">Mở</span></span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editingUnit ? "Sửa đơn vị tính" : "Thêm đơn vị tính"}</DialogTitle></DialogHeader>
          <form className="auth-form" key={editingUnit?.id ?? "new"} onSubmit={stageMutation}>
            {editingUnit ? <><input name="id" type="hidden" value={editingUnit.id} /><input name="version" type="hidden" value={editingUnit.version} /></> : null}
            {editingUnit ? <div className="field-group"><Label>Mã đơn vị</Label><Input className="h-12" disabled value={editingUnit.code} /></div> : null}
            <div className="field-group"><Label htmlFor="unit-name">Tên đơn vị <span className="text-destructive">*</span></Label><Input className="h-12" defaultValue={editingUnit?.name} id="unit-name" maxLength={50} name="name" required /></div>
            <DialogFooter>{editingUnit ? <Button className="h-12" disabled={editingUnit.usageCount > 0} onClick={stageDeletion} type="button" variant="destructive">Xóa</Button> : null}<Button className="h-12" disabled={!writable} type="submit">{editingUnit ? "Lưu thay đổi" : "Thêm đơn vị"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingMutation !== null} onOpenChange={(open) => { if (!open && !isPending) setPendingMutation(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pendingMutation?.title}</AlertDialogTitle><AlertDialogDescription>{pendingMutation?.description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={isPending} onClick={confirmMutation}>{isPending ? "Đang lưu..." : "Xác nhận"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
