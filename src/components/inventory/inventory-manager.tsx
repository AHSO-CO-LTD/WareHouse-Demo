"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { postInventoryDocumentAction } from "@/app/inventory/actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UnitItem = { id: string; code: string; name: string };
type ProductItem = { id: string; code: string; name: string; baseUnit: UnitItem; conversions: Array<{ unit: UnitItem; factor: string }>; lots: Array<{ id: string; code: string }> };
type SlotItem = { id: string; code: string; name: string };
type BalanceRow = { id: string; productId: string; productCode: string; productName: string; unitName: string; lotCode: string | null; quantity: string; slotCode: string; slotName: string };
type DocumentRow = { code: string; lineCount: number; postedAt: string; type: DocumentType };
type DocumentType = "OPENING" | "RECEIPT" | "ISSUE";
type LineDraft = { key: string; productId: string; lotId: string; slotId: string; unitId: string; quantity: string };

type InventoryManagerProps = { products: ProductItem[]; slots: SlotItem[]; balanceRows: BalanceRow[]; documents: DocumentRow[]; transactionCount: number; balanceLimit: number; writable: boolean };

const documentLabels: Record<DocumentType, string> = { OPENING: "Nhập đầu kỳ", RECEIPT: "Nhập kho", ISSUE: "Xuất kho" };

function createDraftLine(): LineDraft {
  return { key: crypto.randomUUID(), productId: "", lotId: "", slotId: "", unitId: "", quantity: "" };
}

function formatQuantity(value: string) {
  const [whole, fraction = ""] = value.split(".");
  const formattedWhole = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(BigInt(whole));
  const trimmedFraction = fraction.replace(/0+$/, "");
  return trimmedFraction ? `${formattedWhole},${trimmedFraction}` : formattedWhole;
}

