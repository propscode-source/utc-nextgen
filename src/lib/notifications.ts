import { Prisma, type NotificationType, type Role } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Server-side helpers to create notifications from any feature
 * (course enrollment, exam result, badge award, redeem approval, etc.).
 *
 * Selalu fire-and-forget — kegagalan kirim notifikasi tidak boleh
 * menggagalkan operasi inti. Caller dapat `await` untuk konsistensi
 * dalam transaksi, atau panggil tanpa await untuk best-effort.
 */

export type CreateNotificationInput = {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  link?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput,
  tx?: Prisma.TransactionClient
) {
  const client = tx ?? prisma;
  return client.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type ?? "INFO",
      link: input.link ?? null,
    },
  });
}

/**
 * Kirim notifikasi yang sama ke banyak user sekaligus.
 * Memakai createMany — link/title/body identik untuk semua penerima.
 */
export async function notifyUsers(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">,
  tx?: Prisma.TransactionClient
) {
  if (userIds.length === 0) return { count: 0 };
  const client = tx ?? prisma;
  return client.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      title: input.title,
      body: input.body,
      type: input.type ?? "INFO",
      link: input.link ?? null,
    })),
  });
}

/**
 * Broadcast ke semua user dengan role tertentu (mis. semua MAHASISWA).
 * `roles` kosong = broadcast ke seluruh user aktif.
 */
export async function notifyByRole(
  roles: Role[],
  input: Omit<CreateNotificationInput, "userId">
) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(roles.length > 0 ? { role: { in: roles } } : {}),
    },
    select: { id: true },
  });
  return notifyUsers(
    users.map((u) => u.id),
    input
  );
}
