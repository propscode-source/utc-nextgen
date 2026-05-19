"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faSpinner } from "@fortawesome/free-solid-svg-icons";

export function PermissionDeleteButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function destroy() {
    if (!confirm(`Hapus permission "${label}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/permissions/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menghapus.");
      return;
    }
    toast.success("Dihapus.");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={destroy} disabled={busy} aria-label="Hapus">
      <FontAwesomeIcon icon={busy ? faSpinner : faTrash} className={busy ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
    </Button>
  );
}