function sumQuantities(left: string, right: string) {
  const scale = BigInt(100_000_000);
  const toScaledInteger = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * scale + BigInt(`${fraction}00000000`.slice(0, 8));
  };
  const total = toScaledInteger(left) + toScaledInteger(right);
  const whole = total / scale;
  const fraction = (total % scale).toString().padStart(8, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function InventoryManager({ products, slots, balanceRows, documents, transactionCount, balanceLimit, writable }: InventoryManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [documentType, setDocumentType] = useState<DocumentType | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([createDraftLine()]);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const canPost = writable && products.length > 0 && slots.length > 0 && transactionCount < balanceLimit;
  const dialogTitle = documentType ? documentLabels[documentType] : "";
  const balanceSummary = useMemo(() => `${balanceRows.length} vị trí có tồn`, [balanceRows.length]);
  const productTotals = useMemo(() => {
    const totals = new Map<string, { id: string; code: string; name: string; unitName: string; quantity: string; slotCount: number }>();
    for (const balance of balanceRows) {
      const current = totals.get(balance.productId);
      if (current) {
        current.quantity = sumQuantities(current.quantity, balance.quantity);
        current.slotCount += 1;
      } else {
        totals.set(balance.productId, { id: balance.productId, code: balance.productCode, name: balance.productName, unitName: balance.unitName, quantity: balance.quantity, slotCount: 1 });
      }
    }
    return [...totals.values()];
  }, [balanceRows]);

  function updateLine(key: string, values: Partial<LineDraft>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...values } : line));
  }

  function chooseProduct(key: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    updateLine(key, { productId, lotId: "", unitId: product?.baseUnit.id ?? "" });
  }

  function openDocument(type: DocumentType) {
    setDocumentType(type);
    setLines([createDraftLine()]);
    setIdempotencyKey(crypto.randomUUID());
    setMessage(null);
  }

  function closeDocument(open: boolean) {
    if (!open && !isPending) {
      const hasDraftChanges = lines.some((line) => line.productId || line.lotId || line.slotId || line.unitId || line.quantity.trim());
      if (hasDraftChanges) {
        setDiscardConfirmOpen(true);
        return;
      }
      setDocumentType(null);
      setConfirmOpen(false);
      setMessage(null);
    }
  }

  function stageDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentType) return;
    if (lines.some((line) => !line.productId || !line.slotId || !line.unitId || !line.quantity.trim())) {
      setMessage("Hoàn tất sản phẩm, đơn vị, ô chứa và số lượng cho từng dòng.");
      return;
    }
    setMessage(null);
    setConfirmOpen(true);
  }

  function confirmDocument() {
    if (!documentType) return;
    const formData = new FormData();
    formData.set("type", documentType);
    formData.set("idempotencyKey", idempotencyKey);
    formData.set("lines", JSON.stringify(lines.map(({ productId, lotId, slotId, unitId, quantity }) => ({ productId, lotId: lotId || undefined, slotId, unitId, quantity }))));
    startTransition(async () => {
      const result = await postInventoryDocumentAction(formData);
      if (!result.success) {
        setMessage(result.message ?? "Chưa thể ghi phiếu tồn kho.");
        setConfirmOpen(false);
        return;
      }
      toast.success(`Đã ghi ${documentLabels[documentType].toLowerCase()}.`);
      setConfirmOpen(false);
      setDocumentType(null);
      router.refresh();
    });
  }

  return (
    <>
      <section className="warehouse-page-heading">
        <h1>Tồn kho</h1>
        <span className="warehouse-page-capacity">{transactionCount} / {balanceLimit} phiếu</span>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button className="h-12" disabled={!canPost} onClick={() => openDocument("OPENING")} type="button">Nhập đầu kỳ</Button>
        <Button className="h-12" disabled={!canPost} onClick={() => openDocument("RECEIPT")} type="button" variant="secondary">Nhập kho</Button>
        <Button className="h-12" disabled={!canPost} onClick={() => openDocument("ISSUE")} type="button" variant="outline">Xuất kho</Button>
      </div>

      {products.length === 0 || slots.length === 0 ? <section className="warehouse-empty-state mt-6"><h2>{products.length === 0 ? "Tạo sản phẩm trước" : "Tạo ô chứa trước"}</h2><p className="text-muted-foreground">Cần có sản phẩm và ô chứa để ghi tồn kho.</p></section> : null}

      {balanceRows.length === 0 ? <section className="warehouse-empty-state mt-6"><h2>Chưa có tồn kho</h2><p className="text-muted-foreground">Ghi phiếu đầu kỳ hoặc nhập kho để bắt đầu.</p></section> : (
        <>
          <section className="mt-6 overflow-hidden rounded-xl border">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4"><h2 className="text-base font-semibold">Tổng tồn theo sản phẩm</h2><span className="text-sm text-muted-foreground">{productTotals.length} sản phẩm</span></div>
            <ol className="divide-y">
              {productTotals.map((product) => <li className="grid gap-1 px-4 py-4 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5" key={product.id}>
                <span><strong>{product.code}</strong><span className="ml-2">{product.name}</span></span>
                <span className="text-sm text-muted-foreground">{product.slotCount} ô chứa</span>
                <strong className="text-right">{formatQuantity(product.quantity)} {product.unitName}</strong>
              </li>)}
            </ol>
          </section>
          <section className="mt-6 overflow-hidden rounded-xl border">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4"><h2 className="text-base font-semibold">Chi tiết theo slot</h2><span className="text-sm text-muted-foreground">{balanceSummary}</span></div>
          <ol className="divide-y">
            {balanceRows.map((balance) => <li className="grid gap-1 px-4 py-4 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5" key={balance.id}>
              <span><strong>{balance.productCode}</strong><span className="ml-2">{balance.productName}</span></span>
              <span className="text-sm text-muted-foreground">{balance.lotCode ? `Lô ${balance.lotCode}` : "Không theo lô"} · {balance.slotCode} · {balance.slotName}</span>
              <strong className="text-right">{formatQuantity(balance.quantity)} {balance.unitName}</strong>
            </li>)}
          </ol>
          </section>
        </>
      )}

      {documents.length > 0 ? <section className="mt-6 overflow-hidden rounded-xl border"><div className="flex min-h-12 items-center border-b px-4"><h2 className="text-base font-semibold">Phiếu gần đây</h2></div><ol className="divide-y">{documents.map((document) => <li className="grid gap-1 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-5" key={document.code}><strong>{document.code}</strong><span className="text-sm text-muted-foreground">{documentLabels[document.type]} · {document.lineCount} dòng</span><time className="text-sm text-muted-foreground">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(document.postedAt))}</time></li>)}</ol></section> : null}

      <Dialog open={documentType !== null} onOpenChange={closeDocument}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>{dialogTitle}</DialogTitle></DialogHeader>
          <form className="grid gap-5" onSubmit={stageDocument}>
            <section className="grid gap-3">
              {lines.map((line, index) => {
                const product = products.find((item) => item.id === line.productId);
                const units = product ? [product.baseUnit, ...product.conversions.map((conversion) => conversion.unit)] : [];
                return <div className="grid gap-3 rounded-xl border p-4" key={line.key}>
                  <div className="flex items-center justify-between"><h3 className="font-semibold">Dòng {index + 1}</h3>{lines.length > 1 ? <Button className="h-10" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} type="button" variant="destructive">Bỏ dòng</Button> : null}</div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="field-group lg:col-span-2"><Label>Sản phẩm <span className="text-destructive">*</span></Label><Select onValueChange={(value) => chooseProduct(line.key, value)} value={line.productId || undefined}><SelectTrigger className="h-12 w-full"><SelectValue placeholder="Chọn sản phẩm" /></SelectTrigger><SelectContent>{products.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} · {item.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="field-group"><Label>Đơn vị <span className="text-destructive">*</span></Label><Select disabled={!product} onValueChange={(value) => updateLine(line.key, { unitId: value })} value={line.unitId || undefined}><SelectTrigger className="h-12 w-full"><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger><SelectContent>{units.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="field-group"><Label>Số lượng <span className="text-destructive">*</span></Label><Input className="h-12" inputMode="decimal" onChange={(event) => updateLine(line.key, { quantity: event.target.value })} placeholder="0" value={line.quantity} /></div>
                    <div className="field-group"><Label>Ô chứa <span className="text-destructive">*</span></Label><Select onValueChange={(value) => updateLine(line.key, { slotId: value })} value={line.slotId || undefined}><SelectTrigger className="h-12 w-full"><SelectValue placeholder="Chọn ô" /></SelectTrigger><SelectContent>{slots.map((slot) => <SelectItem key={slot.id} value={slot.id}>{slot.code} · {slot.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="field-group sm:col-span-2 lg:col-span-2"><Label>Lô hàng</Label><Select disabled={!product} onValueChange={(value) => updateLine(line.key, { lotId: value === "none" ? "" : value })} value={line.lotId || "none"}><SelectTrigger className="h-12 w-full"><SelectValue placeholder="Không theo lô" /></SelectTrigger><SelectContent><SelectItem value="none">Không theo lô</SelectItem>{product?.lots.map((lot) => <SelectItem key={lot.id} value={lot.id}>{lot.code}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                </div>;
              })}
              <Button className="h-12 self-start" onClick={() => setLines((current) => [...current, createDraftLine()])} type="button" variant="outline">Thêm dòng hàng</Button>
            </section>
            {message ? <p className="form-error" role="alert">{message}</p> : null}
            <DialogFooter><Button className="h-12" disabled={isPending} type="submit">{documentType ? `Ghi ${dialogTitle.toLowerCase()}` : "Ghi phiếu"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => { if (!isPending) setConfirmOpen(open); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận ghi phiếu?</AlertDialogTitle><AlertDialogDescription>{documentType ? `${documentLabels[documentType]} sẽ được ghi vào sổ kho và không thể sửa trực tiếp.` : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel><AlertDialogAction disabled={isPending} onClick={confirmDocument}>{isPending ? "Đang ghi..." : "Xác nhận"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={discardConfirmOpen} onOpenChange={(open) => { if (!isPending) setDiscardConfirmOpen(open); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bỏ phiếu đang nhập?</AlertDialogTitle><AlertDialogDescription>Các dòng hàng chưa ghi sẽ bị bỏ.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isPending}>Tiếp tục nhập</AlertDialogCancel><AlertDialogAction disabled={isPending} onClick={() => { setDiscardConfirmOpen(false); setDocumentType(null); setConfirmOpen(false); setMessage(null); }}>Bỏ phiếu</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
