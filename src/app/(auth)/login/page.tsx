import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightToBracket } from "@fortawesome/free-solid-svg-icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
        <FontAwesomeIcon icon={faRightToBracket} className="h-2.5 w-2.5" />
        Sign in
      </div>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Masuk ke akun kamu</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline hover:!text-primary"
        >
          Daftar di sini
        </Link>
      </p>
      <div className="mt-6">
        <LoginForm searchParamsPromise={searchParams} />
      </div>
      <p className="mt-6 text-[11px] text-muted-foreground">
        Dengan masuk, kamu menyetujui ketentuan layanan UTC NextGen — Fasilkom Unsri.
      </p>
    </div>
  );
}
