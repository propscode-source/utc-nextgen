"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleXmark, faSpinner } from "@fortawesome/free-solid-svg-icons";

export function GradeForm({ submissionId, maxPoints }: { submissionId: string; maxPoints: number }) {
  const router = useRouter();
  const [points, setPoints] = useState(maxPoints);
  const [busy, setBusy] = useState(false);

  async function grade(correct: boolean) {
    setBusy(true);
    const res = await fetch(`/api/answer-submissions/${submissionId}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pointsAwarded: correct ? points : 0,
        isCorrect: correct,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menilai.");
      return;
    }
    toast.success(`Tersimpan${correct ? ` (+${points} poin)` : ""}.`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={`p-${submissionId}`} className="text-xs">
          Poin
        </Label>
        <Input
          id={`p-${submissionId}`}
          type="number"
          min={0}
          max={maxPoints}
          value={points}
          onChange={(e) => setPoints(Math.min(maxPoints, Math.max(0, Number(e.target.value) || 0)))}
          className="h-8 w-20"
        />
        <span className="text-[11px] text-muted-foreground">/ {maxPoints}</span>
      </div>
      <Button size="sm" variant="outline" onClick={() => grade(false)} disabled={busy}>
        <FontAwesomeIcon
          icon={busy ? faSpinner : faCircleXmark}
          className={busy ? "animate-spin" : "text-destructive"}
        />
        Salah (0 poin)
      </Button>
      <Button size="sm" onClick={() => grade(true)} disabled={busy}>
        <FontAwesomeIcon icon={busy ? faSpinner : faCircleCheck} className={busy ? "animate-spin" : ""} />
        Benar
      </Button>
    </div>
  );
}
