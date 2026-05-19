import {
  faChartPie,
  faGraduationCap,
  faUsers,
  faFlask,
  faShieldHalved,
  faMedal,
  faCertificate,
  faChartLine,
  faBell,
  faClipboardCheck,
  faGift,
  faStore,
  faTrophy,
  faBoxArchive,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import type { Role } from "@prisma/client";

export type NavItem = {
  label: string;
  href: string;
  icon: IconDefinition;
  roles: Role[];
  /**
   * Optional extra gate. When set, item only shows if `extras[gate] === true`.
   * Used to hide /labs from non-assistant mahasiswa.
   */
  gate?: "isLabAssistant";
  /**
   * Additional pathname prefixes that should also highlight this item.
   * Useful when sub-features live under a different route but logically
   * belong to this menu (mis. /admin/roles ⊂ "Pengguna").
   */
  activePrefixes?: string[];
};

export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: faChartPie, roles: ["SUPERADMIN", "LAB_ADMIN", "PROCTOR", "MAHASISWA"] },
  { label: "Course Saya", href: "/my/courses", icon: faGraduationCap, roles: ["MAHASISWA"] },
  { label: "Katalog Course", href: "/courses", icon: faGraduationCap, roles: ["MAHASISWA", "LAB_ADMIN", "SUPERADMIN"] },

  // Lab menu: visible to LAB_ADMIN/PROCTOR/SUPERADMIN always; for MAHASISWA only if they are an asisten lab.
  { label: "Lab", href: "/labs", icon: faFlask, roles: ["LAB_ADMIN", "PROCTOR", "SUPERADMIN"] },
  { label: "Lab", href: "/labs", icon: faFlask, roles: ["MAHASISWA"], gate: "isLabAssistant" },

  { label: "Sesi Ujian", href: "/proctor/sessions", icon: faShieldHalved, roles: ["PROCTOR", "SUPERADMIN"] },
  { label: "Penilaian Essay", href: "/proctor/grading", icon: faClipboardCheck, roles: ["PROCTOR", "SUPERADMIN"] },
  { label: "Leaderboard", href: "/leaderboard", icon: faMedal, roles: ["MAHASISWA", "LAB_ADMIN", "PROCTOR", "SUPERADMIN"] },
  { label: "Tukar Poin", href: "/redeem", icon: faGift, roles: ["MAHASISWA", "LAB_ADMIN", "PROCTOR", "SUPERADMIN"] },
  { label: "Kelola Merch", href: "/admin/merch", icon: faStore, roles: ["LAB_ADMIN", "SUPERADMIN"] },
  { label: "Penukaran", href: "/admin/redemptions", icon: faBoxArchive, roles: ["LAB_ADMIN", "SUPERADMIN"] },
  { label: "Kelola Badge", href: "/admin/badges", icon: faTrophy, roles: ["SUPERADMIN"] },
  { label: "Sertifikat", href: "/certificates", icon: faCertificate, roles: ["MAHASISWA"] },
  { label: "Kelola Sertifikat", href: "/admin/certificates", icon: faCertificate, roles: ["LAB_ADMIN", "SUPERADMIN"] },
  { label: "Analytics", href: "/analytics", icon: faChartLine, roles: ["LAB_ADMIN", "SUPERADMIN"] },
  {
    label: "Pengguna",
    href: "/admin/users",
    icon: faUsers,
    roles: ["SUPERADMIN"],
    activePrefixes: ["/admin/roles", "/admin/policies", "/admin/permissions"],
  },
  { label: "Notifikasi", href: "/notifications", icon: faBell, roles: ["MAHASISWA", "LAB_ADMIN", "PROCTOR", "SUPERADMIN"] },
];

export type NavExtras = {
  isLabAssistant?: boolean;
};

export function navFor(role: Role, extras: NavExtras = {}) {
  return NAV.filter((n) => {
    if (!n.roles.includes(role)) return false;
    if (n.gate === "isLabAssistant" && !extras.isLabAssistant) return false;
    return true;
  });
}
