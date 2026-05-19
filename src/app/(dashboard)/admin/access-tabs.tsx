"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faShieldHalved,
  faLayerGroup,
  faKey,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

type TabDef = { href: string; label: string; icon: IconDefinition };

const TABS: TabDef[] = [
  { href: "/admin/users", label: "Pengguna", icon: faUsers },
  { href: "/admin/roles", label: "Role Custom", icon: faShieldHalved },
  { href: "/admin/policies", label: "Policy", icon: faLayerGroup },
  { href: "/admin/permissions", label: "Permission", icon: faKey },
];

export function AccessTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted p-1 text-muted-foreground">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground"
            )}
          >
            <FontAwesomeIcon icon={t.icon} className="h-3.5 w-3.5" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
