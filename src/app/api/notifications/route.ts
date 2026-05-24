import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/perms";
import { notifyByRole, notifyUsers } from "@/lib/notifications";
import type { NotificationType, Role, Prisma } from "@prisma/client";

const NOTIFICATION_TYPES = ["INFO", "COURSE", "EXAM", "BADGE", "SYSTEM"] as const;
const ROLES = ["SUPERADMIN", "LAB_ADMIN", "PROCTOR", "MAHASISWA"] as const;

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
  filter: z.enum(["all", "unread"]).optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

const broadcastSchema = z.object({
  title: z.string().min(2).max(160),
  body: z.string().min(2).max(2000),
  type: z.enum(NOTIFICATION_TYPES).default("INFO"),
  link: z.string().max(500).optional().nullable(),
  // Salah satu wajib diisi
  userIds: z.array(z.string().min(1)).optional(),
  roles: z.array(z.enum(ROLES)).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
    filter: url.searchParams.get("filter") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Query tidak valid." }, { status: 400 });
  }

  const take = parsed.data.take ?? 20;
  const where: Prisma.NotificationWhereInput = {
    userId: session.user.id,
    ...(parsed.data.filter === "unread" ? { read: false } : {}),
    ...(parsed.data.type ? { type: parsed.data.type } : {}),
  };

  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(parsed.data.cursor
      ? { cursor: { id: parsed.data.cursor }, skip: 1 }
      : {}),
  });

  const hasMore = items.length > take;
  const sliced = hasMore ? items.slice(0, take) : items;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id ?? null : null;

  const unread = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return NextResponse.json({ items: sliced, nextCursor, unread });
}

/**
 * Broadcast notifikasi — hanya SUPERADMIN.
 * Body: { title, body, type, link?, userIds?: string[], roles?: Role[] }
 * Salah satu dari `userIds` atau `roles` wajib diisi.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperadmin(session.user.role)) {
    return NextResponse.json({ error: "Hanya superadmin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = broadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
      { status: 400 }
    );
  }

  const { title, body: text, type, link, userIds, roles } = parsed.data;
  if ((!userIds || userIds.length === 0) && (!roles || roles.length === 0)) {
    return NextResponse.json(
      { error: "Tentukan minimal satu userIds atau roles." },
      { status: 400 }
    );
  }

  const payload = {
    title,
    body: text,
    type: type as NotificationType,
    link: link ?? null,
  };

  let count = 0;
  if (userIds && userIds.length > 0) {
    const r = await notifyUsers(userIds, payload);
    count += r.count;
  }
  if (roles && roles.length > 0) {
    const r = await notifyByRole(roles as Role[], payload);
    count += r.count;
  }

  return NextResponse.json({ ok: true, count });
}
