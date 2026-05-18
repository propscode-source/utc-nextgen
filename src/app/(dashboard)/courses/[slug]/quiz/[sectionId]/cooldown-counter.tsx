"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";

function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00";
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CooldownCounter({ target }: { target: string }) {
  const router = useRouter();
  const targetTs = new Date(target).getTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= targetTs) {
        clearInterval(interval);
        // Refresh server data so the runner unlocks
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTs, router]);

  const remaining = targetTs - now;
  const done = remaining <= 0;

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
      <FontAwesomeIcon icon={faClock} className="h-4 w-4 text-amber-500" />
      <div className="flex-1 text-sm">
        {done ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Percobaan tersedia lagi. Memuat ulang…
          </span>
        ) : (
          <>
            <span className="text-amber-700 dark:text-amber-300">Cooldown — coba lagi dalam </span>
            <strong className="font-mono">{formatRemaining(remaining)}</strong>
          </>
        )}
      </div>
    </div>
  );
}
