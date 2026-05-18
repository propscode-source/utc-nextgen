import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center max-w-md">
        <p className="text-sm font-mono text-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-muted-foreground">
          Halaman yang kamu cari mungkin sudah dipindahkan atau belum dibuat.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Kembali ke beranda</Link>
        </Button>
      </div>
    </div>
  );
}
