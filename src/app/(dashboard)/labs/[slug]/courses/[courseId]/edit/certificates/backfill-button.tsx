"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRocket, faSpinner } from "@fortawesome/free-solid-svg-icons";

export function BackfillButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (
      !confirm(
        "Terbitkan sertifikat untuk semua mahasiswa yang sudah lulus final exam tapi belum dapat sertifikat?"
      )
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/courses/${courseId}/certificates/backfill`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal backfill.");
      return;
    }
    const body = (await res.json()) as { issued: number; alreadyExisted: number; scanned: number };
    toast.success(
      `Backfill selesai: ${body.issued} baru, ${body.alreadyExisted} sudah ada (dari ${body.scanned} kandidat).`
    );
    router.refresh();
  }

  return (
    <Button size="sm" onClick={run} disabled={busy}>
      <FontAwesomeIcon icon={busy ? faSpinner : faRocket} className={busy ? "animate-spin" : ""} />
      Terbitkan untuk yang sudah lulus
    </Button>
  );
}
