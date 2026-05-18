import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelopeCircleCheck } from "@fortawesome/free-solid-svg-icons";

export const metadata: Metadata = { title: "Verifikasi email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <div className="text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <FontAwesomeIcon icon={faEnvelopeCircleCheck} className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-bold tracking-tight">Cek email kamu</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Kami sudah mengirim link verifikasi {email ? <>ke <strong>{email}</strong></> : "ke email kamu"}. Klik link
        tersebut untuk mengaktifkan akun.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Tidak menerima email? Cek folder spam, atau{" "}
        <Link href="/login" className="text-primary hover:underline">
          kembali ke login
        </Link>
        .
      </p>
    </div>
  );
}
