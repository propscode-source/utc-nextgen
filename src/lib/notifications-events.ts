/**
 * Client-side event bus for instant notification UI updates.
 * Mirror dari [points-events.ts] — server tetap source of truth, event
 * hanya supaya bell/topbar refresh tanpa menunggu polling berikutnya.
 */
export const NOTIFICATIONS_EVENT = "utc:notifications-changed";

export type NotificationsChangedDetail = {
  unread?: number;
};

export function emitNotificationsChanged(detail: NotificationsChangedDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_EVENT, { detail })
  );
}
