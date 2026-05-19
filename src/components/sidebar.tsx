"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";
import { navFor } from "@/lib/nav";
import type { Role } from "@prisma/client";

export function Sidebar({ role, isLabAssistant = false }: { role: Role; isLabAssistant?: boolean }) {
  const pathname = usePathname();
  const items = navFor(role, { isLabAssistant });

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/logo-mark.png"
            alt="UTC NextGen"
            width={210}
            height={256}
            priority
            className="h-8 w-auto shrink-0"
          />
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-bold tracking-tight truncate">UTC-NextGen</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              Unsri Training Center
            </div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-hide p-3">
        <ul className="space-y-1">
          {items.map((item) => {
            const aliases = item.activePrefixes ?? [];
            const active =
              pathname === item.href ||
              pathname.startsWith(item.href + "/") ||
              aliases.some((p) => pathname === p || pathname.startsWith(p + "/"));
            return (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <FontAwesomeIcon icon={item.icon} className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="px-4 py-3 border-t text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} UTC NextGen
      </div>
    </aside>
  );
}
