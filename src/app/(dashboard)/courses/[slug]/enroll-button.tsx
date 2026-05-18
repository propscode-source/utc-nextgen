"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faGraduationCap } from "@fortawesome/free-solid-svg-icons";
import { emitPointsChanged } from "@/lib/points-events";

export function EnrollButton({
  courseId,
  slug,
  isLocked,
  pointPrice,
  userPoints,
}: {
  courseId: string;
  slug: string;
  isLocked: boolean;
  pointPrice: number;
  userPoints: number;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [submitting, setSubmitting] = useState(false);

  const blocked = isLocked && userPoints < pointPrice;

  async function enroll() {
    if (blocked) {
      toast.error(`Poin tidak cukup. Butuh ${pointPrice} poin.`);
      return;
    }
    if (isLocked) {
      const ok = window.confirm(
        `Ini akan memotong ${pointPrice} poin dari saldo kamu. Lanjutkan?`
      );
      if (!ok) return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
    setSubmitting(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal mendaftar.");
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { newPoints?: number };
    if (typeof body.newPoints === "number") {
      emitPointsChanged(body.newPoints);
      await update({ points: body.newPoints });
    } else {
      await update();
    }
    toast.success("Berhasil mendaftar course.");
    router.push(`/courses/${slug}/learn`);
  }

  return (
    <Button onClick={enroll} disabled={submitting || blocked} className="w-full">
      <FontAwesomeIcon icon={submitting ? faSpinner : faGraduationCap} className={submitting ? "animate-spin" : ""} />
      {blocked ? "Poin tidak cukup" : isLocked ? `Daftar (-${pointPrice} poin)` : "Daftar gratis"}
    </Button>
  );
}
