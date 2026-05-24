import type { EventStatus } from "@prisma/client";

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Dipublikasikan",
  ONGOING: "Sedang berlangsung",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const EVENT_STATUS_VARIANT: Record<
  EventStatus,
  "default" | "secondary" | "success" | "warning" | "info" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  PUBLISHED: "info",
  ONGOING: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

/**
 * Derive the "natural" status based on time alone — does not look at finalizedAt.
 * Used for auto-promotion and as a hint in the admin UI. Manual status is still
 * authoritative (admin override) since the field is freely editable.
 */
export function deriveNaturalStatus(
  startsAt: Date,
  endsAt: Date,
  now: Date = new Date()
): EventStatus {
  if (now < startsAt) return "PUBLISHED";
  if (now >= startsAt && now <= endsAt) return "ONGOING";
  return "COMPLETED";
}

/** True if attendance window is open right now. */
export function isAttendanceOpen(
  event: {
    status: EventStatus;
    startsAt: Date;
    endsAt: Date;
    attendanceOpensAt: Date | null;
    attendanceClosesAt: Date | null;
  },
  now: Date = new Date()
): boolean {
  if (event.status === "DRAFT" || event.status === "CANCELLED" || event.status === "COMPLETED") {
    return false;
  }
  const opens = event.attendanceOpensAt ?? event.startsAt;
  // Default close window: 1 hour after endsAt — give peserta waktu untuk presensi di akhir.
  const closes = event.attendanceClosesAt ?? new Date(event.endsAt.getTime() + 60 * 60 * 1000);
  return now >= opens && now <= closes;
}

/** Make a URL-safe slug from a title. */
export function slugifyEvent(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
