"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisVertical,
  faTicket,
  faTruck,
  faPenToSquare,
  faRotateLeft,
  faSpinner,
  faFloppyDisk,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";

type Redemption = {
  id: string;
  status: string;
  voucherCode: string;
  trackingNumber: string;
  adminNotes: string;
  isVoucher: boolean;
  deliveryMethod: string;
  itemName: string;
  userName: string;
  userEmail: string;
  pickupCode: string;
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Menunggu" },
  { value: "PROCESSING", label: "Diproses" },
  { value: "READY_FOR_PICKUP", label: "Siap diambil" },
  { value: "SHIPPED", label: "Dikirim" },
  { value: "DELIVERED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

export function RedemptionRowActions({
  redemption,
  canRefund,
}: {
  redemption: Redemption;
  canRefund: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Edit panel state
  const [status, setStatus] = useState(redemption.status);
  const [adminNotes, setAdminNotes] = useState(redemption.adminNotes);

  // Voucher panel state
  const [voucherCode, setVoucherCode] = useState(redemption.voucherCode);

  // Tracking panel state
  const [trackingNumber, setTrackingNumber] = useState(redemption.trackingNumber);
  const [trackingStatus, setTrackingStatus] = useState(
    redemption.status === "PENDING" ? "SHIPPED" : redemption.status
  );

  async function patch(payload: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    const res = await fetch(`/api/redemptions/${redemption.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan.");
      return false;
    }
    toast.success(successMsg);
    router.refresh();
    return true;
  }

  async function saveEdit() {
    const ok = await patch(
      { status, adminNotes: adminNotes || null },
      "Status diperbarui."
    );
    if (ok) setEditOpen(false);
  }

  async function sendVoucher() {
    if (!voucherCode.trim()) {
      toast.error("Kode voucher wajib diisi.");
      return;
    }
    const ok = await patch(
      {
        voucherCode: voucherCode.trim(),
        markVoucherSent: true,
        status: "DELIVERED",
      },
      `Kode voucher dikirim ke ${redemption.userName}.`
    );
    if (ok) setVoucherOpen(false);
  }

  async function saveTracking() {
    const ok = await patch(
      {
        trackingNumber: trackingNumber.trim() || null,
        status: trackingStatus,
      },
      "Resi & status diperbarui."
    );
    if (ok) setTrackingOpen(false);
  }

  async function refund() {
    if (
      !confirm(
        `Refund penukaran ${redemption.pickupCode}?\n\nPoin akan dikembalikan ke ${redemption.userName} dan stok akan ditambah kembali.`
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/redemptions/${redemption.id}?action=refund`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal refund.");
      return;
    }
    toast.success("Penukaran dibatalkan & poin dikembalikan.");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={busy} aria-label="Aksi">
            <FontAwesomeIcon icon={faEllipsisVertical} className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {redemption.isVoucher && (
            <DropdownMenuItem onSelect={() => setVoucherOpen(true)}>
              <FontAwesomeIcon icon={faTicket} /> Kirim kode voucher
            </DropdownMenuItem>
          )}
          {!redemption.isVoucher && redemption.deliveryMethod === "SHIPPED" && (
            <DropdownMenuItem onSelect={() => setTrackingOpen(true)}>
              <FontAwesomeIcon icon={faTruck} /> Update resi pengiriman
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <FontAwesomeIcon icon={faPenToSquare} /> Update status
          </DropdownMenuItem>
          {canRefund && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={refund}>
                <FontAwesomeIcon icon={faRotateLeft} /> Refund poin
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status edit */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update penukaran</DialogTitle>
            <DialogDescription>
              {redemption.userName} · {redemption.itemName} · <code className="font-mono">{redemption.pickupCode}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Catatan (terlihat oleh user)</Label>
              <Textarea
                id="notes"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={saveEdit} disabled={busy}>
              <FontAwesomeIcon icon={busy ? faSpinner : faFloppyDisk} className={busy ? "animate-spin" : ""} />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voucher send */}
      <Dialog open={voucherOpen} onOpenChange={setVoucherOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim kode voucher ke {redemption.userName}</DialogTitle>
            <DialogDescription>
              {redemption.itemName} · <code className="font-mono">{redemption.pickupCode}</code>
              <br />
              {redemption.userEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="vc">Kode voucher</Label>
            <Input
              id="vc"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              placeholder="VC-XXXX-YYYY"
              autoFocus
              className="font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Setelah dikirim, kode akan langsung muncul di riwayat penukaran user dan status berubah jadi
              "Selesai".
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoucherOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={sendVoucher} disabled={busy}>
              <FontAwesomeIcon icon={busy ? faSpinner : faPaperPlane} className={busy ? "animate-spin" : ""} />
              Kirim kode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking */}
      <Dialog open={trackingOpen} onOpenChange={setTrackingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update pengiriman</DialogTitle>
            <DialogDescription>
              {redemption.userName} · {redemption.itemName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tn">Nomor resi</Label>
              <Input
                id="tn"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="JNE-1234567890"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={trackingStatus} onValueChange={setTrackingStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROCESSING">Diproses</SelectItem>
                  <SelectItem value="SHIPPED">Dikirim</SelectItem>
                  <SelectItem value="DELIVERED">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingOpen(false)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={saveTracking} disabled={busy}>
              <FontAwesomeIcon icon={busy ? faSpinner : faFloppyDisk} className={busy ? "animate-spin" : ""} />
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
