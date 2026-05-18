import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleXmark, faBolt } from "@fortawesome/free-solid-svg-icons";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  let state: "ok" | "expired" | "invalid" = "invalid";

  if (record) {
    if (record.expires < new Date()) {
      state = "expired";
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    } else {
      await prisma.$transaction([
        prisma.user.update({
          where: { email: record.identifier },
          data: { emailVerified: new Date() },
        }),
        prisma.verificationToken.delete({ where: { token } }),
      ]);
      state = "ok";
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6 justify-center">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FontAwesomeIcon icon={faBolt} className="h-4 w-4" />
          </span>
          <span className="font-bold">UTC NextGen</span>
        </Link>

        {state === "ok" && (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
              <FontAwesomeIcon icon={faCircleCheck} className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Email terverifikasi!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Akun kamu sekarang aktif. Silakan masuk untuk mulai mengumpulkan poin.
            </p>
            <Button asChild className="mt-6">
              <Link href="/login">Masuk sekarang</Link>
            </Button>
          </>
        )}

        {state === "expired" && (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-500">
              <FontAwesomeIcon icon={faCircleXmark} className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Link kedaluwarsa</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Token verifikasi sudah lewat 24 jam. Silakan daftar ulang atau hubungi admin.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/register">Daftar ulang</Link>
            </Button>
          </>
        )}

        {state === "invalid" && (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
              <FontAwesomeIcon icon={faCircleXmark} className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Link tidak valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Link verifikasi tidak ditemukan. Mungkin sudah pernah digunakan.
            </p>
            <Button asChild className="mt-6">
              <Link href="/login">Coba masuk</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
