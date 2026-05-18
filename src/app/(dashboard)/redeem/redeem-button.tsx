"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGift,
  faSpinner,
  faStore,
  faTruck,
  faTicket,
  faCoins,
  faCircleCheck,
  faCopy,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { cn, formatPoints } from "@/lib/utils";
import { emitPointsChanged } from "@/lib/points-events";

type Kind = "PHYSICAL" | "VOUCHER";

type SuccessData = {
  pickupCode: string;
  newPoints: number;
  itemKind: Kind;
  itemName: string;
  deliveryMethod: "PICKUP" | "SHIPPED";
};

export function RedeemButton({
  itemId,
  itemName,
  itemKind,
  pointPrice,
  disabled,
  insufficient,
}: {
  itemId: string;
  itemName: string;
  itemKind: Kind;
  pointPrice: number;
  disabled: boolean;
  insufficient: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<"PICKUP" | "SHIPPED">("PICKUP");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState<SuccessData | null>(null);

  const isVoucher = itemKind === "VOUCHER";

  async function confirmRedeem() {
    if (method === "SHIPPED" && address.trim().length < 10) {
      toast.error("Alamat pengiriman minimal 10 karakter.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/redeem/${itemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryMethod: isVoucher ? "PICKUP" : method,
        deliveryAddress: !isVoucher && method === "SHIPPED" ? address.trim() : null,
        deliveryNotes: notes.trim() || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menukar.");
      return;
    }
    const body = (await res.json()) as SuccessData;
    setSuccess(body);

    // Instant UI sync — emit event so topbar updates immediately.
    emitPointsChanged(body.newPoints);
    // Push the new points into the JWT so subsequent server renders see it.
    await update({ points: body.newPoints });
    router.refresh();
  }

  function close() {
    setOpen(false);
    setSuccess(null);
    setMethod("PICKUP");
    setAddress("");
    setNotes("");
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Disalin ke clipboard."),
      () => toast.error("Gagal menyalin.")
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) close();
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled} className="w-full">
          <FontAwesomeIcon icon={faGift} />
          {insufficient ? "Poin kurang" : disabled ? "Tidak tersedia" : "Tukar sekarang"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <SuccessView data={success} itemName={itemName} onCopy={copy} onClose={close} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Konfirmasi penukaran</DialogTitle>
              <DialogDescription>
                Periksa detail di bawah. Penukaran akan langsung memotong{" "}
                <strong className="text-amber-500">
                  <FontAwesomeIcon icon={faCoins} className="mr-1 h-3 w-3" />
                  {formatPoints(pointPrice)}
                </strong>{" "}
                poin dari saldo kamu dan tidak bisa dibatalkan setelah dikonfirmasi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={isVoucher ? faTicket : faGift}
                    className="h-4 w-4 text-primary"
                  />
                  <div className="text-sm font-medium">{itemName}</div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {isVoucher
                    ? "Kode voucher akan dikirim ke akun kamu setelah diproses admin."
                    : "Barang fisik. Pilih metode pengambilan/pengiriman di bawah."}
                </div>
              </div>

              {isVoucher ? (
                <div className="rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-xs">
                  Voucher digital tidak butuh alamat. Setelah admin mengirim kode, kamu bisa lihat di
                  riwayat penukaran.
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Metode pengambilan
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <MethodOption
                      active={method === "PICKUP"}
                      onClick={() => setMethod("PICKUP")}
                      icon={faStore}
                      title="Ambil sendiri"
                      desc="Di kantor UTC. Tunjukkan kode penukaran."
                    />
                    <MethodOption
                      active={method === "SHIPPED"}
                      onClick={() => setMethod("SHIPPED")}
                      icon={faTruck}
                      title="Kirim"
                      desc="Biaya kirim ditanggung sendiri (COD ke kurir)."
                    />
                  </div>

                  {method === "SHIPPED" && (
                    <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                      <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="h-3.5 w-3.5 mt-0.5" />
                        <p>
                          Ongkir ditanggung penerima — kurir akan menagih saat barang sampai (COD).
                          Pastikan alamat lengkap dan nomor HP aktif.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="addr" className="text-xs">
                          Alamat lengkap + nomor HP
                        </Label>
                        <Textarea
                          id="addr"
                          rows={3}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Nama penerima, alamat lengkap, kelurahan, kecamatan, kota, kode pos, nomor HP"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs">
                  Catatan (opsional)
                </Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: ukuran kaos M, warna hitam"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={close} disabled={submitting}>
                Batal
              </Button>
              <Button onClick={confirmRedeem} disabled={submitting}>
                <FontAwesomeIcon
                  icon={submitting ? faSpinner : faGift}
                  className={submitting ? "animate-spin" : ""}
                />
                {submitting ? "Memproses…" : `Konfirmasi (-${formatPoints(pointPrice)} poin)`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MethodOption({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof faStore;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border p-3 text-left transition",
        active ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:bg-accent"
      )}
    >
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={icon} className={cn("h-3.5 w-3.5", active ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("text-sm font-medium", active && "text-primary")}>{title}</span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}

function SuccessView({
  data,
  itemName,
  onCopy,
  onClose,
}: {
  data: SuccessData;
  itemName: string;
  onCopy: (s: string) => void;
  onClose: () => void;
}) {
  const isVoucher = data.itemKind === "VOUCHER";
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faCircleCheck} className="h-5 w-5 text-emerald-500" />
          Penukaran berhasil
        </DialogTitle>
        <DialogDescription>
          {isVoucher
            ? "Voucher akan muncul di riwayat penukaran setelah admin mengirim kodenya."
            : data.deliveryMethod === "PICKUP"
              ? "Tunjukkan kode penukaran ini di kantor UTC saat mengambil barang."
              : "Tim akan memproses pengiriman. Cek riwayat untuk update status & nomor resi."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="rounded-md border p-4 bg-muted/30 space-y-2">
          <div className="text-xs text-muted-foreground">Item</div>
          <div className="font-medium">{itemName}</div>
        </div>

        <div className="rounded-md border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="text-xs text-muted-foreground">
            Kode penukaran (simpan baik-baik)
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono font-bold text-base flex-1 break-all">
              {data.pickupCode}
            </code>
            <Button variant="ghost" size="icon" onClick={() => onCopy(data.pickupCode)}>
              <FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" />
            </Button>
          </div>
          {isVoucher && (
            <Badge variant="warning" className="text-[10px]">
              Menunggu admin mengirim kode voucher
            </Badge>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          Saldo poin terbaru: <strong className="text-amber-500">{formatPoints(data.newPoints)}</strong>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Tutup</Button>
      </DialogFooter>
    </>
  );
}
