"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createInventoryLotAction,
  createProductAction,
  deleteInventoryLotAction,
  deleteProductAction,
  updateInventoryLotAction,
  updateProductAction,
  type CatalogActionState,
} from "@/app/products/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UnitItem = { id: string; code: string; name: string; version: number };
type ConversionItem = { id: string; version: number; factor: string; unit: UnitItem };
type DraftConversion = { key: string; id?: string; version?: number; unitId: string; factor: string; unit: UnitItem };
type LotItem = { id: string; version: number; code: string; supplierLotCode: string | null; manufacturedAt: string | null; expiresAt: string | null };
type ProductItem = {
  id: string;
  version: number;
  code: string;
  name: string;
  description: string | null;
  barcode: string | null;
  status: "ACTIVE" | "INACTIVE";
  currentCost: string;
  baseUnit: UnitItem;
  conversions: ConversionItem[];
  lots: LotItem[];
};

type PendingMutation = {
  title: string;
  description: string;
  formData: FormData;
  action: (formData: FormData) => Promise<CatalogActionState>;
  successMessage: string;
  afterSuccess?: () => void;
};

type CatalogManagerProps = {
  units: UnitItem[];
  products: ProductItem[];
  writable: boolean;
  productLimit: number;
};

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatCost(value: string) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(Number(value));
}

