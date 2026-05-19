import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/**
 * Scope helper untuk modul analytics:
 * - SUPERADMIN: semua lab
 * - LAB_ADMIN / asisten: hanya lab yang dimanage atau diasisten
 */
export async function allowedLabIdsFor(userId: string, role: Role) {
  if (role === "SUPERADMIN") {
    const labs = await prisma.lab.findMany({ select: { id: true } });
    return labs.map((l) => l.id);
  }
  const labs = await prisma.lab.findMany({
    where: {
      OR: [
        { adminId: userId },
        { members: { some: { userId, role: "ASSISTANT" } } },
      ],
    },
    select: { id: true },
  });
  return labs.map((l) => l.id);
}

/** Encode a value for CSV — quote if it contains separator/quote/newline. */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build CSV with UTF-8 BOM so Excel opens it correctly. */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  const body = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return "﻿" + body;
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
