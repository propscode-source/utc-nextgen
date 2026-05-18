"use client";

import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPrint } from "@fortawesome/free-solid-svg-icons";

export function PrintShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[80vh]">
      <div className="flex justify-end gap-2 mb-3 print:hidden">
        <Button onClick={() => window.print()}>
          <FontAwesomeIcon icon={faPrint} /> Cetak / Simpan PDF
        </Button>
      </div>
      <div className="overflow-x-auto">{children}</div>
      <p className="text-[11px] text-muted-foreground mt-3 print:hidden">
        Tip: di dialog cetak, pilih ukuran kertas <strong>A4 Landscape</strong> dan margin <strong>None</strong>{" "}
        untuk hasil terbaik. Pilih "Save as PDF" sebagai destination kalau ingin export.
      </p>
    </div>
  );
}
