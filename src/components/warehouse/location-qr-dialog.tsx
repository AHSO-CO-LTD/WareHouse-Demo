"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type LocationQrDialogProps = { code: string; label: string };

export function LocationQrDialog({ code, label }: LocationQrDialogProps) {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let disposed = false;
    void QRCode.toString(code, { errorCorrectionLevel: "M", margin: 1, type: "svg", width: 256 })
      .then((value) => { if (!disposed) setSvg(value); })
      .catch(() => { if (!disposed) setSvg(null); });
    return () => { disposed = true; };
  }, [code, open]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild><Button aria-label={`Mã QR ${label} ${code}`} className="h-12" type="button" variant="outline">QR</Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>QR {label}</DialogTitle></DialogHeader>
        <div className="grid place-items-center gap-4 py-2">
          {svg ? <div aria-label={`QR chứa mã ${code}`} className="location-qr-code" dangerouslySetInnerHTML={{ __html: svg }} role="img" /> : <div className="flex h-64 w-64 items-center justify-center rounded-lg border text-sm text-muted-foreground">Đang tạo QR...</div>}
          <code className="location-qr-value">{code}</code>
        </div>
      </DialogContent>
    </Dialog>
  );
}
