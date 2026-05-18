"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message || "Internal error."}</p>
        <Button onClick={reset} className="mt-6">
          Coba lagi
        </Button>
      </div>
    </div>
  );
}
