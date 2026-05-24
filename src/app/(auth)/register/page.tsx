import type { Metadata } from "next";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
        <FontAwesomeIcon icon={faUserPlus} className="h-2.5 w-2.5" />
        Sign up
      </div>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Buat akun baru</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline hover:!text-primary"
        >
          Masuk di sini
        </Link>
      </p>
      <div className="mt-6">
        <RegisterForm />
      </div>
    </div>
  );
}
