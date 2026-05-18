/**
 * Lightweight client-side event bus for instant UI updates after a point change.
 * Server-side mutation API routes are still the source of truth — this exists only to
 * propagate the new total to UI listeners (e.g. Topbar) without waiting for JWT refresh.
 *
 * Always pair an emit with `await update({ points: newPoints })` so the next
 * server-rendered page sees the fresh value.
 */
export const POINTS_EVENT = "utc:points-changed";

export function emitPointsChanged(newPoints: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(POINTS_EVENT, { detail: { points: newPoints } })
  );
}

export type PointsChangedDetail = { points: number };
