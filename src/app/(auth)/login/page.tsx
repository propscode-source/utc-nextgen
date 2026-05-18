import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Masuk ke akun kamu</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Daftar di sini
        </Link>
      </p>
      <div className="mt-6">
        <LoginForm searchParamsPromise={searchParams} />
      </div>
    </div>
  );
}