export function CatalogManager({ units, products, writable, productLimit }: CatalogManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editingLot, setEditingLot] = useState<LotItem | null>(null);
  const [draftBaseUnitId, setDraftBaseUnitId] = useState("");
  const [draftConversions, setDraftConversions] = useState<DraftConversion[]>([]);
  const [conversionUnitId, setConversionUnitId] = useState("");
  const [conversionFactor, setConversionFactor] = useState("");

  function stageMutation(
    event: FormEvent<HTMLFormElement>,
    title: string,
    description: string,
    action: (formData: FormData) => Promise<CatalogActionState>,
    successMessage: string,
    afterSuccess?: () => void,
  ) {
    event.preventDefault();
    setMessage(null);
    setPendingMutation({ title, description, formData: new FormData(event.currentTarget), action, successMessage, afterSuccess });
  }

  function stageDeletion(
    title: string,
    description: string,
    id: string,
    action: (formData: FormData) => Promise<CatalogActionState>,
    successMessage: string,
    afterSuccess?: () => void,
  ) {
    const formData = new FormData();
    formData.set("id", id);
    setMessage(null);
    setPendingMutation({ title, description, formData, action, successMessage, afterSuccess });
  }

  function confirmMutation() {
    if (!pendingMutation) return;
    const currentMutation = pendingMutation;
    startTransition(async () => {
      const result = await currentMutation.action(currentMutation.formData);
      if (!result.success) {
        setMessage(result.message);
        setPendingMutation(null);
        return;
      }
      toast.success(currentMutation.successMessage);
      currentMutation.afterSuccess?.();
      setPendingMutation(null);
      router.refresh();
    });
  }

  function openNewProduct() {
    setEditingProduct(null);
    setEditingLot(null);
    setDraftBaseUnitId("");
    setDraftConversions([]);
    setConversionUnitId("");
    setConversionFactor("");
    setProductDialogOpen(true);
  }

  function openProduct(product: ProductItem) {
    setEditingProduct(product);
    setEditingLot(null);
    setDraftBaseUnitId(product.baseUnit.id);
    setDraftConversions(product.conversions.map((conversion) => ({ key: conversion.id, id: conversion.id, version: conversion.version, unitId: conversion.unit.id, factor: conversion.factor, unit: conversion.unit })));
    setConversionUnitId("");
    setConversionFactor("");
    setProductDialogOpen(true);
  }

  function addDraftConversion() {
    const unit = units.find((candidate) => candidate.id === conversionUnitId);
    if (!unit || !conversionFactor.trim()) {
      setMessage("Chọn đơn vị đóng gói và nhập số lượng quy đổi.");
      return;
    }
    if (!/^\d+(?:\.\d{1,8})?$/.test(conversionFactor.trim()) || Number(conversionFactor) <= 0) {
      setMessage("Số lượng quy đổi phải lớn hơn 0.");
      return;
    }
    setDraftConversions((current) => [...current, { key: `new-${Date.now()}-${unit.id}`, unitId: unit.id, factor: conversionFactor.trim(), unit }]);
    setConversionUnitId("");
    setConversionFactor("");
  }

  return (
    <>
      <section className="warehouse-page-heading">
        <h1>Sản phẩm</h1>
        <span className="warehouse-page-capacity">{products.length} / {productLimit} sản phẩm</span>
      </section>

      {message ? <p className="form-error mb-4" role="alert">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button className="h-12" disabled={!writable} onClick={openNewProduct} type="button">Thêm sản phẩm</Button>
      </div>

      {products.length === 0 ? (
        <section className="warehouse-empty-state mt-6">
          <h2>{units.length === 0 ? "Tạo đơn vị tính trước" : "Bạn chưa có sản phẩm nào"}</h2>
          {writable ? (units.length === 0 ? <Button asChild className="h-12" type="button"><Link href="/units">Thêm đơn vị tính</Link></Button> : <Button className="h-12" onClick={openNewProduct} type="button">Thêm sản phẩm</Button>) : null}
        </section>
      ) : (
        <ol className="warehouse-hierarchy mt-6">
          {products.map((product) => (
            <li className="warehouse-node" key={product.id}>
              <button className="warehouse-node-row warehouse-node-row--editable w-full text-left" disabled={!writable} onClick={() => openProduct(product)} type="button">
                <span className="warehouse-node-identity">
                  <span className="warehouse-node-type">{product.status === "ACTIVE" ? "Đang dùng" : "Ngừng dùng"}</span>
                  <span className="warehouse-node-title"><strong>{product.code}</strong><span>{product.name}</span></span>
                </span>
                <span className="warehouse-node-summary">{formatCost(product.currentCost)} đ / {product.baseUnit.code}</span>
                <span className="warehouse-node-controls"><span className="warehouse-edit-button inline-flex h-12 items-center rounded-lg border px-4">Mở</span></span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}</DialogTitle></DialogHeader>
          <form className="auth-form" key={editingProduct?.id ?? "new"} onSubmit={(event) => stageMutation(event, editingProduct ? "Lưu sản phẩm?" : "Thêm sản phẩm?", "Sản phẩm và quy cách đóng gói sẽ được lưu cùng lúc.", editingProduct ? updateProductAction : createProductAction, editingProduct ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm.", () => { setProductDialogOpen(false); setEditingProduct(null); })}>
            {editingProduct ? <><input name="id" type="hidden" value={editingProduct.id} /><input name="version" type="hidden" value={editingProduct.version} /></> : null}
            <div className="grid gap-4 sm:grid-cols-2"><div className="field-group"><Label htmlFor="product-code">Mã sản phẩm <span className="text-destructive">*</span></Label><Input className="h-12" defaultValue={editingProduct?.code} id="product-code" maxLength={32} name="code" required /></div><div className="field-group"><Label htmlFor="product-name">Tên sản phẩm <span className="text-destructive">*</span></Label><Input className="h-12" defaultValue={editingProduct?.name} id="product-name" maxLength={120} name="name" required /></div><div className="field-group"><Label htmlFor="product-barcode">Mã quét</Label><Input className="h-12" defaultValue={editingProduct?.barcode ?? ""} id="product-barcode" maxLength={80} name="barcode" /></div><div className="field-group"><Label htmlFor="product-cost">Giá vốn (đ) <span className="text-destructive">*</span></Label><Input className="h-12" defaultValue={editingProduct?.currentCost ?? "0"} id="product-cost" inputMode="decimal" name="currentCost" required /></div><div className="field-group"><Label>Đơn vị cơ bản <span className="text-destructive">*</span></Label><Select name="baseUnitId" onValueChange={setDraftBaseUnitId} required value={draftBaseUnitId || undefined}><SelectTrigger className="h-12 w-full"><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger><SelectContent>{units.map((unit) => <SelectItem disabled={draftConversions.some((conversion) => conversion.unitId === unit.id)} key={unit.id} value={unit.id}>{unit.code} · {unit.name}</SelectItem>)}</SelectContent></Select></div><div className="field-group"><Label>Trạng thái</Label><Select defaultValue={editingProduct?.status ?? "ACTIVE"} name="status"><SelectTrigger className="h-12 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Đang dùng</SelectItem><SelectItem value="INACTIVE">Ngừng dùng</SelectItem></SelectContent></Select></div></div>
            <div className="field-group"><Label htmlFor="product-description">Ghi chú</Label><Input className="h-12" defaultValue={editingProduct?.description ?? ""} id="product-description" maxLength={500} name="description" /></div>
            <input name="conversions" type="hidden" value={JSON.stringify(draftConversions.map(({ id, version, unitId, factor }) => ({ id, version, unitId, factor })))} />
            <section className="grid gap-3 border-t pt-5">
              <div><h3 className="text-base font-semibold">Quy cách đóng gói</h3><p className="text-sm text-muted-foreground">Ví dụ: 1 thùng = 24 cái.</p></div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Select onValueChange={setConversionUnitId} value={conversionUnitId}>
                  <SelectTrigger className="h-12 w-full"><SelectValue placeholder="Đơn vị đóng gói" /></SelectTrigger>
                  <SelectContent>{units.filter((unit) => unit.id !== draftBaseUnitId && !draftConversions.some((conversion) => conversion.unitId === unit.id)).map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.code} · {unit.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input className="h-12" inputMode="decimal" onChange={(event) => setConversionFactor(event.target.value)} placeholder="Số lượng quy đổi" value={conversionFactor} />
                <Button className="h-12" onClick={addDraftConversion} type="button" variant="outline">Thêm quy cách</Button>
              </div>
              {draftConversions.length > 0 ? <div className="grid gap-2">{draftConversions.map((conversion) => <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3" key={conversion.key}><span>1 {conversion.unit.name} = <Input aria-label={`Số lượng ${conversion.unit.name}`} className="ml-2 inline-flex h-9 w-24" inputMode="decimal" onChange={(event) => setDraftConversions((current) => current.map((candidate) => candidate.key === conversion.key ? { ...candidate, factor: event.target.value } : candidate))} value={conversion.factor} /> {units.find((unit) => unit.id === draftBaseUnitId)?.name ?? "đơn vị cơ bản"}</span><Button className="h-10" onClick={() => setDraftConversions((current) => current.filter((candidate) => candidate.key !== conversion.key))} type="button" variant="outline">Bỏ</Button></div>)}</div> : null}
            </section>
            <DialogFooter><Button className="h-12" disabled={!writable || units.length === 0} type="submit">{editingProduct ? "Lưu thay đổi" : "Thêm sản phẩm"}</Button></DialogFooter>
          </form>

          {editingProduct ? <section className="grid gap-5 border-t pt-5">
            <div className="grid gap-3"><h3 className="text-base font-semibold">Lô hàng</h3><form className="grid gap-3 sm:grid-cols-3" key={editingLot?.id ?? "lot-new"} onSubmit={(event) => stageMutation(event, editingLot ? "Lưu lô hàng?" : "Thêm lô hàng?", "Lô được dùng khi ghi phiếu tồn kho theo lô.", editingLot ? updateInventoryLotAction : createInventoryLotAction, editingLot ? "Đã cập nhật lô hàng." : "Đã tạo lô hàng.", () => setEditingLot(null))}>{editingLot ? <><input name="id" type="hidden" value={editingLot.id} /><input name="version" type="hidden" value={editingLot.version} /></> : <input name="productId" type="hidden" value={editingProduct.id} />}<Input className="h-12" defaultValue={editingLot?.supplierLotCode ?? ""} name="supplierLotCode" placeholder="Mã lô nhà cung cấp" /><Input className="h-12" defaultValue={dateValue(editingLot?.manufacturedAt ?? null)} name="manufacturedAt" placeholder="Ngày sản xuất YYYY-MM-DD" /><Input className="h-12" defaultValue={dateValue(editingLot?.expiresAt ?? null)} name="expiresAt" placeholder="Hạn dùng YYYY-MM-DD" /><Button className="h-12 sm:col-span-3" type="submit">{editingLot ? "Lưu lô hàng" : "Tạo lô hàng"}</Button></form>{editingProduct.lots.map((lot) => <div className="flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3" key={lot.id}><span><strong>{lot.code}</strong>{lot.supplierLotCode ? ` · ${lot.supplierLotCode}` : ""}{lot.expiresAt ? ` · HSD ${dateValue(lot.expiresAt)}` : ""}</span><span className="flex gap-2"><Button className="h-10" onClick={() => setEditingLot(lot)} type="button" variant="outline">Sửa</Button><Button className="h-10" onClick={() => stageDeletion("Xóa lô hàng?", `Lô ${lot.code} chỉ xóa được khi chưa có phiếu tồn kho.`, lot.id, deleteInventoryLotAction, "Đã xóa lô hàng.")} type="button" variant="destructive">Xóa</Button></span></div>)}</div>
            <div className="flex justify-end"><Button className="h-12" onClick={() => stageDeletion("Xóa sản phẩm?", "Sản phẩm chỉ xóa được khi chưa có lịch sử tồn kho, lô hay quy đổi đơn vị.", editingProduct.id, deleteProductAction, "Đã xóa sản phẩm.", () => setProductDialogOpen(false))} type="button" variant="destructive">Xóa sản phẩm</Button></div>
          </section> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingMutation !== null} onOpenChange={(open) => { if (!open && !isPending) setPendingMutation(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{pendingMutation?.title}</AlertDialogTitle><AlertDialogDescription>{pendingMutation?.description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={isPending} onClick={confirmMutation}>{isPending ? "Đang lưu..." : "Xác nhận"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
