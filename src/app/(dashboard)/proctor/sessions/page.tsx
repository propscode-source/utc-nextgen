import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { isProctor } from "@/lib/proctor-perms";
import { SessionsTable } from "./sessions-table";

export const metadata: Metadata = { title: "Sesi Ujian" };

export default async function ProctorSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  if (!isProctor(session.user.role)) redirect("/dashboard");
  const { scope } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sesi Ujian Aktif</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor mahasiswa yang sedang mengerjakan ujian. Data refresh otomatis tiap 5 detik.
        </p>
      </div>
      <SessionsTable scope={scope === "recent" ? "recent" : "active"} />
    </div>
  );
}
